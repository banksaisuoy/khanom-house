import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// PHASE 3 FIX (AUDIT-009): Previously set phone to a constant '0000000000'
// which collides on the @unique constraint — only the FIRST PDPA deletion
// succeeds, all subsequent ones throw P2002 → 500 → PDPA right-to-erasure
// is violated. Now: phone is set to a per-customer unique placeholder
// 'DELETED-{last6ofId}' so multiple deletions never collide.
export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission(req, 'customers.delete')
  const { id } = await params

  const customer = await db.customer.update({
    where: { id },
    data: {
      name: '[ลบแล้วตามคำขอ PDPA]',
      phone: `DELETED-${id.slice(-6)}`, // unique per customer, no collision
      email: null,
      notes: null,
      birthday: null,
      points: 0,
      deletedAt: new Date(),
    },
  })
  await logAudit({ userId: user.id, action: 'DELETE', entity: 'Customer', entityId: id, newValue: 'PDPA deletion' })
  return ok({ deleted: true, message: 'ลบข้อมูลส่วนบุคคลเรียบร้อย (PDPA)' })
})
