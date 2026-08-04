import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, ConflictError, NotFoundError } from '@/lib/api-response'
import { validate, loyaltyAdjustSchema } from '@/lib/validation'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/customers/[id]/points
// AUDIT FIX C-3: read-then-write race on points.
// Fix: atomic increment (EARN/BONUS) or atomic check-and-decrement (REDEEM)
//      via updateMany guard. Tier recomputed from new balance.
// Permission: customers.points
// ============================================================
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'customers.points')
    const { id } = await ctx.params
    const body = validate(loyaltyAdjustSchema, await req.json())

    const customer = await db.customer.findUnique({ where: { id } })
    if (!customer) throw new NotFoundError('ไม่พบลูกค้า')

    const isAdd = body.type === 'EARN' || body.type === 'BONUS'
    const mag = Math.abs(body.points)

    await db.$transaction(async (tx) => {
      if (isAdd) {
        // Atomic increment — always succeeds
        await tx.customer.update({
          where: { id },
          data: { points: { increment: mag } },
        })
      } else {
        // REDEEM / EXPIRE — atomic check-and-decrement with balance guard
        const r = await tx.customer.updateMany({
          where: { id, points: { gte: mag } },
          data: { points: { decrement: mag } },
        })
        if (r.count === 0) {
          throw new ConflictError('แต้มไม่เพียงพอ')
        }
      }

      // Recompute tier from new balance
      const updated = await tx.customer.findUnique({ where: { id } })
      if (updated) {
        const newTier =
          updated.points >= 3000 ? 'VIP'
          : updated.points >= 1500 ? 'GOLD'
          : updated.points >= 500 ? 'SILVER'
          : 'BRONZE'
        if (newTier !== updated.tier) {
          await tx.customer.update({
            where: { id },
            data: { tier: newTier },
          })
        }
      }

      await tx.loyaltyLog.create({
        data: {
          customerId: id,
          type: body.type,
          points: mag,
          reason: body.reason,
          orderId: null,
        },
      })
    })

    const final = await db.customer.findUnique({ where: { id } })

    await logAudit({
      userId: user.id,
      action: 'ADJUST',
      entity: 'LoyaltyLog',
      entityId: id,
      oldValue: { points: customer.points, tier: customer.tier },
      newValue: { points: final?.points, tier: final?.tier, type: body.type, delta: isAdd ? mag : -mag },
    })

    return ok({
      ok: true,
      points: final?.points ?? 0,
      tier: final?.tier ?? customer.tier,
      tierUpgraded: final?.tier !== customer.tier,
    })
  }
)
