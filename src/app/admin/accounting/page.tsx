import { db } from '@/lib/db'
import { AccountingClient, type FinanceData } from '@/components/admin/accounting/accounting-client'

export const dynamic = 'force-dynamic'

const COMPLETED = ['COMPLETED', 'DELIVERED', 'PAID']

export default async function AccountingPage() {
  // Pre-fetch last-30d finance summary to seed the client (no loading flash)
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 29)

  const [orders, items, wasteLogs] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: start } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.orderItem.findMany({
      where: { order: { createdAt: { gte: start }, status: { in: COMPLETED } } },
      select: { productId: true, quantity: true, total: true, product: { select: { costPrice: true } } },
    }),
    db.wasteLog.findMany({
      where: { createdAt: { gte: start } },
      select: { value: true, quantity: true, source: true, createdAt: true },
    }),
  ])

  const completedOrders = orders.filter((o) => COMPLETED.includes(o.status))
  const revenue = completedOrders.reduce((s, o) => s + o.total, 0)
  const cogs = items.reduce((s, it) => s + (it.product?.costPrice ?? 0) * it.quantity, 0)
  const grossProfit = revenue - cogs
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
  const netProfit = grossProfit - (totalExpenses - cogs)

  const finance: FinanceData = {
    revenue: Math.round(revenue),
    cogs: Math.round(cogs),
    grossProfit: Math.round(grossProfit),
    grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
    expenses: expenseBreakdown,
    totalExpenses: Math.round(totalExpenses - cogs),
    netProfit: Math.round(netProfit),
    netMargin: revenue > 0 ? Math.round((netProfit / revenue) * 100 * 100) / 100 : 0,
    vat: {
      output: Math.round(revenue * 0.07),
      input: Math.round((expenseBreakdown[1].value + expenseBreakdown[2].value) * 0.07),
      net: Math.round(revenue * 0.07 - (expenseBreakdown[1].value + expenseBreakdown[2].value) * 0.07),
    },
    wasteValue: Math.round(wasteValue),
    marginTrend: [],
  }

  return <AccountingClient initialFinance={finance} />
}
