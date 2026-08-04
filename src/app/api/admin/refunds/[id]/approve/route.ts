import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, notFound, conflict, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission(req, 'orders.update')
  const { id } = await params

  const result = await db.$transaction(async (tx) => {
    const r = await tx.refund.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED', approvedBy: user.id },
    })
    if (r.count === 0) throw new Error('ไม่สามารถอนุมัติได้ (สถานะไม่ใช่ PENDING หรืออนุมัติแล้ว)')

    const refund = await tx.refund.findUnique({ where: { id } })
    if (!refund) throw new Error('ไม่พบคำขอคืนเงิน')

    // Reverse stock if FULL refund
    if (refund.type === 'FULL' && refund.orderId) {
      const order = await tx.order.findUnique({
        where: { id: refund.orderId },
        include: { items: true },
      })
      if (order) {
        for (const item of order.items) {
          const inv = await tx.inventory.findFirst({
            where: { productId: item.productId },
          })
          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantity: { increment: item.quantity } },
            })
            await tx.stockMovement.create({
              data: {
                inventoryId: inv.id,
                type: 'ADJUST',
                quantity: item.quantity,
                reason: `Refund ${refund.refundNo}`,
                refType: 'REFUND',
                refId: refund.id,
                userId: user.id,
              },
            })
          }
        }
      }
    }

    // If store credit, add to customer
    if (refund.refundMethod === 'STORE_CREDIT' && refund.orderId) {
      const order = await tx.order.findUnique({ where: { id: refund.orderId } })
      if (order?.customerId) {
        await tx.storeCredit.create({
          data: {
            customerId: order.customerId,
            amount: refund.refundAmount,
            balance: refund.refundAmount,
            type: 'REFUND',
            reason: `Refund ${refund.refundNo}`,
            userId: user.id,
          },
        })
      }
    }

    return refund
  })

  await logAudit({ userId: user.id, action: 'APPROVE', entity: 'Refund', entityId: id })
  return ok(result)
})
