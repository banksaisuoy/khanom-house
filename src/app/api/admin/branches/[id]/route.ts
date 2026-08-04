import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError, forbidden } from '@/lib/api-response'
import { requireAuth } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const branchUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().min(1).max(30).toUpperCase().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  isMain: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

async function requireSuperAdmin(req: NextRequest) {
  const user = await requireAuth(req)
  if (user.role !== 'SUPER_ADMIN') {
    throw forbidden('เฉพาะ Super Admin เท่านั้น')
  }
  return user
}

// PATCH /api/admin/branches/[id] — SUPER_ADMIN only
export const PATCH = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requireSuperAdmin(req)
  const { id } = await params
  const body = branchUpdateSchema.parse(await req.json())

  const existing = await db.branch.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบสาขา')

  const updated = await db.$transaction(async (tx) => {
    // If promoting to main, demote others first
    if (body.isMain === true && !existing.isMain) {
      await tx.branch.updateMany({
        where: { isMain: true, NOT: { id } },
        data: { isMain: false },
      })
    }
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.code !== undefined) data.code = body.code
    if (body.address !== undefined) data.address = body.address || null
    if (body.phone !== undefined) data.phone = body.phone || null
    if (typeof body.isMain === 'boolean') data.isMain = body.isMain
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    return tx.branch.update({ where: { id }, data })
  })

  await logAudit({
    userId: user.id,
    action: 'UPDATE',
    entity: 'Branch',
    entityId: id,
    oldValue: safeJson({ name: existing.name, code: existing.code, isMain: existing.isMain, isActive: existing.isActive }),
    newValue: safeJson({ name: updated.name, code: updated.code, isMain: updated.isMain, isActive: updated.isActive }),
  })

  return ok({ ok: true })
})

// DELETE — soft delete (isActive=false) — SUPER_ADMIN only
export const DELETE = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requireSuperAdmin(req)
  const { id } = await params
  const existing = await db.branch.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบสาขา')

  // Prevent deleting main branch
  if (existing.isMain) {
    return forbidden('ไม่สามารถปิดสาขาหลักได้ — โปรดตั้งสาขาอื่นเป็นสาขาหลักก่อน')
  }

  await db.branch.update({ where: { id }, data: { isActive: false } })
  await logAudit({
    userId: user.id,
    action: 'DELETE',
    entity: 'Branch',
    entityId: id,
    oldValue: safeJson({ name: existing.name, code: existing.code }),
  })
  return ok({ ok: true })
})
