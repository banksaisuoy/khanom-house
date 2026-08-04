import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, ConflictError, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/production/[id]/start
// AUDIT FIX M-13: double-start overwrites startedAt.
// Fix: updateMany guard (status must be QUEUED).
// Permission: kitchen.update
// ============================================================
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'kitchen.update')
    const { id } = await ctx.params

    const batch = await db.productionBatch.findUnique({ where: { id } })
    if (!batch) throw new NotFoundError('ไม่พบคิวผลิต')

    const r = await db.productionBatch.updateMany({
      where: { id, status: 'QUEUED' },
      data: { status: 'COOKING', startedAt: new Date(), userId: user.id },
    })
    if (r.count === 0) {
      throw new ConflictError(
        `สถานะปัจจุบัน (${batch.status}) ไม่สามารถเริ่มได้`
      )
    }

    await logAudit({
      userId: user.id,
      action: 'STATUS_CHANGE',
      entity: 'ProductionBatch',
      entityId: id,
      oldValue: { status: 'QUEUED' },
      newValue: { status: 'COOKING' },
    })

    return ok({ ok: true, startedAt: new Date().toISOString() })
  }
)
