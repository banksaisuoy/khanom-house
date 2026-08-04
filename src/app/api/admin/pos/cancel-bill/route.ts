import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, conflict, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { validate } from '@/lib/validation'
import { z } from 'zod'

// PHASE 4 FIX (AUDIT-007): Previously reversed stock via `findFirst({ productId })`
// with NO branchId filter — a canceled bill at Branch A could inflate inventory
// at Branch B. Also: did not reverse shift totals (totalSales, cashSales, etc.)
// leaving Z-reports permanently wrong. Now: (1) fetches the bill+shift to get
// branchId, (2) filters inventory by branchId, (3) reverses shift totals.

const cancelBillSchema = z.object({
  billId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
})

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'pos.void')
  const body = validate(cancelBillSchema, await req.json())

  const result = await db.$transaction(async (tx) => {
    // Fetch the bill + shift to get branchId for correct stock reversal
    const bill = await tx.posBill.findUnique({
      where: { id: body.billId },
      include: { shift: { select: { id: true, branchId: true } } },
    })
    if (!bill) throw new Error('ไม่พบบิล')
    if (bill.status !== 'COMPLETED') throw new Error('ไม่สามารถยกเลิกได้ (สถานะไม่ใช่ COMPLETED)')

    // Idempotent guard — only one cancel succeeds
    const r = await tx.posBill.updateMany({
      where: { id: body.billId, status: 'COMPLETED' },
      data: { status: 'VOIDED', notes: `ยกเลิก: ${body.reason}` },
    })
    if (r.count === 0) throw new Error('ไม่สามารถยกเลิกได้ (อาจถูกยกเลิกแล้ว)')

    // Reverse stock at the CORRECT branch
    const items = await tx.posBillItem.findMany({ where: { billId: body.billId } })
    for (const item of items) {
      const inv = await tx.inventory.findFirst({
        where: { productId: item.productId, branchId: bill.shift.branchId },
      })
      if (inv) {
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: { increment: item.quantity } },
        })
        await tx.stockMovement.create({
          data: {
            inventoryId: inv.id,
            type: 'ADJUST',
            quantity: item.quantity,
            reason: `Cancel bill ${bill.billNo}: ${body.reason}`,
            refType: 'POS',
            refId: body.billId,
            userId: user.id,
          },
        })
      }
    }

    // Reverse shift totals so Z-report stays correct
    const salesDelta = -bill.total
    await tx.shift.update({
      where: { id: bill.shiftId },
      data: {
        totalSales: { increment: salesDelta },
        ...(bill.paymentMethod === 'CASH' && { cashSales: { increment: salesDelta }, expectedCash: { increment: salesDelta } }),
        ...(bill.paymentMethod === 'CARD' && { cardSales: { increment: salesDelta } }),
        ...(bill.paymentMethod === 'PROMPTPAY' && { qrSales: { increment: salesDelta } }),
      },
    })

    return { billNo: bill.billNo, shiftId: bill.shiftId }
  })

  await logAudit({
    userId: user.id,
    action: 'DELETE',
    entity: 'PosBill',
    entityId: body.billId,
    newValue: { reason: body.reason, billNo: result.billNo },
  })
  return ok({ cancelled: true })
})
