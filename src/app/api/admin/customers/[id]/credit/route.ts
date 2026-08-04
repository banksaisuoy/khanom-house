import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle, NotFoundError, ConflictError, badRequest } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

// ============================================================
// GET /api/admin/customers/[id]/credit
//   List store-credit history for a customer + current balance.
//   Balance is computed as sum of all rows' `amount` (signed).
// ============================================================
export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requirePermission(req, 'customers.read')
    const { id } = await ctx.params

    const customer = await db.customer.findUnique({ where: { id, deletedAt: null } })
    if (!customer) throw new NotFoundError('ไม่พบลูกค้า')

    const [rows, agg] = await Promise.all([
      db.storeCredit.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { name: true } } },
      }),
      db.storeCredit.aggregate({
        where: { customerId: id },
        _sum: { amount: true },
      }),
    ])

    return ok({
      balance: agg._sum.amount ?? 0,
      history: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        balance: r.balance,
        reason: r.reason,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        userId: r.userId,
        userName: r.user?.name ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  }
)

// ============================================================
// POST /api/admin/customers/[id]/credit
//   Adjust store credit. Creates a StoreCredit row.
//   - type: REFUND | TOPUP | REWARD | ADJUST
//   - amount: positive number (always stored as signed based on type)
//   - For TOPUP/REWARD/REFUND → positive (+amount)
//   - For ADJUST → can be positive or negative (use sign of amount)
//   - Computes new balance atomically inside tx.
//   Permission: customers.points
// ============================================================
const creditAdjustSchema = z.object({
  type: z.enum(['REFUND', 'TOPUP', 'REWARD', 'ADJUST']),
  amount: z.number().finite().refine((n) => n !== 0, 'จำนวนต้องไม่เป็น 0'),
  reason: z.string().trim().min(1).max(200),
  expiresAt: z.string().datetime().optional(),
})

export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'customers.points')
    const { id } = await ctx.params
    const body = creditAdjustSchema.parse(await req.json())

    const customer = await db.customer.findUnique({ where: { id, deletedAt: null } })
    if (!customer) throw new NotFoundError('ไม่พบลูกค้า')

    // Signed amount: REFUND/TOPUP/REWARD always credit (positive).
    // ADJUST can be + or - based on the sign of the supplied amount.
    const signedAmount =
      body.type === 'ADJUST' ? body.amount : Math.abs(body.amount)

    if (signedAmount > 1000000) {
      return badRequest('จำนวนเงินมากเกินไป')
    }

    const result = await db.$transaction(async (tx) => {
      // Lock by re-reading inside tx.
      const current = await tx.customer.findUnique({ where: { id } })
      if (!current) throw new NotFoundError('ไม่พบลูกค้า')

      const agg = await tx.storeCredit.aggregate({
        where: { customerId: id },
        _sum: { amount: true },
      })
      const currentBalance = agg._sum.amount ?? 0
      const newBalance = currentBalance + signedAmount

      // If decrementing, ensure balance won't go negative.
      if (signedAmount < 0 && currentBalance + signedAmount < 0) {
        throw new ConflictError('เครดิตคงเหลือไม่เพียงพอ')
      }

      const row = await tx.storeCredit.create({
        data: {
          customerId: id,
          type: body.type,
          amount: signedAmount,
          balance: newBalance,
          reason: body.reason,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          userId: user.id,
        },
      })

      return { row, newBalance, oldBalance: currentBalance }
    })

    await logAudit({
      userId: user.id,
      action: 'ADJUST',
      entity: 'StoreCredit',
      entityId: result.row.id,
      oldValue: { balance: result.oldBalance },
      newValue: {
        balance: result.newBalance,
        type: body.type,
        delta: signedAmount,
        reason: body.reason,
      },
    })

    return created({
      ok: true,
      balance: result.newBalance,
      entry: {
        id: result.row.id,
        type: result.row.type,
        amount: result.row.amount,
        balance: result.row.balance,
        reason: result.row.reason,
        expiresAt: result.row.expiresAt?.toISOString() ?? null,
        createdAt: result.row.createdAt.toISOString(),
      },
    })
  }
)
