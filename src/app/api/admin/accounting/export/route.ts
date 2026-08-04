import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toCsv } from '@/lib/admin-ui'
import { handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/accounting/export?format=peak|flowaccount|csv&range=7|30|90
// Returns CSV file download with accounting data.
// PEAK/FlowAccount variants — different column orders.
// Permission: accounting.read
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
  await requirePermission(req, 'accounting.read')

  const sp = req.nextUrl.searchParams
  const format = sp.get('format') ?? 'csv'
  const range = sp.get('range') ?? '30'
  const start = getStart(range)

  const [orders, wasteLogs] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: start }, status: { in: COMPLETED } },
      select: { orderNo: true, createdAt: true, total: true, paymentMethod: true, channel: true, status: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.wasteLog.findMany({
      where: { createdAt: { gte: start } },
      select: { productName: true, source: true, value: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (format === 'peak') {
    const rows: Record<string, unknown>[] = []
    for (const o of orders) {
      const date = new Date(o.createdAt).toISOString().slice(0, 10)
      rows.push({ date, docNo: o.orderNo, account: 'รายได้จากการขาย', debit: 0, credit: o.total, desc: `Order ${o.orderNo} (${o.channel})` })
      rows.push({ date, docNo: o.orderNo, account: 'เงินสด/เงินฝากธนาคาร', debit: o.total, credit: 0, desc: `รับชำระ ${o.paymentMethod ?? '-'}` })
    }
    const csv = toCsv(rows, [
      { key: 'date', label: 'วันที่' },
      { key: 'docNo', label: 'เลขที่เอกสาร' },
      { key: 'account', label: 'ชื่อบัญชี' },
      { key: 'debit', label: 'เดบิต' },
      { key: 'credit', label: 'เครดิต' },
      { key: 'desc', label: 'รายละเอียด' },
    ])
    return csvResponse(`peak-journal-${range}d.csv`, csv)
  }

  if (format === 'flowaccount') {
    const rows: Record<string, unknown>[] = []
    for (const o of orders) {
      const date = new Date(o.createdAt).toISOString().slice(0, 10)
      rows.push({ date, journal: 'JV', docNo: o.orderNo, desc: `Order ${o.orderNo}`, debit: o.total, credit: '', code: '1000', name: 'เงินสด/ธนาคาร' })
      rows.push({ date, journal: 'JV', docNo: o.orderNo, desc: `รายได้ขาย ${o.channel}`, debit: '', credit: o.total, code: '4000', name: 'รายได้จากการขาย' })
    }
    for (const w of wasteLogs) {
      const date = new Date(w.createdAt).toISOString().slice(0, 10)
      rows.push({ date, journal: 'JE', docNo: `WASTE-${date}`, desc: `ของเสีย: ${w.productName}`, debit: w.value, credit: '', code: '5900', name: 'ค่าเสียหาย/ของเสีย' })
      rows.push({ date, journal: 'JE', docNo: `WASTE-${date}`, desc: `ตัดสต็อกของเสีย`, debit: '', credit: w.value, code: '1400', name: 'สินค้าคงคลัง' })
    }
    const csv = toCsv(rows, [
      { key: 'date', label: 'Date' },
      { key: 'journal', label: 'JournalType' },
      { key: 'docNo', label: 'DocumentNo' },
      { key: 'desc', label: 'Description' },
      { key: 'debit', label: 'Debit' },
      { key: 'credit', label: 'Credit' },
      { key: 'code', label: 'AccountCode' },
      { key: 'name', label: 'AccountName' },
    ])
    return csvResponse(`flowaccount-journal-${range}d.csv`, csv)
  }

  // default: plain CSV ledger
  const rows: Record<string, unknown>[] = orders.map((o) => ({
    date: new Date(o.createdAt).toISOString().slice(0, 16),
    docNo: o.orderNo,
    type: 'SALE',
    channel: o.channel,
    method: o.paymentMethod ?? '-',
    amount: o.total,
    note: '',
  }))
  for (const w of wasteLogs) {
    rows.push({
      date: new Date(w.createdAt).toISOString().slice(0, 16),
      docNo: `WASTE-${new Date(w.createdAt).toISOString().slice(0, 10)}`,
      type: 'WASTE',
      channel: w.source,
      method: '-',
      amount: w.value,
      note: w.productName,
    })
  }
  const csv = toCsv(rows, [
    { key: 'date', label: 'วันที่' },
    { key: 'docNo', label: 'เลขที่เอกสาร' },
    { key: 'type', label: 'ประเภท' },
    { key: 'channel', label: 'ช่องทาง/แหล่ง' },
    { key: 'method', label: 'วิธีชำระ' },
    { key: 'amount', label: 'จำนวนเงิน' },
    { key: 'note', label: 'หมายเหตุ' },
  ])
  return csvResponse(`ledger-${range}d.csv`, csv)
})
