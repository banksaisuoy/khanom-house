import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, ConflictError, NotFoundError } from '@/lib/api-response'
import { validate, cashMoveSchema } from '@/lib/validation'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/pos/shift/[id]/cash-move
// AUDIT FIX C-8: move record + shift update are separate writes.
// Fix: wrap both in $transaction.
// Permission: pos.shift
// ============================================================
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'pos.shift')
    const { id } = await ctx.params
    const body = validate(cashMoveSchema, await req.json())

    const shift = await db.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundError('ไม่พบกะ')
    requireBranchAccess(user, shift.branchId)
    if (shift.status !== 'OPEN') {
      throw new ConflictError('กะนี้ปิดแล้ว ไม่สามารถเคลื่อนไหวเงินได้')
    }

    const delta = body.type === 'CASH_IN' ? body.amount : -body.amount

    const move = await db.$transaction(async (tx) => {
      const created = await tx.cashDrawerMove.create({
        data: {
          shiftId: id,
          type: body.type,
          amount: body.amount,
          reason: body.reason,
          userId: user.id,
        },
      })
      const shiftUpdate: Record<string, unknown> = {
        expectedCash: { increment: delta },
      }
      if (body.type === 'CASH_IN') {
        shiftUpdate.cashIn = { increment: body.amount }
      } else {
        shiftUpdate.cashOut = { increment: body.amount }
      }
      await tx.shift.update({ where: { id }, data: shiftUpdate })
      return created
    })

    await logAudit({
      userId: user.id,
      action: 'ADJUST',
      entity: 'Shift',
      entityId: id,
      newValue: { type: body.type, amount: body.amount, reason: body.reason },
    })

    return ok({ ok: true, moveId: move.id })
  }
)
