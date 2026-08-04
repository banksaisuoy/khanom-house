import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { normalizeChecklist } from '@/lib/admin-ui'

// ============================================================
// GET    /api/admin/catering/[id]
// PATCH  /api/admin/catering/[id]
// DELETE /api/admin/catering/[id]  (SOFT DELETE via deletedAt)
// ============================================================

export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requirePermission(req, 'catering.read')
    const { id } = await ctx.params
    const ev = await db.cateringEvent.findUnique({
      where: { id, deletedAt: null },
      include: { assignedUser: { select: { id: true, name: true, role: true } } },
    })
    if (!ev) throw new NotFoundError('ไม่พบงาน')
    return ok({
      ...ev,
      eventDate: ev.eventDate.toISOString(),
      setupTime: ev.setupTime?.toISOString() ?? null,
      createdAt: ev.createdAt.toISOString(),
      updatedAt: ev.updatedAt.toISOString(),
      items: ev.items ? JSON.parse(ev.items) : [],
      checklist: normalizeChecklist(ev.checklist ? JSON.parse(ev.checklist) : []),
    })
  }
)

export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'catering.update')
    const { id } = await ctx.params
    const existing = await db.cateringEvent.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบงาน')

    const body = await req.json()
    const data: Record<string, unknown> = {}
    const fields = [
      'title', 'type', 'customerName', 'customerPhone', 'customerEmail', 'guestCount',
      'location', 'mapUrl', 'theme', 'packagingType', 'budget', 'totalQuote', 'deposit',
      'status', 'assignedUserId', 'vehicle', 'notes',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    if (body.eventDate) data.eventDate = new Date(body.eventDate)
    if (body.setupTime !== undefined) data.setupTime = body.setupTime ? new Date(body.setupTime) : null
    if (body.items !== undefined) data.items = JSON.stringify(body.items ?? [])
    if (body.checklist !== undefined) data.checklist = JSON.stringify(body.checklist ?? [])
    if (body.assignedUserId === '') data.assignedUserId = null

    const ev = await db.cateringEvent.update({ where: { id }, data })
    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'CateringEvent',
      entityId: id,
      oldValue: safeJson({ title: existing.title, status: existing.status, totalQuote: existing.totalQuote }),
      newValue: safeJson({ title: ev.title, status: ev.status, totalQuote: ev.totalQuote }),
    })
    return ok({ ok: true })
  }
)

export const DELETE = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'catering.delete')
    const { id } = await ctx.params
    const existing = await db.cateringEvent.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบงาน')

    // SOFT DELETE — keep row for historical reference / order integrity
    await db.cateringEvent.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'CateringEvent',
      entityId: id,
      oldValue: safeJson({ eventNo: existing.eventNo, title: existing.title }),
    })
    return ok({ ok: true })
  }
)
