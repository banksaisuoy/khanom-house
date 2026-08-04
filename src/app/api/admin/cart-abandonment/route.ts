import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')
  // In a real system, we'd track cart events. For now, return pending orders that are unpaid > 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const abandoned = await db.order.findMany({
    where: {
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      createdAt: { lt: oneHourAgo },
    },
    select: { id: true, orderNo: true, customerName: true, customerPhone: true, total: true, createdAt: true, channel: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const totalValue = abandoned.reduce((s, o) => s + o.total, 0)
  return ok({ abandoned, count: abandoned.length, totalValue })
})
