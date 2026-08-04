import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'

export const POST = handle(async (req: NextRequest) => {
  const { code } = await req.json()
  const card = await db.giftCard.findUnique({ where: { code: code.toUpperCase() } })
  if (!card || card.status !== 'ACTIVE') return ok({ valid: false })
  return ok({ valid: true, balance: card.balance, amount: card.amount })
})
