import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError, ConflictError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

// POST /api/admin/staff/schedule/[id]/checkout
//   Marks the schedule as CHECKED_OUT with checkOutAt=now.
//   Requires CHECKED_IN status (cannot checkout SCHEDULED directly).
//   Permission: users.create (manager+)
export const POST = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'users.create')
  const { id } = await params

  const existing = await db.staffSchedule.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบตารางกะ')
  if (existing.status === 'CHECKED_OUT') {
    throw new ConflictError('เช็คเอาท์แล้ว')
  }
  if (existing.status !== 'CHECKED_IN') {
    throw new ConflictError('ต้องเช็คอินก่อนถึงจะเช็คเอาท์ได้')
  }

  const s = await db.staffSchedule.update({
    where: { id },
    data: {
      status: 'CHECKED_OUT',
      checkOutAt: new Date(),
    },
  })

  await logAudit({
    userId: user.id,
    action: 'STATUS_CHANGE',
    entity: 'StaffSchedule',
    entityId: id,
    oldValue: safeJson({ status: existing.status }),
    newValue: safeJson({ status: s.status, checkOutAt: s.checkOutAt }),
  })

  return ok({
    schedule: {
      id: s.id,
      status: s.status,
      checkOutAt: s.checkOutAt?.toISOString() ?? null,
    },
  })
})
