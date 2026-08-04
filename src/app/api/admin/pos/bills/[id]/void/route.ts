import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, ConflictError, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/pos/bills/[id]/void
// AUDIT FIX C-5: double-void reverses inventory twice.
// Fix: idempotent via updateMany guard (status must be COMPLETED).
// Permission: pos.void
// ============================================================
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'pos.void')
    const { id } = await ctx.params

    const bill = await db.posBill.findUnique({
      where: { id },
      include: { items: true, shift: true },
    })
    if (!bill) throw new NotFoundError('ไม่พบบิล')

    await db.$transaction(async (tx) => {
      // Idempotent guard: only VOID if status is COMPLETED
      const r = await tx.posBill.updateMany({
        where: { id, status: 'COMPLETED' },
        data: { status: 'VOIDED' },
      })
      if (r.count === 0) {
        throw new ConflictError('บิลนี้ไม่สามารถยกเลิกได้ (อาจถูกยกเลิกแล้ว)')
      }

      // Reverse inventory + record adjustment movements
      for (const it of bill.items) {
        const inv = await tx.inventory.findFirst({
          where: { productId: it.productId, branchId: bill.shift.branchId },
        })
        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { increment: it.quantity } },
          })
          await tx.stockMovement.create({
            data: {
              inventoryId: inv.id,
              type: 'ADJUST',
              quantity: it.quantity,
              reason: `Void ${bill.billNo}`,
              refType: 'POS',
              refId: bill.id,
              userId: user.id,
            },
          })
        }
        // Reverse soldCount
        await tx.product.update({
          where: { id: it.productId },
          data: { soldCount: { decrement: it.quantity } },
        })
      }

      // Reverse shift totals
      const shiftUpdate: Record<string, unknown> = {
        totalSales: { decrement: bill.total },
      }
      if (bill.paymentMethod === 'CASH') {
        shiftUpdate.cashSales = { decrement: bill.total }
        shiftUpdate.expectedCash = { decrement: bill.total }
      } else if (bill.paymentMethod === 'CARD') {
        shiftUpdate.cardSales = { decrement: bill.total }
      } else {
        shiftUpdate.qrSales = { decrement: bill.total }
      }
      await tx.shift.update({ where: { id: bill.shiftId }, data: shiftUpdate })
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'PosBill',
      entityId: id,
      oldValue: { status: 'COMPLETED', billNo: bill.billNo },
      newValue: { status: 'VOIDED', billNo: bill.billNo },
    })

    return ok({ ok: true })
  }
)
