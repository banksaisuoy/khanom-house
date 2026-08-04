import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// PATCH /api/admin/deliveries/[id]/status  { status }
// Side-effects: pickupAt/deliveredAt timestamps
// Permission: deliveries.update
// ============================================================
const VALID = ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'FAILED']

export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'deliveries.update')
    const { id } = await ctx.params
    const { status } = await req.json()
    if (!status || !VALID.includes(status)) {
      return ok({ ok: false, error: 'สถานะไม่ถูกต้อง' })
    }
    const existing = await db.delivery.findUnique({
      where: { id },
      include: { order: { select: { orderNo: true } } },
    })
    if (!existing) throw new NotFoundError('ไม่พบการจัดส่ง')

    const data: Record<string, unknown> = { status }
    if (status === 'PICKED_UP' && !existing.pickupAt) data.pickupAt = new Date()
    if (status === 'DELIVERED' && !existing.deliveredAt) data.deliveredAt = new Date()

    const d = await db.delivery.update({ where: { id }, data })
    await logAudit({
      userId: user.id,
      action: 'STATUS_CHANGE',
      entity: 'Delivery',
      entityId: id,
      oldValue: safeJson({ status: existing.status }),
      newValue: safeJson({ status: d.status, orderNo: existing.order?.orderNo }),
    })
    return ok({ ok: true, status: d.status })
  }
)
