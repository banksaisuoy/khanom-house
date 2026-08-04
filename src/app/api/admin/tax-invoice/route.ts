import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { nextSeq } from '@/lib/sequence'

export const POST = handle(async (req: NextRequest) => {
  await requirePermission(req, 'accounting.read')
  const body = await req.json()
  const order = await db.order.findUnique({ where: { id: body.orderId }, include: { items: true } })
  if (!order) return ok({ error: 'ไม่พบออเดอร์' })

  const invoiceNo = await nextSeq('invoice', 'TAX', 8)
  const subtotal = order.subtotal
  const discount = order.discount
  const taxableAmount = Math.max(0, subtotal - discount)
  const vatRate = 7
  const vatAmount = Math.round(taxableAmount * vatRate / 100 * 100) / 100
  const total = taxableAmount + vatAmount

  const invoice = await db.taxInvoice.create({
    data: {
      invoiceNo,
      orderId: order.id,
      customerName: body.customerName || order.customerName,
      customerTaxId: body.customerTaxId || null,
      customerAddress: body.customerAddress || null,
      customerEmail: body.customerEmail || order.customerEmail || null,
      customerPhone: body.customerPhone || order.customerPhone,
      subtotal, discount, taxableAmount, vatRate, vatAmount, total,
      items: JSON.stringify(order.items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, total: i.total }))),
    },
  })
  return created(invoice)
})

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'accounting.read')
  const sp = new URL(req.url).searchParams
  const invoices = await db.taxInvoice.findMany({
    where: sp.get('status') ? { status: sp.get('status')! } : {},
    orderBy: { issuedAt: 'desc' },
    take: 100,
  })
  return ok({ invoices })
})
