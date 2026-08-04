import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, ConflictError, NotFoundError } from '@/lib/api-response'
import { validate, shiftCloseSchema } from '@/lib/validation'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/pos/shift/[id]/close
// AUDIT FIX C-6: double-close + race with new bills.
// Fix: updateMany guard (status OPEN → CLOSED) inside tx.
// Permission: pos.shift
// ============================================================
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'pos.shift')
    const { id } = await ctx.params
    const body = validate(shiftCloseSchema, await req.json())

    const shift = await db.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundError('ไม่พบกะ')

    // Aggregate bill totals by payment method (only COMPLETED bills) — done
    // INSIDE the tx so we read a consistent snapshot.
    const result = await db.$transaction(async (tx) => {
      // Atomic guard: only close if status is OPEN
      const billsByMethod = await tx.posBill.groupBy({
        by: ['paymentMethod'],
        where: { shiftId: id, status: 'COMPLETED' },
        _sum: { total: true },
      })
      const agg = await tx.posBill.aggregate({
        where: { shiftId: id, status: 'COMPLETED' },
        _sum: { total: true },
      })
      const totalSales = agg._sum.total ?? 0
      const cashSales = billsByMethod.find((b) => b.paymentMethod === 'CASH')?._sum.total ?? 0
      const cardSales = billsByMethod.find((b) => b.paymentMethod === 'CARD')?._sum.total ?? 0
      const qrSales =
        (billsByMethod.find((b) => b.paymentMethod === 'PROMPTPAY')?._sum.total ?? 0) +
        (billsByMethod.find((b) => b.paymentMethod === 'EWALLET')?._sum.total ?? 0)

      const expectedCash = shift.openingCash + cashSales + shift.cashIn - shift.cashOut
      const difference = body.countedCash - expectedCash

      const r = await tx.shift.updateMany({
        where: { id, status: 'OPEN' },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          countedCash: body.countedCash,
          expectedCash,
          difference,
          totalSales,
          cashSales,
          cardSales,
          qrSales,
          notes: body.notes,
        },
      })
      if (r.count === 0) {
        throw new ConflictError('กะนี้ปิดไปแล้ว')
      }

      return { expectedCash, difference, totalSales, cashSales, cardSales, qrSales }
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Shift',
      entityId: id,
      newValue: `Closed ${shift.shiftNo} difference=${result.difference}`,
    })

    return ok({
      ok: true,
      shiftNo: shift.shiftNo,
      expectedCash: result.expectedCash,
      countedCash: body.countedCash,
      difference: result.difference,
      totalSales: result.totalSales,
      cashSales: result.cashSales,
      cardSales: result.cardSales,
      qrSales: result.qrSales,
    })
  }
)
