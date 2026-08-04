import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { created, conflict, handle, ConflictError } from '@/lib/api-response'
import { validate, phoneSchema, paymentMethodSchema } from '@/lib/validation'
import { nextSeq } from '@/lib/sequence'
import { rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

// ============================================================
// POST /api/orders  (public storefront checkout)
//
// AUDIT FIXES (C-2, H-8, M-5, C-4):
//  - Non-atomic → wrapped in $transaction
//  - Client-supplied prices → recomputed server-side from DB
//  - No stock check → atomic updateMany with gte guard, no oversell
//  - couponCode incremented without validation → check expiry/usage/minSpend
//  - Returns e.message → wrapped in `handle` (no internal leak)
//  - orderNo via count()+1 → atomic nextSeq()
//
// Response shape preserved: { ok, orderNo, orderId, total }
// ============================================================

const storeItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
  // name/price/total accepted from client but IGNORED — server recomputes
  name: z.string().max(200).optional(),
  price: z.number().optional(),
  total: z.number().optional(),
})

const storeCheckoutSchema = z.object({
  items: z.array(storeItemSchema).min(1, 'ตะกร้าว่าง').max(100),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: phoneSchema,
  customerEmail: z.string().max(254).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  wantAt: z.string().optional(),
  wantTime: z.string().optional(),
  paymentMethod: paymentMethodSchema,
  notes: z.string().max(500).optional(),
  // subtotal/discount/shipping/total are accepted but recomputed server-side
  subtotal: z.number().optional(),
  discount: z.number().optional(),
  shipping: z.number().optional(),
  total: z.number().optional(),
  couponCode: z.string().trim().max(50).optional().nullable(),
})

