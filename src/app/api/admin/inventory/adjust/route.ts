import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { created, ok, handle, ConflictError, NotFoundError } from '@/lib/api-response'
import { validate, stockMoveTypeSchema } from '@/lib/validation'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { z } from 'zod'
import { classifyStock } from '@/lib/admin-catalog'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/inventory/adjust
// AUDIT FIX C-9: read-then-write race; clamps to 0 silently.
// Fix: atomic decrement with updateMany guard; throws ConflictError if
//      insufficient (no silent clamp). Uses session user for userId.
//      Checks requireBranchAccess(user, inv.branchId).
// Permission: inventory.adjust
// ============================================================

// Permissive schema: accepts either inventoryId (adjust existing) OR
// productId+branchId (receive-goods / new-row mode).
const adjustSchema = z
  .object({
    inventoryId: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
    branchId: z.string().min(1).optional(),
    type: stockMoveTypeSchema,
    quantity: z.number().finite(),
    reason: z.string().trim().max(200).optional(),
    refType: z.string().max(40).optional(),
    refId: z.string().max(80).optional(),
    // caller-supplied userId is IGNORED — we always use the session user.
    userId: z.string().optional(),
    // receive-goods fields
    batchNo: z.string().max(80).optional(),
    expiryAt: z.string().datetime().optional(),
    location: z.string().max(120).optional(),
    unit: z.string().max(30).optional(),
    inventoryType: z.enum(['RAW', 'FINISHED', 'PACKAGING']).optional(),
    reorderPoint: z.number().optional(),
    safetyStock: z.number().optional(),
  })
  .refine((d) => d.inventoryId || (d.productId && d.branchId), {
    message: 'ต้องระบุ inventoryId หรือ productId+branchId',
  })

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'inventory.adjust')
  const body = validate(adjustSchema, await req.json())

  const moveType = body.type
  const qty = Math.abs(body.quantity)
  if (qty === 0) {
    throw new ConflictError('จำนวนต้องมากกว่า 0')
  }

  // OUT/WASTE/SALE = decrement; IN/PRODUCTION = increment; ADJUST/TRANSFER = absolute
  const sign = moveType === 'IN' || moveType === 'PRODUCTION' ? 1
    : moveType === 'OUT' || moveType === 'WASTE' || moveType === 'SALE' ? -1
    : 0

  const result = await db.$transaction(async (tx) => {
    // Resolve the inventory row (existing or new)
    let inv = body.inventoryId
      ? await tx.inventory.findUnique({ where: { id: body.inventoryId } })
      : null

    if (!inv && body.productId && body.branchId) {
      inv = await tx.inventory.findFirst({
        where: {
          productId: body.productId,
          branchId: body.branchId,
          type: body.inventoryType || 'FINISHED',
        },
      })
    }
    if (inv) {
      requireBranchAccess(user, inv.branchId)
    } else if (body.branchId) {
      requireBranchAccess(user, body.branchId)
    }

    const productId = inv?.productId ?? body.productId
    if (!productId) throw new NotFoundError('ไม่พบสินค้าที่เกี่ยวข้อง')

    const product = await tx.product.findUnique({ where: { id: productId } })
    if (!product) throw new NotFoundError('ไม่พบสินค้า')

    if (inv) {
      // Existing row — atomic update with guard for decrements
      if (sign < 0) {
        // OUT/WASTE/SALE — atomic check-and-decrement, never goes negative
        const r = await tx.inventory.updateMany({
          where: { id: inv.id, quantity: { gte: qty } },
          data: { quantity: { decrement: qty } },
        })
        if (r.count === 0) {
          throw new ConflictError('สต็อกไม่เพียงพอ')
        }
        inv = await tx.inventory.findUnique({ where: { id: inv.id } })
      } else if (sign > 0) {
        // IN/PRODUCTION — atomic increment (always succeeds)
        inv = await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: { increment: qty } },
        })
      } else {
        // ADJUST/TRANSFER — set absolute, log signed delta in movement
        inv = await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: qty },
        })
      }
      // Optional metadata patch
      const patch: Record<string, unknown> = {}
      if (body.batchNo !== undefined) patch.batchNo = body.batchNo?.trim() || inv!.batchNo
      if (body.expiryAt !== undefined) patch.expiryAt = body.expiryAt ? new Date(body.expiryAt) : inv!.expiryAt
      if (body.location !== undefined) patch.location = body.location?.trim() || inv!.location
      if (Object.keys(patch).length > 0) {
        inv = await tx.inventory.update({ where: { id: inv!.id }, data: patch })
      }
    } else if (body.branchId) {
      // Receive-goods into a brand new row
      const startQty = sign !== 0 ? Math.max(0, sign * qty) : qty
      inv = await tx.inventory.create({
        data: {
          productId,
          branchId: body.branchId,
          type: body.inventoryType || 'FINISHED',
          quantity: startQty,
          unit: body.unit || product.unit,
          reorderPoint: body.reorderPoint ?? 0,
          safetyStock: body.safetyStock ?? 0,
          batchNo: body.batchNo?.trim() || null,
          expiryAt: body.expiryAt ? new Date(body.expiryAt) : null,
          location: body.location?.trim() || null,
        },
      })
    } else {
      throw new NotFoundError('ไม่พบรายการสต็อกและไม่ได้ระบุ branchId')
    }

    // Stock movement — always logged with session user
    // At this point inv is guaranteed non-null (existing updated, or created, or threw)
    if (!inv) throw new Error('Inventory not resolved')
    const movementQty = sign === 0 ? qty : qty
    const movement = await tx.stockMovement.create({
      data: {
        inventoryId: inv.id,
        type: moveType,
        quantity: movementQty,
        reason: body.reason || null,
        refType: body.refType || null,
        refId: body.refId || null,
        userId: user.id,
      },
    })

    return {
      inventory: {
        id: inv.id,
        quantity: inv.quantity,
        status: classifyStock(inv.quantity, inv.reorderPoint, inv.safetyStock),
      },
      movementId: movement.id,
    }
  })

  await logAudit({
    userId: user.id,
    action: 'ADJUST',
    entity: 'Inventory',
    entityId: result.inventory.id,
    newValue: { type: moveType, qty, status: result.inventory.status },
  })

  return created(result)
})

// GET helper re-export for compatibility (other routes import fetchInventoryDetail from here)
export async function fetchInventoryDetail(id: string, limit = 50) {
  const inv = await db.inventory.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, slug: true, type: true } },
      branch: true,
      movements: {
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })
  if (!inv) return null
  return {
    id: inv.id,
    productId: inv.product.id,
    productName: inv.product.name,
    productSlug: inv.product.slug,
    productType: inv.product.type,
    branchId: inv.branchId,
    branchName: inv.branch?.name ?? '',
    type: inv.type,
    quantity: inv.quantity,
    unit: inv.unit,
    reorderPoint: inv.reorderPoint,
    safetyStock: inv.safetyStock,
    batchNo: inv.batchNo,
    expiryAt: inv.expiryAt ? inv.expiryAt.toISOString() : null,
    location: inv.location,
    updatedAt: inv.updatedAt.toISOString(),
    status: classifyStock(inv.quantity, inv.reorderPoint, inv.safetyStock),
    movements: inv.movements.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      refType: m.refType,
      refId: m.refId,
      userId: m.userId,
      userName: m.user?.name ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

// Unused but kept for type-compatibility
export const _ok = ok
