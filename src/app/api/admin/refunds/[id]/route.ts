import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/refunds/[id] — refund detail
// Permission: orders.read
// ============================================================
export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'orders.read')
  const { id } = await params

  const r = await db.refund.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          orderNo: true,
          customerName: true,
          customerPhone: true,
          total: true,
          paymentStatus: true,
          items: { select: { id: true, name: true, quantity: true, price: true, total: true } },
        },
      },
      posBill: {
        select: {
          id: true,
          billNo: true,
          total: true,
          paymentMethod: true,
          items: { select: { id: true, name: true, quantity: true, price: true, total: true } },
        },
      },
      approver: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
    },
  })
  if (!r) throw new NotFoundError('ไม่พบรายการคืนเงิน')

  let items: unknown[] = []
  try {
    items = JSON.parse(r.items || '[]') as unknown[]
  } catch {
    items = []
  }

  return ok({
    id: r.id,
    refundNo: r.refundNo,
    orderId: r.orderId,
    posBillId: r.posBillId,
    type: r.type,
    reason: r.reason,
    items,
    refundAmount: r.refundAmount,
    refundMethod: r.refundMethod,
    status: r.status,
    approvedBy: r.approvedBy,
    approverName: r.approver?.name ?? null,
    requestedBy: r.requestedBy,
    requesterName: r.requester?.name ?? null,
    processedAt: r.processedAt?.toISOString() ?? null,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    order: r.order
      ? {
          id: r.order.id,
          orderNo: r.order.orderNo,
          customerName: r.order.customerName,
          customerPhone: r.order.customerPhone,
          total: r.order.total,
          paymentStatus: r.order.paymentStatus,
          items: r.order.items,
        }
      : null,
    posBill: r.posBill
      ? {
          id: r.posBill.id,
          billNo: r.posBill.billNo,
          total: r.posBill.total,
          paymentMethod: r.posBill.paymentMethod,
          items: r.posBill.items,
        }
      : null,
  })
})
