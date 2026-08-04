import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError, ConflictError } from '@/lib/api-response'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const scheduleUpdateSchema = z.object({
  userId: z.string().optional(),
  branchId: z.string().nullable().optional(),
  date: z.string().datetime().optional(),
  shiftStart: z.string().datetime().optional(),
  shiftEnd: z.string().datetime().optional(),
  role: z.enum(['CASHIER', 'KITCHEN', 'RIDER', 'MANAGER', 'STAFF']).optional(),
  status: z.enum(['SCHEDULED', 'CHECKED_IN', 'CHECKED_OUT', 'ABSENT']).optional(),
  notes: z.string().max(500).nullable().optional(),
})

// PATCH /api/admin/staff/schedule/[id]
// Permission: users.create (managers+)
export const PATCH = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'users.create')
  const { id } = await params
  const body = scheduleUpdateSchema.parse(await req.json())

  const existing = await db.staffSchedule.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบตารางกะ')

  if (body.branchId !== undefined && body.branchId) {
    requireBranchAccess(user, body.branchId)
  }

  const data: Record<string, unknown> = {}
  if (body.userId !== undefined) data.userId = body.userId
  if (body.branchId !== undefined) data.branchId = body.branchId || null
  if (body.date !== undefined) data.date = new Date(body.date)
  if (body.shiftStart !== undefined) data.shiftStart = new Date(body.shiftStart)
  if (body.shiftEnd !== undefined) data.shiftEnd = new Date(body.shiftEnd)
  if (body.role !== undefined) data.role = body.role
  if (body.status !== undefined) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes ?? null

  const s = await db.staffSchedule.update({ where: { id }, data })
  await logAudit({
    userId: user.id,
    action: 'UPDATE',
    entity: 'StaffSchedule',
    entityId: id,
    oldValue: safeJson({ userId: existing.userId, role: existing.role, status: existing.status }),
    newValue: safeJson({ userId: s.userId, role: s.role, status: s.status }),
  })

  return ok({ ok: true })
})

// DELETE /api/admin/staff/schedule/[id]
// Permission: users.create
export const DELETE = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'users.create')
  const { id } = await params
  const existing = await db.staffSchedule.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบตารางกะ')

  // Don't allow deleting already-checked-out shifts (audit trail)
  if (existing.status === 'CHECKED_OUT') {
    throw new ConflictError('ไม่สามารถลบกะที่เช็คออกแล้ว — ลบเพื่อรักษาประวัติการทำงาน')
  }

  await db.staffSchedule.delete({ where: { id } })
  await logAudit({
    userId: user.id,
    action: 'DELETE',
    entity: 'StaffSchedule',
    entityId: id,
    oldValue: safeJson({ userId: existing.userId, date: existing.date }),
  })
  return ok({ ok: true })
})
