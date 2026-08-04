import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'customers.update')
  const { id } = await params
  const { reply } = await req.json()
  const review = await db.productReview.update({
    where: { id },
    data: { reply, repliedAt: new Date() },
  })
  return ok(review)
})
