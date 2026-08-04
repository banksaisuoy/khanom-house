import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError, ConflictError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

// ============================================================
// GET /api/admin/gift-cards/[id]
//   Detail view of a gift card.
// ============================================================
export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requirePermission(req, 'customers.read')
    const { id } = await ctx.params

    const card = await db.giftCard.findUnique({ where: { id } })
    if (!card) throw new NotFoundError('ไม่พบบัตรของขวัญ')

    return ok({
      id: card.id,
      code: card.code,
      amount: card.amount,
      balance: card.balance,
      buyerName: card.buyerName,
      buyerPhone: card.buyerPhone,
      buyerEmail: card.buyerEmail,
      recipientName: card.recipientName,
      recipientEmail: card.recipientEmail,
      message: card.message,
      status: card.status,
      expiresAt: card.expiresAt?.toISOString() ?? null,
      usedAt: card.usedAt?.toISOString() ?? null,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    })
  }
)

// ============================================================
// PATCH /api/admin/gift-cards/[id]
//   Update card — only cancel supported (status -> CANCELLED).
//   Cannot cancel already-USED or EXPIRED cards.
// ============================================================
const giftCardUpdateSchema = z.object({
  status: z.enum(['CANCELLED']).optional(),
  message: z.string().trim().max(500).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'customers.update')
    const { id } = await ctx.params
    const body = giftCardUpdateSchema.parse(await req.json())

    const existing = await db.giftCard.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบบัตรของขวัญ')

    if (body.status === 'CANCELLED') {
      if (existing.status === 'USED') {
        throw new ConflictError('บัตรถูกใช้งานแล้ว ไม่สามารถยกเลิกได้')
      }
      if (existing.status === 'EXPIRED') {
        throw new ConflictError('บัตรหมดอายุแล้ว ไม่สามารถยกเลิกได้')
      }
      if (existing.status === 'CANCELLED') {
        throw new ConflictError('บัตรถูกยกเลิกไปแล้ว')
      }
    }

    const data: Record<string, unknown> = {}
    if (body.status) data.status = body.status
    if (body.message !== undefined) data.message = body.message
    if (body.expiresAt !== undefined) {
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    }

    const updated = await db.giftCard.update({ where: { id }, data })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'GiftCard',
      entityId: id,
      oldValue: {
        status: existing.status,
        balance: existing.balance,
        message: existing.message,
      },
      newValue: {
        status: updated.status,
        message: updated.message,
      },
    })

    return ok({ ok: true })
  }
)
