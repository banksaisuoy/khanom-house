import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle, forbidden } from '@/lib/api-response'
import { requirePermission, requireAuth } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { z } from 'zod'

// ============================================================
// GET /api/admin/branches
//   Returns array of BranchDTO with user + inventory counts.
//   Any authenticated admin can view (uses dashboard.read).
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')

  const branches = await db.branch.findMany({
    orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { users: true, inventory: true } },
    },
  })

  return ok({
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      phone: b.phone,
      isMain: b.isMain,
      isActive: b.isActive,
      userCount: b._count.users,
      inventoryCount: b._count.inventory,
      createdAt: b.createdAt.toISOString(),
    })),
  })
})

// ============================================================
// POST /api/admin/branches — SUPER_ADMIN only
//   Creates a new branch.
// ============================================================
const branchCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(30).toUpperCase(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(40).optional(),
  isMain: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export const POST = handle(async (req: NextRequest) => {
  // Verify auth + SUPER_ADMIN role
  const user = await requireAuth(req)
  if (user.role !== 'SUPER_ADMIN') {
    return forbidden('เฉพาะ Super Admin เท่านั้น')
  }
  const body = branchCreateSchema.parse(await req.json())

  // Check unique code
  const existing = await db.branch.findUnique({ where: { code: body.code } })
  if (existing) return forbidden('รหัสสาขานี้มีอยู่แล้ว')

  // If isMain, demote any existing main branch first
  const newBranch = await db.$transaction(async (tx) => {
    if (body.isMain) {
      await tx.branch.updateMany({
        where: { isMain: true },
        data: { isMain: false },
      })
    }
    return tx.branch.create({
      data: {
        name: body.name,
        code: body.code,
        address: body.address || null,
        phone: body.phone || null,
        isMain: body.isMain,
        isActive: body.isActive,
      },
    })
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'Branch',
    entityId: newBranch.id,
    newValue: safeJson({ name: newBranch.name, code: newBranch.code, isMain: newBranch.isMain }),
  })

  return created({
    branch: {
      id: newBranch.id,
      name: newBranch.name,
      code: newBranch.code,
      address: newBranch.address,
      phone: newBranch.phone,
      isMain: newBranch.isMain,
      isActive: newBranch.isActive,
      userCount: 0,
      inventoryCount: 0,
      createdAt: newBranch.createdAt.toISOString(),
    },
  })
})
