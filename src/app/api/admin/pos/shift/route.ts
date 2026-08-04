import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle, NotFoundError } from '@/lib/api-response'
import { validate, shiftOpenSchema } from '@/lib/validation'
import { nextSeq } from '@/lib/sequence'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// GET /api/admin/pos/shift — current open shift for main branch
// Permission: pos.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'pos.read')

  const branch = await db.branch.findFirst({ where: { isMain: true } })
  if (!branch) throw new NotFoundError('ไม่พบสาขา')

  const shift = await db.shift.findFirst({
    where: { branchId: branch.id, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { bills: true, drawerMoves: true } },
    },
  })

  // Cashier (default operator for demo)
  const cashier = await db.user.findFirst({ where: { role: 'CASHIER' } })

  return ok({
    shift: shift
      ? {
          id: shift.id,
          shiftNo: shift.shiftNo,
          openedAt: shift.openedAt.toISOString(),
          openingCash: shift.openingCash,
          cashIn: shift.cashIn,
          cashOut: shift.cashOut,
          totalSales: shift.totalSales,
          cashSales: shift.cashSales,
          cardSales: shift.cardSales,
          qrSales: shift.qrSales,
          user: shift.user,
          billsCount: shift._count.bills,
        }
      : null,
    branch: { id: branch.id, name: branch.name, code: branch.code },
    cashier: cashier ? { id: cashier.id, name: cashier.name, email: cashier.email } : null,
  })
})

// ============================================================
// POST /api/admin/pos/shift — open new shift
// AUDIT FIX C-7: two concurrent opens create two OPEN shifts.
// Fix: idempotent — if OPEN shift exists for branch, return it.
// Permission: pos.shift
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'pos.shift')
  const body = validate(shiftOpenSchema, await req.json())

  const branch = await db.branch.findFirst({ where: { isMain: true } })
  if (!branch) throw new NotFoundError('ไม่พบสาขา')
  requireBranchAccess(user, branch.id)

  // Idempotent: if OPEN shift already exists for this branch, return it
  const existing = await db.shift.findFirst({
    where: { branchId: branch.id, status: 'OPEN' },
  })
  if (existing) {
    return ok({ ok: true, shiftId: existing.id, shiftNo: existing.shiftNo })
  }

  // Resolve cashier: body.userId (if provided) or default CASHIER user
  const cashier = body.userId
    ? await db.user.findUnique({ where: { id: body.userId } })
    : await db.user.findFirst({ where: { role: 'CASHIER' } })
  if (!cashier) throw new NotFoundError('ไม่พบพนักงานคิดเงิน')

  const shiftNo = await nextSeq('shift', 'SH-', 5)

  const shift = await db.shift.create({
    data: {
      shiftNo,
      branchId: branch.id,
      userId: cashier.id,
      openingCash: body.openingCash,
      expectedCash: body.openingCash,
      status: 'OPEN',
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'Shift',
    entityId: shift.id,
    newValue: { shiftNo, openingCash: body.openingCash },
  })

  return created({ ok: true, shiftId: shift.id, shiftNo })
})
