import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, conflict, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// PHASE 4 FIX (AUDIT-006): Previously (1) no status guard — a REJECTED slip
// could be re-verified, (2) slip update + order update were separate writes
// (crash leaves them inconsistent), (3) no audit log. Now: all in one
// $transaction with updateMany guard on status=PENDING.
export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission(req, 'orders.update')
  const { id } = await params

  // Check current status first (outside tx for simplicity)
  const existing = await db.slipUpload.findUnique({ where: { id } })
  if (!existing) return conflict('ไม่พบสลิป')
  if (existing.status !== 'PENDING') return conflict('ไม่สามารถยืนยันได้ (สลิปถูกตรวจสอบแล้วหรือถูกปฏิเสธ)')

  // Atomic: update slip + mark order PAID in one transaction
  await db.$transaction(async (tx) => {
    const r = await tx.slipUpload.updateMany({
      where: { id, status: 'PENDING' },
      data: { verified: true, verifiedBy: user.id, verifiedAt: new Date(), status: 'VERIFIED' },
    })
    if (r.count === 0) throw new Error('สลิปถูกตรวจสอบแล้วโดยผู้อื่น')

    if (existing.orderId) {
      await tx.order.updateMany({
        where: { id: existing.orderId },
        data: { paymentStatus: 'PAID', status: 'PAID' },
      })
    }
  })

  await logAudit({
    userId: user.id,
    action: 'APPROVE',
    entity: 'SlipUpload',
    entityId: id,
    newValue: { amount: existing.amount, orderId: existing.orderId },
  })

  return ok({ verified: true, amount: existing.amount, orderId: existing.orderId })
})
