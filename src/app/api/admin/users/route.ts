import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { ok, created, conflict, handle } from '@/lib/api-response'
import { validate, userCreateSchema } from '@/lib/validation'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// GET /api/admin/users?role=RIDER&includeInactive=1
// Permission: users.read (any admin role)
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'users.read')

  const sp = req.nextUrl.searchParams
  const role = sp.get('role') || undefined
  const includeInactive = sp.get('includeInactive') === '1'

  const where: Record<string, unknown> = {}
  if (role) where.role = role
  if (!includeInactive) where.isActive = true

  const users = await db.user.findMany({
    where,
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true, email: true, name: true, phone: true, avatarUrl: true,
      role: true, branchId: true, isActive: true, lastLoginAt: true, createdAt: true,
      branch: { select: { id: true, name: true, code: true } },
    },
    take: 200,
  })

  return ok({
    users: users.map((u) => ({
      ...u,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  })
})

// ============================================================
// POST /api/admin/users
// Validates with userCreateSchema, hashes password with bcrypt.
// Permission: users.create (SUPER_ADMIN only)
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'users.create')
  const body = validate(userCreateSchema, await req.json())

  const existing = await db.user.findUnique({ where: { email: body.email } })
  if (existing) return conflict('อีเมลนี้ถูกใช้แล้ว')

  const passwordHash = await bcrypt.hash(body.password, 10)
  const u = await db.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role,
      branchId: body.branchId || null,
      isActive: body.isActive,
    },
    select: {
      id: true, email: true, name: true, role: true, branchId: true, isActive: true, createdAt: true,
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'User',
    entityId: u.id,
    oldValue: null,
    newValue: { name: body.name, email: body.email, role: body.role, branchId: body.branchId || null, isActive: u.isActive },
  })

  return created({
    user: {
      ...u,
      createdAt: u.createdAt.toISOString(),
    },
  })
})
