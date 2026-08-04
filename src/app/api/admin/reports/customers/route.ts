import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/reports/customers?range=7|30|90
// Returns: totals, newVsReturning[], retention, topCustomers[], tierDist[]
// ============================================================

const COMPLETED = ['COMPLETED', 'DELIVERED', 'PAID']

function getStart(range: string) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  if (range === '7') d.setDate(d.getDate() - 6)
  else if (range === '90') d.setDate(d.getDate() - 89)
  else d.setDate(d.getDate() - 29)
  return d
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const GET = handle(async (req: Request) => {
  await requirePermission(req, 'reports.read')
  const sp = new URL(req.url).searchParams
    const range = sp.get('range') ?? '30'
    const start = getStart(range)

    const [customers, orders] = await Promise.all([
      db.customer.findMany({
        take: 1000,
        select: {
          id: true, name: true, phone: true, tier: true, points: true, totalSpent: true, visitCount: true, createdAt: true,
        },
      }),
      db.order.findMany({
        where: { createdAt: { gte: start }, status: { in: COMPLETED } },
        take: 5000,
        select: { id: true, customerId: true, customerName: true, customerPhone: true, total: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const customerFirstOrderDate = new Map<string, Date>()
    for (const o of orders) {
      if (!o.customerId) continue
      const cur = customerFirstOrderDate.get(o.customerId)
      if (!cur || o.createdAt < cur) customerFirstOrderDate.set(o.customerId, o.createdAt)
    }

    // new vs returning per day
    const nvrMap = new Map<string, { new: number; returning: number }>()
    for (const o of orders) {
      const k = dayKey(o.createdAt)
      const e = nvrMap.get(k) ?? { new: 0, returning: 0 }
      const first = o.customerId ? customerFirstOrderDate.get(o.customerId) : null
      const isNew = first ? first.getTime() === o.createdAt.getTime() : false
      if (isNew) e.new += 1
      else e.returning += 1
      nvrMap.set(k, e)
    }
    const newVsReturning = Array.from(nvrMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))

    const totalNew = newVsReturning.reduce((s, d) => s + d.new, 0)
    const totalReturning = newVsReturning.reduce((s, d) => s + d.returning, 0)
    const repeatRate = totalNew + totalReturning > 0 ? (totalReturning / (totalNew + totalReturning)) * 100 : 0

    // retention (rough: customers with >1 order in range / total active)
    const orderCountByCust = new Map<string, number>()
    for (const o of orders) {
      if (!o.customerId) continue
      orderCountByCust.set(o.customerId, (orderCountByCust.get(o.customerId) ?? 0) + 1)
    }
    const activeCustomers = orderCountByCust.size
    const repeatCustomers = Array.from(orderCountByCust.values()).filter((n) => n > 1).length
    const retention = activeCustomers > 0 ? (repeatCustomers / activeCustomers) * 100 : 0

    // top customers by spend (all time)
    const topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c) => ({ id: c.id, name: c.name, tier: c.tier, totalSpent: Math.round(c.totalSpent), visitCount: c.visitCount, points: c.points }))

    // tier distribution
    const tierMap: Record<string, number> = { BRONZE: 0, SILVER: 0, GOLD: 0, VIP: 0 }
    for (const c of customers) {
      if (tierMap[c.tier] !== undefined) tierMap[c.tier]++
    }
    const tierDist = Object.entries(tierMap).map(([tier, count]) => ({ tier, count }))

    return ok({
      totals: {
        totalCustomers: customers.length,
        activeCustomers,
        newCustomers: totalNew,
        returningCustomers: totalReturning,
        repeatRate: Math.round(repeatRate * 100) / 100,
        retention: Math.round(retention * 100) / 100,
      },
      newVsReturning,
      topCustomers,
      tierDist,
    })
})
