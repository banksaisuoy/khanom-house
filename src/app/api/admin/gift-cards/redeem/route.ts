import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, conflict, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest) => {
  await requirePermission(req, 'pos.checkout')
  const { code, amount } = await req.json()
  const card = await db.giftCard.findUnique({ where: { code: code.toUpperCase() } })
  if (!card || card.status !== 'ACTIVE') return conflict('บัตรไม่ถูกต้องหรือถูกใช้แล้ว')
  if (card.balance < amount) return conflict('ยอดคงเหลือไม่เพียงพอ')

  const r = await db.$transaction(async (tx) => {
    const updated = await tx.giftCard.updateMany({
      where: { id: card.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    })
    if (updated.count === 0) throw new Error('ยอดคงเหลือไม่เพียงพอ')
    const newBalance = card.balance - amount
    if (newBalance <= 0) {
      await tx.giftCard.update({ where: { id: card.id }, data: { status: 'USED', usedAt: new Date() } })
    }
    return newBalance
  })
  return ok({ redeemed: amount, balance: r })
})
