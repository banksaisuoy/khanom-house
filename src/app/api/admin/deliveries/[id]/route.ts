import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// PATCH /api/admin/deliveries/[id]
//   { riderId?, eta?, notes?, status?, pickupAt?, deliveredAt? }
// Permission: deliveries.update
// ============================================================
export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'deliveries.update')
    const { id } = await ctx.params
    const existing = await db.delivery.findUnique({
      where: { id },
      include: { order: { select: { orderNo: true } } },
    })
    if (!existing) throw new NotFoundError('ไม่พบการจัดส่ง')

    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.riderId !== undefined) data.riderId = body.riderId || null
    if (body.eta !== undefined) data.eta = body.eta ? Number(body.eta) : null
    if (body.notes !== undefined) data.notes = body.notes
    if (body.status !== undefined) {
      data.status = body.status
      if (body.status === 'PICKED_UP' && !existing.pickupAt) data.pickupAt = new Date()
      if (body.status === 'DELIVERED' && !existing.deliveredAt) data.deliveredAt = new Date()
    }

    const d = await db.delivery.update({ where: { id }, data })
    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Delivery',
      entityId: id,
      oldValue: safeJson({ status: existing.status, riderId: existing.riderId, eta: existing.eta }),
      newValue: safeJson({ status: d.status, riderId: d.riderId, eta: d.eta, orderNo: existing.order?.orderNo }),
    })
    return ok({ ok: true })
  }
)
