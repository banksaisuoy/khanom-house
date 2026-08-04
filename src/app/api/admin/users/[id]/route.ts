import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { ok, conflict, handle, NotFoundError } from '@/lib/api-response'
import { validate, userUpdateSchema } from '@/lib/validation'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// GET /api/admin/users/[id]
// Permission: users.read
// ============================================================
export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requirePermission(req, 'users.read')
    const { id } = await ctx.params
    const u = await db.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true,
        role: true, branchId: true, isActive: true, lastLoginAt: true, createdAt: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    })
    if (!u) throw new NotFoundError('ไม่พบผู้ใช้')
    return ok({
      user: {
        ...u,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      },
    })
  }
)

// ============================================================
// PATCH /api/admin/users/[id]
// Validates with userUpdateSchema; optional password reset → bcrypt.
// Permission: users.update (SUPER_ADMIN only)
// ============================================================
export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'users.update')
    const { id } = await ctx.params
    const body = validate(userUpdateSchema, await req.json())

    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, branchId: true, phone: true, avatarUrl: true, isActive: true },
    })
    if (!existing) throw new NotFoundError('ไม่พบผู้ใช้')

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.email !== undefined && body.email !== existing.email) {
      const conflictUser = await db.user.findUnique({ where: { email: body.email } })
      if (conflictUser) return conflict('อีเมลนี้ถูกใช้แล้ว')
      data.email = body.email
    }
    if (body.role !== undefined) data.role = body.role
    if (body.branchId !== undefined) data.branchId = body.branchId || null
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10)
    }

    const u = await db.user.update({ where: { id }, data })
    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      oldValue: safeJson(existing),
      newValue: safeJson({
        name: u.name, email: u.email, role: u.role, branchId: u.branchId,
        isActive: u.isActive, passwordReset: !!body.password,
      }),
    })
    return ok({ ok: true })
  }
)

// ============================================================
// DELETE /api/admin/users/[id] — soft delete (isActive=false)
// Permission: users.update (SUPER_ADMIN only — admin shell prevents
//             deleting the last super admin via the UI)
// ============================================================
export const DELETE = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'users.update')
    const { id } = await ctx.params
    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    if (!existing) throw new NotFoundError('ไม่พบผู้ใช้')

    const u = await db.user.update({ where: { id }, data: { isActive: false } })
    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      oldValue: safeJson(existing),
      newValue: safeJson({ id: u.id, name: u.name, email: u.email, isActive: false }),
    })
    return ok({ ok: true })
  }
)
