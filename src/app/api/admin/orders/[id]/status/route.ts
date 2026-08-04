import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError, ConflictError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

// ============================================================
// PATCH /api/admin/orders/[id]/status
// AUDIT FIX H-6: CANCELLED doesn't reverse stock + customer points.
// Fix: on CANCELLED, inside tx: reverse each OrderItem inventory,
//      create StockMovement ADJUST, decrement customer points if
//      awarded (LoyaltyLog EXPIRE). updateMany guard prevents double-cancel.
// Permission: orders.update
// ============================================================
const statusSchema = z.object({
  status: z.enum([
    'PENDING', 'PAID', 'PREPARING', 'COOKING', 'PACKING',
    'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REFUNDED',
  ]),
  note: z.string().max(500).optional(),
})

export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'orders.update')
    const { id } = await ctx.params
    const body = statusSchema.parse(await req.json())

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    })
    if (!order) throw new NotFoundError('ไม่พบคำสั่งซื้อ')

    if (body.status === 'CANCELLED') {
      // Atomic guard: prevent double-cancel
      await db.$transaction(async (tx) => {
        const r = await tx.order.updateMany({
          where: { id, status: { not: 'CANCELLED' } },
          data: { status: 'CANCELLED' },
        })
        if (r.count === 0) {
          throw new ConflictError('คำสั่งซื้อนี้ถูกยกเลิกแล้ว')
        }

        // Reverse each OrderItem's inventory
        const branch = await tx.branch.findFirst({ where: { isMain: true } })
        if (branch) {
          for (const it of order.items) {
            const inv = await tx.inventory.findFirst({
              where: { productId: it.productId, branchId: branch.id },
            })
            if (inv) {
              await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: { increment: it.quantity } },
              })
              await tx.stockMovement.create({
                data: {
                  inventoryId: inv.id,
                  type: 'ADJUST',
                  quantity: it.quantity,
                  reason: `Cancel ${order.orderNo}`,
                  refType: 'ORDER',
                  refId: order.id,
                  userId: user.id,
                },
              })
            }
            // Reverse soldCount
            await tx.product.update({
              where: { id: it.productId },
              data: { soldCount: { decrement: it.quantity } },
            })
          }
        }

        // Reverse loyalty points if awarded
        if (order.customerId) {
          const earned = await tx.loyaltyLog.findFirst({
            where: { orderId: order.id, type: 'EARN' },
          })
          if (earned && earned.points > 0) {
            const r2 = await tx.customer.updateMany({
              where: { id: order.customerId, points: { gte: earned.points } },
              data: { points: { decrement: earned.points } },
            })
            if (r2.count > 0) {
              await tx.loyaltyLog.create({
                data: {
                  customerId: order.customerId,
                  type: 'EXPIRE',
                  points: earned.points,
                  reason: `Cancel ${order.orderNo}`,
                  orderId: order.id,
                },
              })
            }
          }
        }
      })
    } else if (body.status === 'REFUNDED') {
      await db.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id, status: { not: 'REFUNDED' } },
          data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
        })
        await tx.payment.updateMany({
          where: { orderId: id },
          data: { status: 'REFUNDED' },
        })
      })
    } else {
      const data: Record<string, unknown> = { status: body.status }
      if (body.status === 'COMPLETED' && order.paymentStatus !== 'PAID') {
        data.paymentStatus = 'PAID'
      }
      await db.order.update({ where: { id }, data })
    }

    const updated = await db.order.findUnique({ where: { id } })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Order',
      entityId: id,
      oldValue: order.status,
      newValue: body.status,
    })

    return ok({
      ok: true,
      status: updated?.status,
      paymentStatus: updated?.paymentStatus,
    })
  }
)
