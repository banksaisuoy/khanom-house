import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, notFound, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'pos.checkout')
  const { id } = await params
  const bill = await db.heldBill.updateMany({
    where: { id, recalled: false },
    data: { recalled: true, recalledAt: new Date() },
  })
  if (bill.count === 0) return notFound('ไม่พบบิลหรือถูกเรียกไปแล้ว')
  const held = await db.heldBill.findUnique({ where: { id } })
  return ok({ ...held, items: JSON.parse(held!.items) })
})
