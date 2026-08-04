import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, conflict, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission(req, 'inventory.adjust')
  const { id } = await params
  const result = await db.$transaction(async (tx) => {
    const r = await tx.stockTransfer.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'IN_TRANSIT', shippedAt: new Date() } })
    if (r.count === 0) throw new Error('ไม่สามารถจัดส่งได้')
    const transfer = await tx.stockTransfer.findUnique({ where: { id } })
    if (!transfer) throw new Error('ไม่พบใบโอน')
    const items = JSON.parse(transfer.items) as Array<{ productId: string; quantity: number }>
    for (const item of items) {
      const inv = await tx.inventory.findFirst({ where: { productId: item.productId, branchId: transfer.fromBranchId } })
      // PHASE 4 FIX (AUDIT-008): Previously `if (inv)` silently skipped items
      // with no inventory row — transfer marked IN_TRANSIT but stock wasn't
      // touched, and the receiving branch would create stock from nothing.
      // Now: throw if source inventory doesn't exist.
      if (!inv) {
        throw new Error(`ไม่พบสต็อกต้นทางสำหรับสินค้า (productId: ${item.productId})`)
      }
      const r2 = await tx.inventory.updateMany({ where: { id: inv.id, quantity: { gte: item.quantity } }, data: { quantity: { decrement: item.quantity } } })
      if (r2.count === 0) throw new Error(`สต็อกไม่เพียงพอสำหรับสินค้า (productId: ${item.productId})`)
      await tx.stockMovement.create({ data: { inventoryId: inv.id, type: 'TRANSFER', quantity: item.quantity, reason: `Transfer out ${transfer.transferNo}`, refType: 'TRANSFER', refId: transfer.id, userId: user.id } })
    }
    return transfer
  })
  return ok(result)
})
