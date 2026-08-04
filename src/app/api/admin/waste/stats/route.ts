import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/waste/stats?range=7|14|30|month
// Returns: totalValue, totalQty, count, bySource[], trend[], topProducts[]
// ============================================================

function getBounds(range: string) {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  let start = new Date(now)
  if (range === '7') start.setDate(start.getDate() - 6)
  else if (range === '14') start.setDate(start.getDate() - 13)
  else if (range === '30') start.setDate(start.getDate() - 29)
  else if (range === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1)
  else start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'waste.read')
  const range = req.nextUrl.searchParams.get('range') ?? '30'
    const { start, end } = getBounds(range)

    // also fetch this month for KPI consistency
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const [logs, monthLogs, revenueOrders] = await Promise.all([
      db.wasteLog.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.wasteLog.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { value: true, source: true, quantity: true, productName: true, createdAt: true },
      }),
      db.order.findMany({
        where: { createdAt: { gte: monthStart }, status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] } },
        select: { total: true },
      }),
    ])

    const totalValue = monthLogs.reduce((s, w) => s + w.value, 0)
    const totalQty = monthLogs.reduce((s, w) => s + w.quantity, 0)
    const monthRevenue = revenueOrders.reduce((s, o) => s + o.total, 0)
    const wasteRatio = monthRevenue > 0 ? (totalValue / monthRevenue) * 100 : 0

    // by source (this month)
    const sourceMap: Record<string, { value: number; count: number; qty: number }> = {}
    for (const w of monthLogs) {
      const cur = sourceMap[w.source] ?? { value: 0, count: 0, qty: 0 }
      cur.value += w.value
      cur.count += 1
      cur.qty += w.quantity
      sourceMap[w.source] = cur
    }
    const bySource = Object.entries(sourceMap)
      .map(([source, v]) => ({ source, value: Math.round(v.value), count: v.count, qty: v.qty }))
      .sort((a, b) => b.value - a.value)
    const topSource = bySource[0]?.source ?? null

    // trend (last 14 days)
    const trendMap = new Map<string, { value: number; count: number }>()
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    cursor.setDate(cursor.getDate() - 13)
    for (let i = 0; i < 14; i++) {
      const k = dayKey(cursor)
      trendMap.set(k, { value: 0, count: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    for (const w of logs) {
      const k = dayKey(w.createdAt)
      const entry = trendMap.get(k)
      if (entry) {
        entry.value += w.value
        entry.count += 1
        trendMap.set(k, entry)
      }
    }
    const trend = Array.from(trendMap.entries()).map(([date, v]) => ({
      date,
      value: Math.round(v.value),
      count: v.count,
    }))

    // top products
    const prodMap = new Map<string, { name: string; value: number; count: number; qty: number }>()
    for (const w of monthLogs) {
      const cur = prodMap.get(w.productName) ?? { name: w.productName, value: 0, count: 0, qty: 0 }
      cur.value += w.value
      cur.count += 1
      cur.qty += w.quantity
      prodMap.set(w.productName, cur)
    }
    const topProducts = Array.from(prodMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    return ok({
      totalValue: Math.round(totalValue),
      totalQty: Math.round(totalQty),
      count: monthLogs.length,
      wasteRatio: Math.round(wasteRatio * 100) / 100,
      monthRevenue: Math.round(monthRevenue),
      topSource,
      bySource,
      trend,
      topProducts,
    })
})
