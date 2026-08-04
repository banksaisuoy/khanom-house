import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission(req, 'inventory.adjust')
  const { id } = await params
  const result = await db.$transaction(async (tx) => {
    const r = await tx.stockTransfer.updateMany({ where: { id, status: 'IN_TRANSIT' }, data: { status: 'RECEIVED', receivedAt: new Date() } })
    if (r.count === 0) throw new Error('ไม่สามารถรับได้')
    const transfer = await tx.stockTransfer.findUnique({ where: { id } })
    if (!transfer) throw new Error('ไม่พบใบโอน')
    const items = JSON.parse(transfer.items) as Array<{ productId: string; productName: string; quantity: number; unit: string }>
    for (const item of items) {
      let inv = await tx.inventory.findFirst({ where: { productId: item.productId, branchId: transfer.toBranchId } })
      if (!inv) {
        inv = await tx.inventory.create({ data: { productId: item.productId, branchId: transfer.toBranchId, type: 'FINISHED', quantity: 0, unit: item.unit } })
      }
      await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { increment: item.quantity } } })
      await tx.stockMovement.create({ data: { inventoryId: inv.id, type: 'TRANSFER', quantity: item.quantity, reason: `Transfer in ${transfer.transferNo}`, refType: 'TRANSFER', refId: transfer.id, userId: user.id } })
    }
    return transfer
  })
  return ok(result)
})
