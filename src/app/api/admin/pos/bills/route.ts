import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/pos/bills?shiftId=&limit=
// Permission: pos.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'pos.read')

  const sp = req.nextUrl.searchParams
  const shiftId = sp.get('shiftId') ?? undefined
  const limit = Math.min(200, Math.max(10, Number(sp.get('limit') ?? '50')))

  const where: Record<string, unknown> = {}
  if (shiftId) where.shiftId = shiftId

  const bills = await db.posBill.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      items: { select: { name: true, quantity: true, total: true } },
      user: { select: { name: true } },
    },
  })

  return ok({
    items: bills.map((b) => ({
      id: b.id,
      billNo: b.billNo,
      subtotal: b.subtotal,
      discount: b.discount,
      total: b.total,
      paymentMethod: b.paymentMethod,
      receivedAmount: b.receivedAmount,
      change: b.change,
      status: b.status,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      cashierName: b.user?.name,
      itemCount: b.items.length,
      items: b.items,
    })),
  })
})
