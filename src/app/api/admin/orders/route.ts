import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, conflict, handle, NotFoundError } from '@/lib/api-response'
import { validate, paymentMethodSchema, orderChannelSchema, orderTypeSchema } from '@/lib/validation'
import { z } from 'zod'
import { nextSeq } from '@/lib/sequence'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// GET /api/admin/orders — list with filters & pagination
// Permission: orders.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'orders.read')

  const sp = req.nextUrl.searchParams
  const q = sp.get('q')?.trim() ?? ''
  const channels = (sp.get('channel') ?? '').split(',').filter(Boolean)
  const statuses = (sp.get('status') ?? '').split(',').filter(Boolean)
  const paymentStatuses = (sp.get('paymentStatus') ?? '').split(',').filter(Boolean)
  const types = (sp.get('type') ?? '').split(',').filter(Boolean)
  const from = sp.get('from')
  const to = sp.get('to')
  const page = Math.max(1, Number(sp.get('page') ?? '1'))
  const pageSize = Math.min(200, Math.max(10, Number(sp.get('pageSize') ?? '50')))

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { orderNo: { contains: q } },
      { customerName: { contains: q } },
      { customerPhone: { contains: q } },
    ]
  }
  if (channels.length) where.channel = { in: channels }
  if (statuses.length) where.status = { in: statuses }
  if (paymentStatuses.length) where.paymentStatus = { in: paymentStatuses }
  if (types.length) where.type = { in: types }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const [items, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: { select: { id: true, quantity: true, name: true } },
      },
    }),
    db.order.count({ where }),
  ])

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayOrders = await db.order.findMany({
    where: { createdAt: { gte: startOfToday } },
    select: { status: true, total: true },
  })
  const kpis = {
    todayCount: todayOrders.length,
    todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
    pending: todayOrders.filter((o) => o.status === 'PENDING').length,
    preparing: todayOrders.filter((o) => o.status === 'PREPARING' || o.status === 'PAID').length,
    cooking: todayOrders.filter((o) => o.status === 'COOKING' || o.status === 'PACKING').length,
    outForDelivery: todayOrders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length,
    completed: todayOrders.filter((o) => o.status === 'COMPLETED').length,
    cancelled: todayOrders.filter((o) => o.status === 'CANCELLED').length,
  }

  return ok({
    items: items.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      channel: o.channel,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      type: o.type,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      subtotal: o.subtotal,
      discount: o.discount,
      shipping: o.shipping,
      total: o.total,
      itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
      createdAt: o.createdAt.toISOString(),
      wantAt: o.wantAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
    kpis,
  })
})

// ============================================================
// POST /api/admin/orders — manual create
// AUDIT FIX: non-atomic, client-supplied prices, no stock check.
// Fix: atomic $transaction, re-verify prices server-side, atomic
//      stock decrement, nextSeq for orderNo.
// Permission: orders.create
// ============================================================
const adminItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999),
  notes: z.string().max(500).optional(),
  // name/price are accepted but IGNORED — server recomputes
  name: z.string().max(200).optional(),
  price: z.number().optional(),
})

const adminCreateSchema = z.object({
  channel: orderChannelSchema,
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().min(1).max(40),
  customerEmail: z.string().max(254).optional().or(z.literal('')),
  customerId: z.string().optional(),
  type: orderTypeSchema,
  paymentMethod: paymentMethodSchema,
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL', 'REFUNDED']),
  items: z.array(adminItemSchema).min(1).max(100),
  discount: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  deliveryAddress: z.string().max(500).optional(),
  wantAt: z.string().optional(),
})

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'orders.create')
  const body = validate(adminCreateSchema, await req.json())

  const branch = await db.branch.findFirst({ where: { isMain: true } })
  if (!branch) return conflict('ไม่พบสาขา')

  const orderNo = await nextSeq('order', 'KH', 5)

  const result = await db.$transaction(async (tx) => {
    // 1. Resolve customer (existing or create new)
    let customerId = body.customerId
    if (!customerId) {
      const existing = await tx.customer.findUnique({ where: { phone: body.customerPhone } })
      customerId = existing?.id
    }
    if (!customerId) {
      const created = await tx.customer.create({
        data: {
          name: body.customerName,
          phone: body.customerPhone,
          email: body.customerEmail || null,
          tier: 'BRONZE',
        },
      })
      customerId = created.id
    }

    // 2. Re-verify prices server-side
    const productIds = Array.from(new Set(body.items.map((i) => i.productId)))
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    })
    if (products.length !== productIds.length) {
      throw new Error('สินค้าบางรายการไม่พร้อมจำหน่าย')
    }
    const productMap = new Map(products.map((p) => [p.id, p]))

    const lineItems = body.items.map((it) => {
      const p = productMap.get(it.productId)!
      const lineTotal = p.price * it.quantity
      return {
        productId: it.productId,
        name: p.name,
        price: p.price,
        quantity: it.quantity,
        total: lineTotal,
        notes: it.notes,
      }
    })
    const subtotal = lineItems.reduce((s, it) => s + it.total, 0)
    const discount = body.discount ?? 0
    const shipping = body.shipping ?? 0
    const total = Math.max(0, subtotal - discount + shipping)

    const isPaid = body.paymentStatus === 'PAID'
    const status = isPaid ? 'PAID' : 'PENDING'

    // 3. Atomic stock decrement + stock movements + soldCount
    for (const it of lineItems) {
      const inv = await tx.inventory.findFirst({
        where: { productId: it.productId, branchId: branch.id },
      })
      if (inv) {
        const r = await tx.inventory.updateMany({
          where: { id: inv.id, quantity: { gte: it.quantity } },
          data: { quantity: { decrement: it.quantity } },
        })
        if (r.count === 0) {
          throw new Error(`สต็อก "${it.name}" ไม่เพียงพอ`)
        }
        await tx.stockMovement.create({
          data: {
            inventoryId: inv.id,
            type: 'SALE',
            quantity: it.quantity,
            reason: `Order ${orderNo}`,
            refType: 'ORDER',
            userId: user.id,
          },
        })
      }
      await tx.product.update({
        where: { id: it.productId },
        data: { soldCount: { increment: it.quantity } },
      })
    }

    // 4. Create Order + items + payment
    const created = await tx.order.create({
      data: {
        orderNo,
        channel: body.channel,
        customerId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail || null,
        type: body.type,
        status,
        paymentStatus: body.paymentStatus,
        paymentMethod: body.paymentMethod,
        subtotal,
        discount,
        shipping,
        tax: 0,
        total,
        notes: body.notes,
        deliveryAddress: body.deliveryAddress,
        wantAt: body.wantAt ? new Date(body.wantAt) : null,
        branchId: branch.id,
        items: {
          create: lineItems.map((it) => ({
            productId: it.productId,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            total: it.total,
            notes: it.notes,
          })),
        },
      },
    })

    if (isPaid) {
      await tx.payment.create({
        data: {
          orderId: created.id,
          method: body.paymentMethod,
          amount: total,
          refCode:
            body.paymentMethod === 'PROMPTPAY'
              ? 'PP' + Date.now().toString().slice(-10)
              : null,
          status: 'SUCCESS',
        },
      })
    }

    return created
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'Order',
    entityId: result.id,
    newValue: { orderNo, total: result.total, channel: body.channel },
  })

  return created({ ok: true, orderId: result.id, orderNo })
})
