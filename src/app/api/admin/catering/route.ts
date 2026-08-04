import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { validate, cateringCreateSchema } from '@/lib/validation'
import { nextSeq } from '@/lib/sequence'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { normalizeChecklist } from '@/lib/admin-ui'

// ============================================================
// GET /api/admin/catering?type=&status=&from=&to=&q=
// Filters out soft-deleted events.
// Permission: catering.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'catering.read')

  const sp = req.nextUrl.searchParams
  const type = sp.get('type') || undefined
  const status = sp.get('status') || undefined
  const from = sp.get('from')
  const to = sp.get('to')
  const q = sp.get('q')?.trim() || undefined

  const where: Record<string, unknown> = { deletedAt: null }
  if (type && type !== 'all') where.type = type
  if (status && status !== 'all') where.status = status
  if (from || to) {
    where.eventDate = {}
    if (from) (where.eventDate as { gte?: Date }).gte = new Date(from)
    if (to) (where.eventDate as { lte?: Date }).lte = new Date(to + 'T23:59:59.999')
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { eventNo: { contains: q } },
      { customerName: { contains: q } },
      { customerPhone: { contains: q } },
      { location: { contains: q } },
    ]
  }

  const events = await db.cateringEvent.findMany({
    where,
    orderBy: { eventDate: 'desc' },
    include: { assignedUser: { select: { id: true, name: true, role: true } } },
  })

  return ok({
    events: events.map((e) => ({
      ...e,
      eventDate: e.eventDate.toISOString(),
      setupTime: e.setupTime?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      items: e.items ? JSON.parse(e.items) : [],
      checklist: normalizeChecklist(e.checklist ? JSON.parse(e.checklist) : []),
    })),
  })
})

// ============================================================
// POST /api/admin/catering — create event
// AUDIT FIX C-4: count()+1 race → nextSeq('event', 'EVT-', 5).
// Validates with cateringCreateSchema.
// Permission: catering.create
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'catering.create')
  const body = validate(cateringCreateSchema, await req.json())

  const eventNo = await nextSeq('event', 'EVT-', 5)

  const ev = await db.cateringEvent.create({
    data: {
      eventNo,
      title: body.title,
      type: body.type,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail ?? null,
      guestCount: body.guestCount,
      eventDate: new Date(body.eventDate),
      setupTime: body.setupTime ? new Date(body.setupTime) : null,
      location: body.location,
      mapUrl: body.mapUrl ?? null,
      theme: body.theme ?? null,
      packagingType: body.packagingType ?? null,
      budget: body.budget ?? 0,
      totalQuote: body.totalQuote ?? 0,
      deposit: body.deposit ?? 0,
      status: 'DRAFT',
      assignedUserId: body.assignedUserId || null,
      vehicle: body.vehicle ?? null,
      items: body.items ? JSON.stringify(JSON.parse(body.items)) : JSON.stringify([]),
      checklist: JSON.stringify(body.checklist ?? []),
      notes: body.notes ?? null,
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'CateringEvent',
    entityId: ev.id,
    newValue: safeJson({ eventNo, title: ev.title, type: ev.type }),
  })

  return created({ ok: true, id: ev.id, eventNo })
})
