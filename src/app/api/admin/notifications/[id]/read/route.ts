import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// POST /api/admin/notifications/[id]/read — mark a notification as read
// Permission: notifications.update
// ============================================================
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requirePermission(req, 'notifications.update')
    const { id } = await ctx.params

    const existing = await db.notification.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบการแจ้งเตือน')

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    })
    return ok({ ok: true, notification: updated })
  }
)
