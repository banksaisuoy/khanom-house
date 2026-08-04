import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'orders.update')
  const body = await req.json()
  const slip = await db.slipUpload.create({
    data: {
      orderId: body.orderId || null,
      customerId: body.customerId || null,
      imageUrl: body.imageUrl,
      amount: body.amount,
      bankName: body.bankName || null,
      transferDate: body.transferDate ? new Date(body.transferDate) : null,
      refCode: body.refCode || null,
      status: 'PENDING',
    },
  })
  return created(slip)
})

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'orders.read')
  const sp = new URL(req.url).searchParams
  const slips = await db.slipUpload.findMany({
    where: sp.get('status') ? { status: sp.get('status')! } : {},
    include: { order: { select: { orderNo: true, customerName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return ok({ slips })
})