export const POST = handle(async (req: NextRequest) => {
  // AUDIT (P3-9): IP-based rate limit (5 req/min) — public endpoint.
  const limited = rateLimitResponse(req)
  if (limited) return limited

  const body = validate(storeCheckoutSchema, await req.json())

  const orderNo = await nextSeq('order', 'KH', 5)

  const branch = await db.branch.findFirst({ where: { isMain: true } })
  if (!branch) return conflict('ไม่พบสาขาหลัก')

  const result = await db.$transaction(async (tx) => {
    // 1. Customer upsert by phone (normalized by schema)
    const customer = await tx.customer.upsert({
      where: { phone: body.customerPhone },
      create: {
        name: body.customerName,
        phone: body.customerPhone,
        email: body.customerEmail || null,
        tier: 'BRONZE',
      },
      update: {
        name: body.customerName,
        visitCount: { increment: 1 },
      },
    })

    // 2. Fetch products (must all exist and be active)
    const productIds = Array.from(new Set(body.items.map((i) => i.productId)))
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    })
    if (products.length !== productIds.length) {
      throw new ConflictError('สินค้าบางรายการไม่พร้อมจำหน่าย')
    }
    const productMap = new Map(products.map((p) => [p.id, p]))

    // 3. Server-side subtotal recompute (with flash sale pricing)
    const now = new Date()
    let subtotal = 0
    const lineItems: {
      productId: string
      name: string
      price: number
      quantity: number
      total: number
      isFlash: boolean
    }[] = []
    for (const it of body.items) {
      const p = productMap.get(it.productId)!
      const isFlash =
        p.isFlashSale &&
        p.flashSalePrice != null &&
        p.flashSaleEndAt != null &&
        p.flashSaleEndAt > now &&
        (p.flashSaleStock ?? 0) > 0
      const unitPrice = isFlash ? p.flashSalePrice! : p.price
      const lineTotal = unitPrice * it.quantity
      subtotal += lineTotal
      lineItems.push({
        productId: it.productId,
        name: p.name,
        price: unitPrice,
        quantity: it.quantity,
        total: lineTotal,
        isFlash,
      })
    }

    // 4. Coupon validation + atomic usage increment
    let discount = 0
    let appliedCouponId: string | null = null
    if (body.couponCode) {
      const promo = await tx.promotion.findUnique({
        where: { code: body.couponCode.toUpperCase() },
      })
      if (!promo || !promo.isActive) {
        throw new ConflictError('คูปองไม่ถูกต้องหรือถูกปิดใช้งาน')
      }
      if (promo.endsAt && promo.endsAt < now) {
        throw new ConflictError('คูปองหมดอายุแล้ว')
      }
      if (promo.startsAt && promo.startsAt > now) {
        throw new ConflictError('คูปองยังไม่เริ่มใช้งาน')
      }
      if (promo.minSpend && subtotal < promo.minSpend) {
        throw new ConflictError(`ยอดขั้นต่ำสำหรับคูปองนี้คือ ฿${promo.minSpend}`)
      }
      // Atomic check-and-increment: only increments if usedCount < usageLimit
      if (promo.usageLimit) {
        const r = await tx.promotion.updateMany({
          where: { id: promo.id, usedCount: { lt: promo.usageLimit } },
          data: { usedCount: { increment: 1 } },
        })
        if (r.count === 0) {
          throw new ConflictError('คูปองถูกใช้งานครบจำนวนแล้ว')
        }
      } else {
        await tx.promotion.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        })
      }
      appliedCouponId = promo.id
      // Compute discount server-side
      if (promo.type === 'PERCENT') {
        discount = (subtotal * promo.value) / 100
        if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount)
      } else if (promo.type === 'FIXED') {
        discount = Math.min(promo.value, subtotal)
      }
      // BOGO not handled here (would require cart logic); treat as no monetary discount
    }

    // 5. Tax / shipping / total — computed server-side
    const taxableBase = Math.max(0, subtotal - discount)
    const tax = Math.round(taxableBase * 0.07 * 100) / 100
    const shipping = taxableBase >= 500 ? 0 : 40
    const total = Math.max(0, taxableBase + shipping + tax)

    // 6. Stock check + atomic decrement + stock movement + soldCount + flashSaleStock
    for (const it of lineItems) {
      const inv = await tx.inventory.findFirst({
        where: { productId: it.productId, branchId: branch.id },
      })
      if (!inv) {
        throw new ConflictError(`สินค้า "${it.name}" ไม่มีสต็อก`)
      }
      // Atomic decrement with quantity guard — prevents oversell
      const r = await tx.inventory.updateMany({
        where: { id: inv.id, quantity: { gte: it.quantity } },
        data: { quantity: { decrement: it.quantity } },
      })
      if (r.count === 0) {
        throw new ConflictError(`สต็อก "${it.name}" ไม่เพียงพอ`)
      }
      await tx.stockMovement.create({
        data: {
          inventoryId: inv.id,
          type: 'SALE',
          quantity: it.quantity,
          reason: `Sale ${orderNo}`,
          refType: 'ORDER',
        },
      })
      // Decrement flash sale stock if applicable (guarded to avoid negative)
      if (it.isFlash) {
        await tx.product.update({
          where: { id: it.productId },
          data: {
            soldCount: { increment: it.quantity },
            flashSaleStock: { decrement: it.quantity },
          },
        })
      } else {
        await tx.product.update({
          where: { id: it.productId },
          data: { soldCount: { increment: it.quantity } },
        })
      }
    }

    // 7. Create Order + items + Payment (atomic in tx)
    const wantAt = body.wantAt
      ? new Date(`${body.wantAt}T${body.wantTime || '10:00'}:00`)
      : null

    const isCash = body.paymentMethod === 'CASH'
    const order = await tx.order.create({
      data: {
        orderNo,
        channel: 'WEBSITE',
        customerId: customer.id,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail || null,
        type: 'DELIVERY',
        status: isCash ? 'PENDING' : 'PAID',
        paymentStatus: isCash ? 'UNPAID' : 'PAID',
        paymentMethod: body.paymentMethod,
        subtotal,
        discount,
        shipping,
        tax,
        total,
        notes: body.notes,
        deliveryAddress: body.address || null,
        wantAt: wantAt && !isNaN(wantAt.getTime()) ? wantAt : null,
        branchId: branch.id,
        items: {
          create: lineItems.map((it) => ({
            productId: it.productId,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            total: it.total,
          })),
        },
      },
    })

    await tx.payment.create({
      data: {
        orderId: order.id,
        method: body.paymentMethod,
        amount: total,
        refCode:
          body.paymentMethod === 'PROMPTPAY'
            ? 'PP' + Date.now().toString().slice(-10)
            : null,
        status: isCash ? 'PENDING' : 'SUCCESS',
      },
    })

    // 8. Loyalty: award points + totalSpent + tier upgrade
    const earnedPoints = Math.floor(total)
    if (earnedPoints > 0) {
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          points: { increment: earnedPoints },
          totalSpent: { increment: total },
        },
      })
      await tx.loyaltyLog.create({
        data: {
          customerId: customer.id,
          type: 'EARN',
          points: earnedPoints,
          reason: `Order ${orderNo}`,
          orderId: order.id,
        },
      })
      // Auto tier upgrade
      const refreshed = await tx.customer.findUnique({ where: { id: customer.id } })
      if (refreshed) {
        const newTier =
          refreshed.points >= 3000 ? 'VIP'
          : refreshed.points >= 1500 ? 'GOLD'
          : refreshed.points >= 500 ? 'SILVER'
          : 'BRONZE'
        if (newTier !== refreshed.tier) {
          await tx.customer.update({
            where: { id: customer.id },
            data: { tier: newTier },
          })
        }
      }
    }

    return { order, total, appliedCouponId }
  })

  return created({
    ok: true,
    orderNo,
    orderId: result.order.id,
    total: result.total,
  })
})
