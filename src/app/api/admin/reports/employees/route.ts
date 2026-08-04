import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'reports.read')
  const sp = new URL(req.url).searchParams
  const days = parseInt(sp.get('days') || '30')
  const from = new Date(Date.now() - days * 86400000)

  // Get sales by cashier (POS bills)
  const posSales = await db.posBill.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: from }, status: 'COMPLETED' },
    _sum: { total: true },
    _count: true,
  })

  const users = await db.user.findMany({
    where: { id: { in: posSales.map(s => s.userId) } },
    select: { id: true, name: true, email: true, role: true },
  })

  const employees = posSales.map(s => {
    const u = users.find(x => x.id === s.userId)
    return {
      userId: s.userId,
      name: u?.name || 'ไม่ทราบ',
      email: u?.email,
      role: u?.role,
      totalSales: s._sum.total || 0,
      billCount: s._count,
      avgBasket: s._count > 0 ? (s._sum.total || 0) / s._count : 0,
    }
  }).sort((a, b) => b.totalSales - a.totalSales)

  return ok({ employees, period: { from: from.toISOString(), days } })
})
