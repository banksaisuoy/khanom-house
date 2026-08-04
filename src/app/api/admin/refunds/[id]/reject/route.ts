import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission(req, 'orders.update')
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  await db.refund.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'REJECTED', notes: body.reason || 'ปฏิเสธ' },
  })
  return ok({ rejected: true })
})
