import { db } from '@/lib/db'
import { OrdersClient, type OrderListDTO } from '@/components/admin/orders/orders-client'

export const dynamic = 'force-dynamic'

async function fetchOrders(): Promise<OrderListDTO[]> {
  const rows = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { items: { select: { quantity: true } } },
  })
  return rows.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    channel: o.channel,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    type: o.type,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
    createdAt: o.createdAt.toISOString(),
    wantAt: o.wantAt?.toISOString() ?? null,
  }))
}

export default async function OrdersPage() {
  const initialOrders = await fetchOrders()
  return <OrdersClient initialOrders={initialOrders} />
}
