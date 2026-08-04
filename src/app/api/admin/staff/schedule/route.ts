import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { z } from 'zod'

// ============================================================
// GET /api/admin/staff/schedule?from=&to=&userId=&branchId=
//   Returns array of StaffScheduleDTO.
//   Permission: dashboard.read (any admin can view schedules)
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')

  const sp = req.nextUrl.searchParams
  const from = sp.get('from') || ''
  const to = sp.get('to') || ''
  const userId = sp.get('userId') || ''
  const branchId = sp.get('branchId') || ''

  const where: Record<string, unknown> = {}
  if (from || to) {
    const range: Record<string, unknown> = {}
    if (from) range.gte = new Date(from)
    if (to) {
      const tTo = new Date(to)
      tTo.setHours(23, 59, 59, 999)
      range.lte = tTo
    }
    where.date = range
  }
  if (userId) where.userId = userId
  if (branchId) where.branchId = branchId

  const schedules = await db.staffSchedule.findMany({
    where,
    orderBy: [{ date: 'asc' }, { shiftStart: 'asc' }],
    take: 500,
    include: {
      user: { select: { id: true, name: true, role: true, avatarUrl: true, branchId: true } },
      branch: { select: { id: true, name: true } },
    },
  })

  return ok({
    schedules: schedules.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name,
      userRole: s.user.role,
      userAvatarUrl: s.user.avatarUrl,
      branchId: s.branchId,
      branchName: s.branch?.name ?? null,
      date: s.date.toISOString(),
      shiftStart: s.shiftStart.toISOString(),
      shiftEnd: s.shiftEnd.toISOString(),
      role: s.role,
      status: s.status,
      checkInAt: s.checkInAt?.toISOString() ?? null,
      checkOutAt: s.checkOutAt?.toISOString() ?? null,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    })),
  })
})

// ============================================================
// POST /api/admin/staff/schedule
//   Creates a new schedule entry.
//   Permission: users.create
// ============================================================
const scheduleCreateSchema = z.object({
  userId: z.string().min(1),
  branchId: z.string().optional(),
  date: z.string().datetime(),
  shiftStart: z.string().datetime(),
  shiftEnd: z.string().datetime(),
  role: z.enum(['CASHIER', 'KITCHEN', 'RIDER', 'MANAGER', 'STAFF']).default('STAFF'),
  notes: z.string().max(500).optional(),
})

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'users.create')
  const body = scheduleCreateSchema.parse(await req.json())

  if (body.branchId) {
    requireBranchAccess(user, body.branchId)
  }
  if (new Date(body.shiftEnd) <= new Date(body.shiftStart)) {
    throw new Error('เวลาออกกะต้องอยู่หลังเวลาเข้ากะ')
  }

  const s = await db.staffSchedule.create({
    data: {
      userId: body.userId,
      branchId: body.branchId || null,
      date: new Date(body.date),
      shiftStart: new Date(body.shiftStart),
      shiftEnd: new Date(body.shiftEnd),
      role: body.role,
      status: 'SCHEDULED',
      notes: body.notes || null,
    },
    include: {
      user: { select: { id: true, name: true, role: true, avatarUrl: true } },
      branch: { select: { id: true, name: true } },
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'StaffSchedule',
    entityId: s.id,
    newValue: safeJson({ userId: s.userId, date: s.date, role: s.role }),
  })

  return created({
    schedule: {
      id: s.id,
      userId: s.userId,
      userName: s.user.name,
      userRole: s.user.role,
      userAvatarUrl: s.user.avatarUrl,
      branchId: s.branchId,
      branchName: s.branch?.name ?? null,
      date: s.date.toISOString(),
      shiftStart: s.shiftStart.toISOString(),
      shiftEnd: s.shiftEnd.toISOString(),
      role: s.role,
      status: s.status,
      checkInAt: null,
      checkOutAt: null,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    },
  })
})
