import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/reports/finance?range=7|30|90
// Returns: P&L summary, expense breakdown, VAT, margin trend
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

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'reports.read')
  const range = req.nextUrl.searchParams.get('range') ?? '30'
    const start = getStart(range)

    // AUDIT (P2-2): merged the separate `items` query into `orders.include.items`
    // (was a duplicate fetch over the same OrderItem rows). Added take caps.
    const [orders, wasteLogs] = await Promise.all([
      db.order.findMany({
        where: { createdAt: { gte: start } },
        take: 5000,
        include: {
          items: {
            select: {
              total: true,
              quantity: true,
              product: { select: { costPrice: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.wasteLog.findMany({
        where: { createdAt: { gte: start } },
        take: 1000,
        select: { value: true, quantity: true, source: true, createdAt: true },
      }),
    ])

    const completedOrders = orders.filter((o) => COMPLETED.includes(o.status))
    const revenue = completedOrders.reduce((s, o) => s + o.total, 0)
    // cogs now derived from orders.items (merged include) — same value, fewer queries.
    const cogs = completedOrders.reduce(
      (s, o) => s + o.items.reduce((s2, it) => s2 + (it.product?.costPrice ?? 0) * it.quantity, 0),
      0
    )
    const grossProfit = revenue - cogs

    // Expenses (mock — derived from revenue ratios + actual waste)
    const wasteValue = wasteLogs.reduce((s, w) => s + w.value, 0)
    const expenseBreakdown = [
      { label: 'วัตถุดิบ', key: 'ingredient', value: Math.round(cogs) },
      { label: 'ค่าน้ำ/ไฟ', key: 'utility', value: Math.round(revenue * 0.04) },
      { label: 'การตลาด', key: 'marketing', value: Math.round(revenue * 0.05) },
      { label: 'เงินเดือน', key: 'salary', value: Math.round(revenue * 0.18) },
      { label: 'ของเสีย', key: 'waste', value: Math.round(wasteValue) },
      { label: 'อื่นๆ', key: 'other', value: Math.round(revenue * 0.03) },
    ]
    const totalExpenses = expenseBreakdown.reduce((s, e) => s + e.value, 0)
    const netProfit = grossProfit - (totalExpenses - cogs) // avoid double-counting COGS
    const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0

    // VAT (output 7% of taxable revenue; input tax 7% of expenses-with-vat)
    const vatOutput = revenue * 0.07
    const vatInput = (expenseBreakdown.find((e) => e.key === 'utility')!.value + expenseBreakdown.find((e) => e.key === 'marketing')!.value) * 0.07
    const vatNet = vatOutput - vatInput

    // margin trend by day
    const trendMap = new Map<string, { revenue: number; cogs: number; profit: number; waste: number }>()
    for (const o of completedOrders) {
      const k = dayKey(o.createdAt)
      const e = trendMap.get(k) ?? { revenue: 0, cogs: 0, profit: 0, waste: 0 }
      e.revenue += o.total
      e.cogs += o.items.reduce((s, it) => s + (it.total - it.total * 0.6), 0) // est cost
      e.profit += o.total - o.items.reduce((s, it) => s + (it.total - it.total * 0.6), 0)
      trendMap.set(k, e)
    }
    for (const w of wasteLogs) {
      const k = dayKey(w.createdAt)
      const e = trendMap.get(k) ?? { revenue: 0, cogs: 0, profit: 0, waste: 0 }
      e.waste += w.value
      trendMap.set(k, e)
    }
    const marginTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        revenue: Math.round(v.revenue),
        cogs: Math.round(v.cogs),
        profit: Math.round(v.profit),
        waste: Math.round(v.waste),
        margin: v.revenue > 0 ? Math.round(((v.revenue - v.cogs - v.waste) / v.revenue) * 100) : 0,
      }))

    return ok({
      revenue: Math.round(revenue),
      cogs: Math.round(cogs),
      grossProfit: Math.round(grossProfit),
      grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
      expenses: expenseBreakdown,
      totalExpenses: Math.round(totalExpenses - cogs), // operating expenses (excl COGS)
      netProfit: Math.round(netProfit),
      netMargin: Math.round(marginPct * 100) / 100,
      vat: {
        output: Math.round(vatOutput),
        input: Math.round(vatInput),
        net: Math.round(vatNet),
      },
      wasteValue: Math.round(wasteValue),
      marginTrend,
    })
})
