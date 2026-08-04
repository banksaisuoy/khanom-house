import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/inventory/[id]
//   Body: { reorderPoint?, safetyStock?, batchNo?, expiryAt?, location?, unit? }
//   (Quantity changes go through /adjust for proper movement logging.)
// Permission: inventory.update
export const PATCH = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'inventory.update')
  const { id } = await params
  const body = (await req.json()) as {
    reorderPoint?: number
    safetyStock?: number
    batchNo?: string | null
    expiryAt?: string | null
    location?: string | null
    unit?: string
  }
  const existing = await db.inventory.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบรายการสต็อก')
  requireBranchAccess(user, existing.branchId)

  const data: Record<string, unknown> = {}
  if (typeof body.reorderPoint === 'number') data.reorderPoint = body.reorderPoint
  if (typeof body.safetyStock === 'number') data.safetyStock = body.safetyStock
  if (body.batchNo !== undefined) data.batchNo = body.batchNo?.trim() || null
  if (body.expiryAt !== undefined) data.expiryAt = body.expiryAt ? new Date(body.expiryAt) : null
  if (body.location !== undefined) data.location = body.location?.trim() || null
  if (body.unit !== undefined) data.unit = body.unit

  const updated = await db.inventory.update({ where: { id }, data })
  // AUDIT (P3-6): log inventory meta updates (reorderPoint, expiry, etc.).
  await logAudit({
    userId: user.id,
    action: 'UPDATE',
    entity: 'Inventory',
    entityId: id,
    oldValue: safeJson({
      reorderPoint: existing.reorderPoint,
      safetyStock: existing.safetyStock,
      batchNo: existing.batchNo,
      expiryAt: existing.expiryAt,
      location: existing.location,
      unit: existing.unit,
    }),
    newValue: safeJson(data),
  })
  return ok({ inventory: { id: updated.id, quantity: updated.quantity } })
})
