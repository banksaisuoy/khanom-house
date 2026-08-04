import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/reports/sales?range=7|30|90|custom&from=&to=&groupBy=day|week|month
// Returns: totalRevenue, totalOrders, avgBasket, trend[], byChannel[], byType[], peakHours[]
// ============================================================

const COMPLETED = ['COMPLETED', 'DELIVERED', 'PAID']

function getBounds(range: string, from?: string, to?: string) {
  const now = new Date()
  const end = new Date(now); end.setHours(23, 59, 59, 999)
  let start = new Date(now); start.setHours(0, 0, 0, 0)
  if (range === '7') start.setDate(start.getDate() - 6)
  else if (range === '30') start.setDate(start.getDate() - 29)
  else if (range === '90') start.setDate(start.getDate() - 89)
  else if (range === 'custom') {
    if (from) start = new Date(from)
    if (to) end.setTime(new Date(to + 'T23:59:59.999').getTime())
  }
  return { start, end }
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekKey(d: Date): string {
  const monday = new Date(d)
  const day = d.getDay() || 7
  if (day !== 1) monday.setHours(-24 * (day - 1))
  return dayKey(monday)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'reports.read')
  const sp = req.nextUrl.searchParams
    const range = sp.get('range') ?? '30'
    const groupBy = sp.get('groupBy') ?? 'day'
    const from = sp.get('from') || undefined
    const to = sp.get('to') || undefined

    const { start, end } = getBounds(range, from, to)

    const orders = await db.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      take: 5000,
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    })

    const completedOrders = orders.filter((o) => COMPLETED.includes(o.status))
    const totalRevenue = completedOrders.reduce((s, o) => s + o.total, 0)
    const totalOrders = orders.length
    const avgBasket = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Trend
    const keyFn = groupBy === 'week' ? weekKey : groupBy === 'month' ? monthKey : dayKey
    const trendMap = new Map<string, { revenue: number; orders: number; profit: number }>()
    for (const o of orders) {
      const k = keyFn(o.createdAt)
      const e = trendMap.get(k) ?? { revenue: 0, orders: 0, profit: 0 }
      if (COMPLETED.includes(o.status)) {
        e.revenue += o.total
        const cost = o.items.reduce((s, it) => s + (it.total - it.total * 0.6), 0) // estimate
        e.profit += o.total - cost
      }
      e.orders += 1
      trendMap.set(k, e)
    }
    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, revenue: Math.round(v.revenue), orders: v.orders, profit: Math.round(v.profit) }))

    // By channel
    const channelMap = new Map<string, { revenue: number; count: number }>()
    for (const o of completedOrders) {
      const cur = channelMap.get(o.channel) ?? { revenue: 0, count: 0 }
      cur.revenue += o.total
      cur.count += 1
      channelMap.set(o.channel, cur)
    }
    const byChannel = Array.from(channelMap.entries())
      .map(([channel, v]) => ({ channel, revenue: Math.round(v.revenue), count: v.count }))
      .sort((a, b) => b.revenue - a.revenue)

    // By order type
    const typeMap = new Map<string, { revenue: number; count: number }>()
    for (const o of completedOrders) {
      const cur = typeMap.get(o.type) ?? { revenue: 0, count: 0 }
      cur.revenue += o.total
      cur.count += 1
      typeMap.set(o.type, cur)
    }
    const byType = Array.from(typeMap.entries())
      .map(([type, v]) => ({ type, revenue: Math.round(v.revenue), count: v.count }))
      .sort((a, b) => b.revenue - a.revenue)

    // Peak hours heatmap (7×24)
    const peak: { day: number; hour: number; count: number }[] = []
    const peakArr = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (const o of orders) {
      const d = new Date(o.createdAt)
      peakArr[d.getDay()][d.getHours()] += 1
    }
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        peak.push({ day, hour, count: peakArr[day][hour] })
      }
    }

    return ok({
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      avgBasket: Math.round(avgBasket),
      trend,
      byChannel,
      byType,
      peakHours: peak,
      range: { start: start.toISOString(), end: end.toISOString() },
    })
})
