import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { nextSeq } from '@/lib/sequence'
import { logAudit } from '@/lib/audit'

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'orders.update')
  const body = await req.json()

  const refundNo = await nextSeq('refund', 'RF', 6)

  const refund = await db.refund.create({
    data: {
      refundNo,
      orderId: body.orderId || null,
      posBillId: body.posBillId || null,
      type: body.type || 'FULL',
      reason: body.reason,
      items: JSON.stringify(body.items || []),
      refundAmount: body.refundAmount,
      refundMethod: body.refundMethod || 'CASH',
      status: 'PENDING',
      requestedBy: user.id,
      notes: body.notes || null,
    },
  })

  await logAudit({ userId: user.id, action: 'CREATE', entity: 'Refund', entityId: refund.id, newValue: { refundNo, amount: body.refundAmount } })
  return created(refund)
})

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'orders.read')
  const sp = new URL(req.url).searchParams
  const where: Record<string, unknown> = {}
  if (sp.get('status')) where.status = sp.get('status')

  const refunds = await db.refund.findMany({
    where,
    include: {
      order: { select: { orderNo: true, customerName: true } },
      posBill: { select: { billNo: true } },
      requester: { select: { name: true } },
      approver: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok({ refunds })
})
