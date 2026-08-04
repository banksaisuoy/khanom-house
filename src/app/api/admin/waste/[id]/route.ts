import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// DELETE /api/admin/waste/[id]
// Permission: waste.delete
export const DELETE = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'waste.delete')
    const { id } = await ctx.params
    const existing = await db.wasteLog.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบบันทึก')
    await db.wasteLog.delete({ where: { id } })
    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'WasteLog',
      entityId: id,
      oldValue: safeJson({ productName: existing.productName, source: existing.source, value: existing.value }),
    })
    return ok({ ok: true })
  }
)
