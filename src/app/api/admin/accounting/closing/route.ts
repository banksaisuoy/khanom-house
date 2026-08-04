import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/accounting/closing?date=YYYY-MM-DD
// Returns daily sales breakdown by payment method + expenses (waste) for the chosen day.
// Permission: accounting.read
// ============================================================
const COMPLETED = ['COMPLETED', 'DELIVERED', 'PAID']

function dayBounds(dateStr: string) {
  const start = new Date(dateStr + 'T00:00:00')
  const end = new Date(dateStr + 'T23:59:59.999')
  return { start, end }
}

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'accounting.read')

  const sp = req.nextUrl.searchParams
  const today = new Date().toISOString().slice(0, 10)
  const dateStr = sp.get('date') ?? today
  const { start, end } = dayBounds(dateStr)

  const [orders, posBills, wasteLogs] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { in: COMPLETED } },
      select: { total: true, paymentMethod: true, channel: true, type: true },
    }),
    db.posBill.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
      select: { total: true, paymentMethod: true },
    }),
    db.wasteLog.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { value: true, source: true, productName: true, quantity: true, unit: true },
    }),
  ])

  const orderCash = orders.filter((o) => o.paymentMethod === 'CASH').reduce((s, o) => s + o.total, 0)
  const orderCard = orders.filter((o) => o.paymentMethod === 'CARD').reduce((s, o) => s + o.total, 0)
  const orderQr = orders.filter((o) => o.paymentMethod === 'PROMPTPAY' || o.paymentMethod === 'EWALLET' || o.paymentMethod === 'BANK_TRANSFER').reduce((s, o) => s + o.total, 0)
  const orderOther = orders.filter((o) => !o.paymentMethod).reduce((s, o) => s + o.total, 0)

  const posCash = posBills.filter((b) => b.paymentMethod === 'CASH').reduce((s, b) => s + b.total, 0)
  const posCard = posBills.filter((b) => b.paymentMethod === 'CARD').reduce((s, b) => s + b.total, 0)
  const posQr = posBills.filter((b) => b.paymentMethod !== 'CASH' && b.paymentMethod !== 'CARD').reduce((s, b) => s + b.total, 0)

  const cashSales = orderCash + posCash
  const cardSales = orderCard + posCard
  const qrSales = orderQr + posQr
  const otherSales = orderOther
  const totalSales = cashSales + cardSales + qrSales + otherSales

  const wasteValue = wasteLogs.reduce((s, w) => s + w.value, 0)
  const estCogs = totalSales * 0.55
  const estUtility = totalSales * 0.04
  const estSalary = totalSales * 0.18
  const estMarketing = totalSales * 0.05
  const estOther = totalSales * 0.03
  const totalExpenses = estCogs + estUtility + estSalary + estMarketing + wasteValue + estOther

  return ok({
    date: dateStr,
    sales: {
      cash: Math.round(cashSales),
      card: Math.round(cardSales),
      qr: Math.round(qrSales),
      other: Math.round(otherSales),
      total: Math.round(totalSales),
    },
    expenses: {
      cogs: Math.round(estCogs),
      utility: Math.round(estUtility),
      salary: Math.round(estSalary),
      marketing: Math.round(estMarketing),
      waste: Math.round(wasteValue),
      other: Math.round(estOther),
      total: Math.round(totalExpenses),
    },
    net: Math.round(totalSales - totalExpenses),
    vat: {
      output: Math.round(totalSales * 0.07),
      input: Math.round((estUtility + estMarketing) * 0.07),
      net: Math.round(totalSales * 0.07 - (estUtility + estMarketing) * 0.07),
    },
    wasteItems: wasteLogs.map((w) => ({
      productName: w.productName,
      source: w.source,
      quantity: w.quantity,
      unit: w.unit,
      value: Math.round(w.value),
    })),
    orderCount: orders.length,
    posBillCount: posBills.length,
  })
})
