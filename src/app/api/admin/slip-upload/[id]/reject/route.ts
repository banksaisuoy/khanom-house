import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'orders.update')
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const slip = await db.slipUpload.update({
    where: { id },
    data: { status: 'REJECTED', rejectReason: body.reason || 'สลิปไม่ถูกต้อง' },
  })
  return ok(slip)
})
