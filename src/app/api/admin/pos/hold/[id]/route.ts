import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, notFound, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'pos.read')
  const { id } = await params
  const bill = await db.heldBill.findUnique({ where: { id } })
  if (!bill) return notFound('ไม่พบบิลที่พักไว้')
  return ok({ ...bill, items: JSON.parse(bill.items) })
})

export const DELETE = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'pos.checkout')
  const { id } = await params
  await db.heldBill.delete({ where: { id } })
  return ok({ deleted: true })
})
