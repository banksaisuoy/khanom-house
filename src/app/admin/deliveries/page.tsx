import { db } from '@/lib/db'
import { DeliveriesClient, type DeliveryRow } from '@/components/admin/deliveries/deliveries-client'

export const dynamic = 'force-dynamic'

// Auto-create Delivery rows for completed orders that have no delivery.
// Spec: if fewer than 5 deliveries, auto-create for recent COMPLETED orders
// where type=DELIVERY (or channel != POS) without a delivery row.
// New rows use status=DELIVERED, deliveredAt=order.updatedAt, eta=30.
async function ensureDeliveries() {
  try {
    const existing = await db.delivery.count()
    if (existing >= 5) return

    // Find candidates: completed orders without a delivery row, prefer DELIVERY type / non-POS channel
    const candidates = await db.order.findMany({
      where: {
        status: 'COMPLETED',
        delivery: null,
        OR: [
          { type: { in: ['DELIVERY', 'CATERING', 'PREORDER'] } },
          { channel: { not: 'POS' } },
        ],
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    })

    if (candidates.length === 0) {
      // Fallback: any completed order without delivery
      const fallback = await db.order.findMany({
        where: { status: 'COMPLETED', delivery: null },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      })
      candidates.push(...fallback)
    }

    if (candidates.length === 0) return

    // Insert one-by-one (SQLite lacks skipDuplicates in createMany)
    for (const o of candidates) {
      try {
        await db.delivery.create({
          data: {
            orderId: o.id,
            status: 'DELIVERED',
            deliveredAt: o.updatedAt,
            pickupAt: new Date(o.updatedAt.getTime() - 30 * 60000),
            eta: 30,
          },
        })
      } catch {
        // orderId is unique — skip if it already exists
      }
    }
  } catch (e) {
    console.error('[deliveries page] ensureDeliveries failed', e)
  }
}

export default async function DeliveriesPage() {
  await ensureDeliveries()

  const [deliveries, branches] = await Promise.all([
    db.delivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        order: true,
        rider: { select: { id: true, name: true, role: true, avatarUrl: true, phone: true } },
      },
    }),
    db.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, address: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const branchMap = new Map(branches.map((b) => [b.id, b]))

  const initial: DeliveryRow[] = deliveries.map((d) => ({
    id: d.id,
    orderId: d.orderId,
    status: d.status,
    pickupAt: d.pickupAt?.toISOString() ?? null,
    deliveredAt: d.deliveredAt?.toISOString() ?? null,
    podSignature: d.podSignature,
    podPhotoUrl: d.podPhotoUrl,
    eta: d.eta,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
    rider: d.rider
      ? {
          id: d.rider.id,
          name: d.rider.name,
          role: d.rider.role,
          avatarUrl: d.rider.avatarUrl,
          phone: d.rider.phone,
        }
      : null,
    order: d.order
      ? {
          id: d.order.id,
          orderNo: d.order.orderNo,
          customerName: d.order.customerName,
          customerPhone: d.order.customerPhone,
          deliveryAddress: d.order.deliveryAddress,
          total: d.order.total,
          status: d.order.status,
          createdAt: d.order.createdAt.toISOString(),
          wantAt: d.order.wantAt?.toISOString() ?? null,
          branchId: d.order.branchId,
          branch: d.order.branchId
            ? (() => {
                const b = branchMap.get(d.order!.branchId!)
                return b ? { name: b.name, address: b.address ?? null } : null
              })()
            : null,
        }
      : null,
  }))

  return <DeliveriesClient initialDeliveries={initial} branches={branches} />
}
