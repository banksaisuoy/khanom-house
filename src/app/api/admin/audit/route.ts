import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toCsv } from '@/lib/admin-ui'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/audit?userId=&action=&entity=&from=&to=&q=&page=&pageSize=
// Returns paginated audit logs with user info.
// Supports ?format=csv for CSV export.
// Permission: audit.read
// ============================================================
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'STATUS_CHANGE', 'EXPORT', 'ADJUST']

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'audit.read')

  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId') || undefined
  const action = sp.get('action') || undefined
  const entity = sp.get('entity') || undefined
  const from = sp.get('from')
  const to = sp.get('to')
  const q = sp.get('q')?.trim() || undefined
  const page = Math.max(1, Number(sp.get('page') ?? '1'))
  const pageSize = Math.min(200, Math.max(10, Number(sp.get('pageSize') ?? '20')))
  const format = sp.get('format')

  void ACTIONS

  const where: Record<string, unknown> = {}
  if (userId && userId !== 'all') where.userId = userId
  if (action && action !== 'all') where.action = action
  if (entity && entity !== 'all') where.entity = entity
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as { gte?: Date }).gte = new Date(from + 'T00:00:00')
    if (to) (where.createdAt as { lte?: Date }).lte = new Date(to + 'T23:59:59.999')
  }
  if (q) {
    where.OR = [
      { entity: { contains: q } },
      { entityId: { contains: q } },
      { ip: { contains: q } },
      { userAgent: { contains: q } },
      { user: { name: { contains: q } } },
    ]
  }

  if (format === 'csv') {
    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: { user: { select: { name: true, email: true, role: true } } },
    })
    const rows = logs.map((l) => ({
      timestamp: new Date(l.createdAt).toISOString(),
      user: l.user?.name ?? '—',
      email: l.user?.email ?? '',
      role: l.user?.role ?? '',
      action: l.action,
      entity: l.entity,
      entityId: l.entityId ?? '',
      ip: l.ip ?? '',
      userAgent: l.userAgent ?? '',
    }))
    const csv = toCsv(rows, [
      { key: 'timestamp', label: 'วันที่' },
      { key: 'user', label: 'ผู้ใช้' },
      { key: 'email', label: 'อีเมล' },
      { key: 'role', label: 'บทบาท' },
      { key: 'action', label: 'การกระทำ' },
      { key: 'entity', label: 'เอนทิตี' },
      { key: 'entityId', label: 'ID' },
      { key: 'ip', label: 'IP' },
      { key: 'userAgent', label: 'User Agent' },
    ])
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs.csv"`,
      },
    })
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
    }),
  ])

  return ok({
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})
