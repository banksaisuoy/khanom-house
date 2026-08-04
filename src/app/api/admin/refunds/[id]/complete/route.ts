import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, conflict, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'orders.update')
  const { id } = await params
  const r = await db.refund.updateMany({
    where: { id, status: 'APPROVED' },
    data: { status: 'COMPLETED', processedAt: new Date() },
  })
  if (r.count === 0) return conflict('ต้องอนุมัติก่อนถึงจะดำเนินการได้')
  return ok({ completed: true })
})
