import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { OrderDetailFull } from '@/components/admin/orders/order-detail-full'
import type { OrderStatus } from '@/lib/order-status'

export const dynamic = 'force-dynamic'

async function getOrder(id: string) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      delivery: { include: { rider: true } },
      customer: true,
    },
  })
  if (!order) return null
  return order
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getOrder(id)
  if (!order) notFound()

  // Synthesize timeline (same logic as API)
  const flow = ['PENDING', 'PAID', 'PREPARING', 'COOKING', 'PACKING', 'OUT_FOR_DELIVERY', 'COMPLETED']
  const cur = flow.indexOf(order.status)
  const base = order.createdAt.getTime()
  const timeline: { status: string; at: Date; label: string }[] = []
  for (let i = 0; i <= Math.max(cur, 0); i++) {
    const status = flow[i]
    if (status === 'PAID' && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL') {
      continue
    }
    timeline.push({ status, at: new Date(base + i * 8 * 60 * 1000), label: status })
  }
  if (order.status === 'CANCELLED') {
    timeline.push({ status: 'CANCELLED', at: order.updatedAt, label: 'CANCELLED' })
  }
  if (order.status === 'REFUNDED') {
    timeline.push({ status: 'REFUNDED', at: order.updatedAt, label: 'REFUNDED' })
  }

  const dto = {
    id: order.id,
    orderNo: order.orderNo,
    channel: order.channel,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    customerId: order.customerId,
    customerTier: order.customer?.tier ?? null,
    customerPoints: order.customer?.points ?? null,
    type: order.type,
    status: order.status as OrderStatus,
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
    timeline: timeline.map((t) => ({ status: t.status, at: t.at.toISOString(), label: t.label })),
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        ← กลับไปรายการคำสั่งซื้อ
      </Link>
      <OrderDetailFull order={dto} />
    </div>
  )
}
