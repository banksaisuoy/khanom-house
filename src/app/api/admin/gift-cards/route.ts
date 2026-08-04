import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { nextSeq } from '@/lib/sequence'
import { logAudit } from '@/lib/audit'
import { validate } from '@/lib/validation'
import { z } from 'zod'

// PHASE 3 FIX (AUDIT-004): Previously had no Zod validation, no audit log,
// and used `customers.create` (held by CASHIER) — a cashier could mint
// unlimited gift card balances. Now: (1) Zod schema caps amount at 50,000,
// (2) uses `gift_cards.create` permission (BRANCH_MANAGER+ only), (3) logs
// creation to audit trail.

const giftCardCreateSchema = z.object({
  amount: z.number().positive().max(50000, 'มูลค่าบัตรสูงสุด ฿50,000'),
  buyerName: z.string().trim().max(120).optional(),
  buyerPhone: z.string().trim().max(20).optional(),
  buyerEmail: z.string().email().max(254).optional().or(z.literal('')),
  recipientName: z.string().trim().max(120).optional(),
  recipientEmail: z.string().email().max(254).optional().or(z.literal('')),
  message: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
})

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'gift_cards.create')
  const body = validate(giftCardCreateSchema, await req.json())

  const code = await nextSeq('gift', 'KHGC', 8)
  const card = await db.giftCard.create({
    data: {
      code,
      amount: body.amount,
      balance: body.amount,
      buyerName: body.buyerName || null,
      buyerPhone: body.buyerPhone || null,
      buyerEmail: body.buyerEmail || null,
      recipientName: body.recipientName || null,
      recipientEmail: body.recipientEmail || null,
      message: body.message || null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'GiftCard',
    entityId: card.id,
    newValue: { code, amount: body.amount },
  })

  return created(card)
})

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'customers.read')
  const sp = new URL(req.url).searchParams
  const cards = await db.giftCard.findMany({
    where: sp.get('status') ? { status: sp.get('status')! } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return ok({ cards })
})
