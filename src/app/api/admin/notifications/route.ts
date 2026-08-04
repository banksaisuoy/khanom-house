import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/notifications — list notifications
// Query: ?filter=all|unread|critical
// Permission: notifications.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'notifications.read')

  const filter = req.nextUrl.searchParams.get('filter') ?? 'all'
  const where: Record<string, unknown> = {}
  if (filter === 'unread') where.isRead = false
  if (filter === 'critical') where.severity = 'critical'

  const [items, unreadCount, criticalCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.notification.count({ where: { isRead: false } }),
    db.notification.count({ where: { severity: 'critical' } }),
  ])

  return ok({
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      isRead: n.isRead,
      refType: n.refType,
      refId: n.refId,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
    criticalCount,
    total: items.length,
  })
})
