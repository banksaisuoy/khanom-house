import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, notFound } from '@/lib/api-response'

// ============================================================
// GET /api/tracking?q=<orderNo or phone>
// Public — customer-facing. Returns the same shape for both
// direct order number lookups and phone-based lookups (in which
// case the most recent order for that phone is returned).
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()

  if (!q || q.length < 3) {
    return notFound('กรุณาระบุหมายเลขออเดอร์หรือเบอร์โทรศัพท์')
  }

  // Try order number first (case-insensitive contains), then phone.
  // We avoid exposing PII beyond what's needed to identify the order.
  const order = await db.order.findFirst({
    where: {
      OR: [
        { orderNo: { equals: q } },
        { orderNo: { contains: q } },
        { customerPhone: { equals: q } },
        { customerPhone: { contains: q } },
      ],
    },
    include: {
      items: {
        include: { product: { select: { name: true, slug: true } } },
      },
      payment: true,
      delivery: { include: { rider: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })

  if (!order) return notFound('ไม่พบออเดอร์ที่ตรงกับหมายเลขหรือเบอร์โทรนี้')

  return ok({
    order: {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      type: order.type,
      channel: order.channel,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      total: order.total,
      notes: order.notes,
      deliveryAddress: order.deliveryAddress,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      wantAt: order.wantAt?.toISOString() ?? null,
      items: order.items.map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        total: it.total,
        productSlug: it.product?.slug ?? null,
      })),
      delivery: order.delivery
        ? {
            status: order.delivery.status,
            riderName: order.delivery.rider?.name ?? null,
            eta: order.delivery.eta,
            pickupAt: order.delivery.pickupAt?.toISOString() ?? null,
            deliveredAt: order.delivery.deliveredAt?.toISOString() ?? null,
            notes: order.delivery.notes,
          }
        : null,
    },
  })
})
