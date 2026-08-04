import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError, ConflictError } from '@/lib/api-response'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

// ============================================================
// POST /api/admin/purchase-orders/[id]/receive
//   Body: { items: [{ id, receivedQty }] }
//   - Marks each PO item's receivedQty (incremental — adds to existing).
//   - For items with a productId, increases inventory stock IN at the
//     PO's branchId (defaults to user's branchId) and creates a
//     StockMovement with refType='PO'.
//   - Recomputes PO status: PARTIAL (some items < qty), RECEIVED (all
//     items fully received), leaves unchanged if no progress made.
//   - Updates po.receivedTotal + po.receivedAt (when fully received).
//   Permission: inventory.adjust (receive-goods is a stock-in op)
// ============================================================
const receiveSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        receivedQty: z.number().finite().positive().max(1000000),
      })
    )
    .min(1, 'ต้องมีอย่างน้อย 1 รายการที่รับเข้า'),
})

export const POST = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'inventory.adjust')
  const { id } = await params
  const body = receiveSchema.parse(await req.json())

  const result = await db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!po) throw new NotFoundError('ไม่พบใบสั่งซื้อ')
    if (po.status === 'CANCELLED') throw new ConflictError('PO ถูกยกเลิกแล้ว')
    if (po.status === 'RECEIVED') throw new ConflictError('PO รับเข้าครบแล้ว')

    // Resolve target branch — PO.branchId → user.branchId → first branch
    let branchId = po.branchId
    if (!branchId) branchId = user.branchId
    if (!branchId) {
      const anyBranch = await tx.branch.findFirst({ where: { isActive: true } })
      if (!anyBranch) throw new ConflictError('ไม่พบสาขาสำหรับรับเข้า')
      branchId = anyBranch.id
    }
    requireBranchAccess(user, branchId)

    const updates = new Map(body.items.map((u) => [u.id, u.receivedQty]))
    const itemIds = Array.from(updates.keys())
    const targetItems = po.items.filter((it) => itemIds.includes(it.id))
    if (targetItems.length !== updates.size) {
      throw new NotFoundError('บางรายการไม่อยู่ใน PO นี้')
    }

    let receivedTotalDelta = 0
    const movementsCreated: { itemName: string; qty: number; unit: string }[] = []

    for (const it of targetItems) {
      const addQty = updates.get(it.id)!
      // Cap at remaining qty
      const remaining = it.quantity - it.receivedQty
      const toAdd = Math.min(addQty, remaining)
      if (toAdd <= 0) continue

      const newReceivedQty = it.receivedQty + toAdd
      await tx.purchaseOrderItem.update({
        where: { id: it.id },
        data: { receivedQty: newReceivedQty },
      })

      receivedTotalDelta += toAdd * it.unitPrice

      // If linked to a product, increment inventory and log movement
      if (it.productId) {
        let inv = await tx.inventory.findFirst({
          where: { productId: it.productId, branchId },
        })
        if (inv) {
          inv = await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { increment: toAdd } },
          })
        } else {
          const product = await tx.product.findUnique({ where: { id: it.productId } })
          inv = await tx.inventory.create({
            data: {
              productId: it.productId,
              branchId,
              type: 'RAW',
              quantity: toAdd,
              unit: it.unit,
            },
          })
          void product // (kept for clarity — used to validate product exists in future)
        }

        await tx.stockMovement.create({
          data: {
            inventoryId: inv.id,
            type: 'IN',
            quantity: toAdd,
            reason: `รับเข้าจาก PO ${po.poNo}: ${it.productName}`,
            refType: 'PO',
            refId: po.id,
            userId: user.id,
          },
        })
        movementsCreated.push({ itemName: it.productName, qty: toAdd, unit: it.unit })
      } else {
        // No product link — still record a movement? Skip (no inventory row).
        movementsCreated.push({ itemName: it.productName, qty: toAdd, unit: it.unit })
      }
    }

    // Recompute PO status
    const refreshedItems = await tx.purchaseOrderItem.findMany({
      where: { poId: po.id },
      select: { quantity: true, receivedQty: true },
    })
    const allComplete = refreshedItems.every((it) => it.receivedQty >= it.quantity)
    const anyReceived = refreshedItems.some((it) => it.receivedQty > 0)
    let newStatus = po.status
    if (allComplete) newStatus = 'RECEIVED'
    else if (anyReceived && po.status === 'SENT') newStatus = 'PARTIAL'
    // else keep current status

    const newReceivedTotal = Number((po.receivedTotal + receivedTotalDelta).toFixed(2))
    const patchData: Record<string, unknown> = {
      receivedTotal: newReceivedTotal,
    }
    if (newStatus !== po.status) patchData.status = newStatus
    if (newStatus === 'RECEIVED' && !po.receivedAt) {
      patchData.receivedAt = new Date()
    }

    await tx.purchaseOrder.update({ where: { id: po.id }, data: patchData })

    return {
      poId: po.id,
      poNo: po.poNo,
      newStatus,
      newReceivedTotal,
      movements: movementsCreated,
    }
  })

  await logAudit({
    userId: user.id,
    action: 'STATUS_CHANGE',
    entity: 'PurchaseOrder',
    entityId: id,
    newValue: {
      poNo: result.poNo,
      newStatus: result.newStatus,
      receivedTotal: result.newReceivedTotal,
      movementsCount: result.movements.length,
    },
  })

  return ok(result)
})
