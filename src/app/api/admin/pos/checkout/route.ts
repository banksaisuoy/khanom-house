import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { created, conflict, handle, badRequest } from '@/lib/api-response'
import { validate, posCheckoutPayloadSchema } from '@/lib/validation'
import { nextSeq } from '@/lib/sequence'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/pos/checkout
//   Atomic + re-verifies prices server-side + stock check + audit.
//   Supports split payment via `payments: [{method, amount}]` array.
//   Permission: pos.checkout
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'pos.checkout')
  const body = validate(posCheckoutPayloadSchema, await req.json())

  // Shift must be OPEN
  const shift = await db.shift.findUnique({ where: { id: body.shiftId } })
  if (!shift || shift.status !== 'OPEN') {
    return conflict('กะไม่ได้เปิดอยู่')
  }
  requireBranchAccess(user, shift.branchId)

  const billNo = await nextSeq('pos_bill', 'POS', 6)
  const branchId = shift.branchId

  // ---- Resolve payment method(s) ----
  // Split payment: payments array, sum must equal total.
  // Single payment: paymentMethod scalar.
  const isSplit = !!body.payments && body.payments.length > 0
  let payments: Array<{ method: string; amount: number }> = []
  let primaryMethod: string = body.paymentMethod ?? ''
  if (isSplit) {
    payments = body.payments!.map((p) => ({ method: p.method, amount: p.amount }))
    if (payments.length > 1) {
      primaryMethod = 'SPLIT' // stored on PosBill.paymentMethod
    } else {
      primaryMethod = payments[0].method
    }
  } else if (primaryMethod) {
    payments = [{ method: primaryMethod, amount: 0 }] // amount filled after we know total
  } else {
    return badRequest('ต้องระบุวิธีการชำระ')
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Re-verify prices server-side
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
      const unitPrice = p.price
      const lineTotal = unitPrice * it.quantity
      return {
        productId: it.productId,
        name: p.name,
        price: unitPrice,
        quantity: it.quantity,
        total: lineTotal,
      }
    })
    const subtotal = lineItems.reduce((s, it) => s + it.total, 0)
    const discount = body.discount ?? 0
    const total = Math.max(0, subtotal - discount)

    // Validate split-payment sum
    if (isSplit) {
      const sum = payments.reduce((s, p) => s + p.amount, 0)
      if (Math.abs(sum - total) > 0.01) {
        throw new Error(`ยอดชำระรวม (${sum.toFixed(2)}) ไม่ตรงกับยอดที่ต้องชำระ (${total.toFixed(2)})`)
      }
      // Backfill single-payment case amount
    } else if (primaryMethod) {
      payments = [{ method: primaryMethod, amount: total }]
    }

    // 2. Stock check + atomic decrement + stock movement + soldCount
    for (const it of lineItems) {
      const inv = await tx.inventory.findFirst({
        where: { productId: it.productId, branchId },
      })
      if (!inv) {
        throw new Error(`สินค้า "${it.name}" ไม่มีสต็อก`)
      }
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
          reason: `POS Bill ${billNo}`,
          refType: 'POS',
          userId: user.id,
        },
      })
      await tx.product.update({
        where: { id: it.productId },
        data: { soldCount: { increment: it.quantity } },
      })
    }

    // 3. Compute receivedAmount + change for the bill record
    //    For CASH-only single payment, use the supplied receivedAmount.
    //    For split, receivedAmount = sum of cash, change = max(0, cashReceived - cashPortion).
    let receivedAmount: number | null = null
    let change: number | null = null
    if (!isSplit && primaryMethod === 'CASH' && body.receivedAmount != null) {
      receivedAmount = body.receivedAmount
      change = Math.max(0, body.receivedAmount - total)
    } else if (isSplit) {
      const cashPayment = payments.find((p) => p.method === 'CASH')
      if (cashPayment) {
        // Use the supplied receivedAmount (or default to cashPayment amount)
        const cashReceived = body.receivedAmount ?? cashPayment.amount
        receivedAmount = cashReceived
        change = Math.max(0, cashReceived - cashPayment.amount)
      } else {
        receivedAmount = total
        change = 0
      }
    } else {
      receivedAmount = total
      change = 0
    }

    // 4. Create bill + items
    const bill = await tx.posBill.create({
      data: {
        billNo,
        shiftId: body.shiftId,
        userId: user.id,
        customerId: body.customerId,
        subtotal,
        discount,
        total,
        paymentMethod: primaryMethod as string,
        receivedAmount,
        change,
        notes: body.notes,
        status: 'COMPLETED',
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

    // 5. Update shift totals (cash/card/qr/expectedCash/totalSales)
    const shiftUpdate: Record<string, unknown> = {
      totalSales: { increment: total },
    }
    let cashInc = 0
    let cardInc = 0
    let qrInc = 0
    for (const p of payments) {
      if (p.method === 'CASH') {
        cashInc += p.amount
      } else if (p.method === 'CARD') {
        cardInc += p.amount
      } else if (p.method === 'PROMPTPAY' || p.method === 'EWALLET') {
        qrInc += p.amount
      }
    }
    if (cashInc > 0) {
      shiftUpdate.cashSales = { increment: cashInc }
      shiftUpdate.expectedCash = { increment: cashInc }
    }
    if (cardInc > 0) shiftUpdate.cardSales = { increment: cardInc }
    if (qrInc > 0) shiftUpdate.qrSales = { increment: qrInc }
    await tx.shift.update({ where: { id: body.shiftId }, data: shiftUpdate })

    // 6. Loyalty points for customer (if attached)
    if (body.customerId) {
      const earned = Math.floor(total)
      await tx.customer.update({
        where: { id: body.customerId },
        data: {
          points: { increment: earned },
          totalSpent: { increment: total },
          visitCount: { increment: 1 },
        },
      })
      if (earned > 0) {
        await tx.loyaltyLog.create({
          data: {
            customerId: body.customerId,
            type: 'EARN',
            points: earned,
            reason: `POS ${billNo}`,
          },
        })
      }
    }

    return { bill, total, payments }
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'PosBill',
    entityId: result.bill.id,
    newValue: {
      billNo: result.bill.billNo,
      total: result.total,
      method: result.bill.paymentMethod,
      split: isSplit ? result.payments : undefined,
    },
  })

  return created({ ok: true, billNo: result.bill.billNo, billId: result.bill.id })
})
