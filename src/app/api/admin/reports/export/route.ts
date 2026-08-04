import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toCsv } from '@/lib/admin-ui'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/reports/export?type=sales|products|customers|finance&format=csv
// Returns CSV file download.
// ============================================================

const COMPLETED = ['COMPLETED', 'DELIVERED', 'PAID']

function getStart(range: string) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  if (range === '7') d.setDate(d.getDate() - 6)
  else if (range === '90') d.setDate(d.getDate() - 89)
  else d.setDate(d.getDate() - 29)
  return d
}

function csvResponse(filename: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'reports.read')
  const sp = req.nextUrl.searchParams
    const type = sp.get('type') ?? 'sales'
    const range = sp.get('range') ?? '30'
    const start = getStart(range)

    if (type === 'sales') {
      const orders = await db.order.findMany({
        where: { createdAt: { gte: start } },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      })
      const rows = orders.map((o) => ({
        orderNo: o.orderNo,
        date: new Date(o.createdAt).toISOString().slice(0, 16),
        channel: o.channel,
        type: o.type,
        status: o.status,
        paymentMethod: o.paymentMethod ?? '',
        subtotal: o.subtotal,
        discount: o.discount,
        shipping: o.shipping,
        total: o.total,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
      }))
      const csv = toCsv(rows, [
        { key: 'orderNo', label: 'เลขออเดอร์' },
        { key: 'date', label: 'วันที่' },
        { key: 'channel', label: 'ช่องทาง' },
        { key: 'type', label: 'ประเภท' },
        { key: 'status', label: 'สถานะ' },
        { key: 'paymentMethod', label: 'การชำระ' },
        { key: 'subtotal', label: 'ยอดก่อนหัก' },
        { key: 'discount', label: 'ส่วนลด' },
        { key: 'shipping', label: 'ค่าส่ง' },
        { key: 'total', label: 'ยอดรวม' },
        { key: 'customerName', label: 'ลูกค้า' },
        { key: 'customerPhone', label: 'เบอร์' },
        { key: 'itemCount', label: 'จำนวนชิ้น' },
      ])
      return csvResponse(`sales-${range}d.csv`, csv)
    }

    if (type === 'products') {
      const items = await db.orderItem.findMany({
        where: { order: { createdAt: { gte: start }, status: { in: COMPLETED } } },
        select: { productId: true, name: true, quantity: true, total: true, price: true },
      })
      const map = new Map<string, { name: string; qty: number; revenue: number }>()
      for (const it of items) {
        const cur = map.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 }
        cur.qty += it.quantity
        cur.revenue += it.total
        map.set(it.productId, cur)
      }
      const rows = Array.from(map.values())
        .sort((a, b) => b.revenue - a.revenue)
        .map((p) => ({ ...p, avgPrice: p.qty > 0 ? p.revenue / p.qty : 0 }))
      const csv = toCsv(rows, [
        { key: 'name', label: 'สินค้า' },
        { key: 'qty', label: 'จำนวนที่ขาย' },
        { key: 'revenue', label: 'ยอดขาย' },
        { key: 'avgPrice', label: 'ราคาเฉลี่ย' },
      ])
      return csvResponse(`products-${range}d.csv`, csv)
    }

    if (type === 'customers') {
      const customers = await db.customer.findMany({
        orderBy: { totalSpent: 'desc' },
        include: { _count: { select: { orders: true } } },
      })
      const rows = customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email ?? '',
        tier: c.tier,
        points: c.points,
        totalSpent: c.totalSpent,
        visitCount: c.visitCount,
        orderCount: (c as { _count: { orders: number } })._count.orders,
        createdAt: new Date(c.createdAt).toISOString().slice(0, 10),
      }))
      const csv = toCsv(rows, [
        { key: 'name', label: 'ชื่อ' },
        { key: 'phone', label: 'เบอร์' },
        { key: 'email', label: 'อีเมล' },
        { key: 'tier', label: 'Tier' },
        { key: 'points', label: 'แต้ม' },
        { key: 'totalSpent', label: 'ยอดซื้อรวม' },
        { key: 'visitCount', label: 'เข้ามา/ครั้ง' },
        { key: 'orderCount', label: 'ออเดอร์' },
        { key: 'createdAt', label: 'สมัครเมื่อ' },
      ])
      return csvResponse(`customers.csv`, csv)
    }

    if (type === 'finance') {
      const orders = await db.order.findMany({
        where: { createdAt: { gte: start }, status: { in: COMPLETED } },
        include: { items: true },
      })
      const wasteLogs = await db.wasteLog.findMany({ where: { createdAt: { gte: start } }, select: { value: true } })
      const revenue = orders.reduce((s, o) => s + o.total, 0)
      const cogs = orders.reduce((s, o) => s + o.items.reduce((ss, it) => ss + (it.total - it.total * 0.6), 0), 0)
      const waste = wasteLogs.reduce((s, w) => s + w.value, 0)
      const rows = [
        { label: 'รายได้รวม (Revenue)', value: Math.round(revenue) },
        { label: 'ต้นทุนสินค้า (COGS)', value: Math.round(cogs) },
        { label: 'กำไรขั้นต้น (Gross Profit)', value: Math.round(revenue - cogs) },
        { label: 'ค่าน้ำ/ไฟ', value: Math.round(revenue * 0.04) },
        { label: 'การตลาด', value: Math.round(revenue * 0.05) },
        { label: 'เงินเดือน', value: Math.round(revenue * 0.18) },
        { label: 'ของเสีย', value: Math.round(waste) },
        { label: 'อื่นๆ', value: Math.round(revenue * 0.03) },
        { label: 'VAT ขา output (7%)', value: Math.round(revenue * 0.07) },
      ]
      const csv = toCsv(rows, [
        { key: 'label', label: 'รายการ' },
        { key: 'value', label: 'มูลค่า (฿)' },
      ])
      return csvResponse(`finance-${range}d.csv`, csv)
    }

    return ok({ error: 'type ไม่ถูกต้อง' })
})
