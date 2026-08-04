import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission(req, 'customers.read')
  const { id } = await params
  const customer = await db.customer.findUnique({
    where: { id },
    include: { orders: { include: { items: true } }, loyaltyLogs: true, storeCredits: true, reviews: true },
  })
  if (!customer) return NextResponse.json({ error: 'ไม่พบลูกค้า' }, { status: 404 })
  const data = JSON.stringify(customer, null, 2)
  return new NextResponse(data, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="customer-${customer.phone}.json"`,
    },
  })
}
