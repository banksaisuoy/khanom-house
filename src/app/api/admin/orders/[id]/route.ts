import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// GET /api/admin/orders/[id] — full detail
// Permission: orders.read
// ============================================================
export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requirePermission(req, 'orders.read')
    const { id } = await ctx.params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        delivery: { include: { rider: true } },
        customer: true,
      },
    })
    if (!order) throw new NotFoundError('ไม่พบคำสั่งซื้อ')

    const flow = ['PENDING', 'PAID', 'PREPARING', 'COOKING', 'PACKING', 'OUT_FOR_DELIVERY', 'COMPLETED']
    const cur = flow.indexOf(order.status)
    const timeline: { status: string; at: string; label: string }[] = []
    const base = order.createdAt.getTime()
    for (let i = 0; i <= Math.max(cur, 0); i++) {
      const status = flow[i]
      if (status === 'PAID' && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL') {
        continue
      }
      const at = new Date(base + i * 8 * 60 * 1000)
      timeline.push({ status, at: at.toISOString(), label: status })
    }
    if (order.status === 'CANCELLED') {
      timeline.push({ status: 'CANCELLED', at: order.updatedAt.toISOString(), label: 'CANCELLED' })
    }
    if (order.status === 'REFUNDED') {
      timeline.push({ status: 'REFUNDED', at: order.updatedAt.toISOString(), label: 'REFUNDED' })
    }

    return ok({
      id: order.id,
      orderNo: order.orderNo,
      channel: order.channel,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      customerId: order.customerId,
      customerTier: order.customer?.tier,
      customerPoints: order.customer?.points,
      type: order.type,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      deposit: order.deposit,
      notes: order.notes,
      deliveryAddress: order.deliveryAddress,
      wantAt: order.wantAt?.toISOString() ?? null,
      branchId: order.branchId,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        total: it.total,
        notes: it.notes,
      })),
      payment: order.payment
        ? {
            id: order.payment.id,
            method: order.payment.method,
            amount: order.payment.amount,
            refCode: order.payment.refCode,
            status: order.payment.status,
            paidAt: order.payment.paidAt.toISOString(),
          }
        : null,
      delivery: order.delivery
        ? {
            id: order.delivery.id,
            status: order.delivery.status,
            riderName: order.delivery.rider?.name ?? null,
            pickupAt: order.delivery.pickupAt?.toISOString() ?? null,
            deliveredAt: order.delivery.deliveredAt?.toISOString() ?? null,
            eta: order.delivery.eta,
            notes: order.delivery.notes,
          }
        : null,
      timeline,
    })
  }
)

// ============================================================
// PATCH /api/admin/orders/[id] — update safe fields
// AUDIT FIX H-7: `paymentStatus` removed from allowlist — payment
// transitions must go through `/status` or a dedicated payment endpoint.
// Permission: orders.update
// ============================================================
export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'orders.update')
    const { id } = await ctx.params
    const body = (await req.json()) as Record<string, unknown>
    // NOTE: `paymentStatus` intentionally excluded — see H-7 above.
    const allowed = ['notes', 'deliveryAddress', 'paymentMethod', 'customerName', 'customerPhone', 'customerEmail', 'wantAt']
    const data: Record<string, unknown> = {}
    for (const k of allowed) {
      if (k in body) {
        if (k === 'wantAt' && body[k]) {
          data[k] = new Date(body[k] as string)
        } else {
          data[k] = body[k]
        }
      }
    }
    const updated = await db.order.update({ where: { id }, data })
    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Order',
      entityId: id,
      newValue: { fields: Object.keys(data) },
    })
    return ok({ ok: true, updatedAt: updated.updatedAt.toISOString() })
  }
)
