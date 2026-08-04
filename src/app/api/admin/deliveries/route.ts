import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/deliveries?status=&riderId=
// Permission: deliveries.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'deliveries.read')

  const sp = req.nextUrl.searchParams
  const status = sp.get('status')

  const where: Record<string, unknown> = {}
  if (status && status !== 'all') where.status = status

  const deliveries = await db.delivery.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      order: { select: { id: true, orderNo: true, customerName: true, customerPhone: true, deliveryAddress: true, total: true, status: true, createdAt: true, wantAt: true, branchId: true } },
      rider: { select: { id: true, name: true, role: true, avatarUrl: true, phone: true } },
    },
  })

  return ok({
    deliveries: deliveries.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      pickupAt: d.pickupAt?.toISOString() ?? null,
      deliveredAt: d.deliveredAt?.toISOString() ?? null,
      order: d.order ? {
        ...d.order,
        createdAt: d.order.createdAt.toISOString(),
        wantAt: d.order.wantAt?.toISOString() ?? null,
        branch: null,
      } : null,
    })),
  })
})
