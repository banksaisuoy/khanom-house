import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// PATCH /api/admin/catering/[id]/status  { status }
// Permission: catering.update
// ============================================================
const VALID = ['DRAFT', 'QUOTED', 'CONFIRMED', 'PREPARING', 'DELIVERED', 'COMPLETED', 'CANCELLED']

export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'catering.update')
    const { id } = await ctx.params
    const body = await req.json()
    const status = String(body?.status ?? '')
    if (!VALID.includes(status)) {
      return ok({ ok: false, error: 'สถานะไม่ถูกต้อง' })
    }
    const existing = await db.cateringEvent.findUnique({ where: { id, deletedAt: null }, select: { status: true, title: true } })
    if (!existing) {
      return ok({ ok: false, error: 'ไม่พบงาน' })
    }
    const ev = await db.cateringEvent.update({ where: { id }, data: { status } })
    await logAudit({
      userId: user.id,
      action: 'STATUS_CHANGE',
      entity: 'CateringEvent',
      entityId: id,
      oldValue: safeJson({ status: existing.status }),
      newValue: safeJson({ status: ev.status, title: existing.title }),
    })
    return ok({ ok: true, status: ev.status })
  }
)
