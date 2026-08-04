import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// PATCH /api/admin/promotions/[id]
// DELETE /api/admin/promotions/[id]  (SOFT DELETE via deletedAt)
// ============================================================

export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'promotions.update')
    const { id } = await ctx.params
    const existing = await db.promotion.findUnique({ where: { id }, include: { products: true } })
    if (!existing || existing.deletedAt) throw new NotFoundError('ไม่พบโปร')

    const body = await req.json()
    const data: Record<string, unknown> = {}
    for (const f of ['code', 'name', 'type', 'value', 'minSpend', 'usageLimit', 'isActive']) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    if (body.maxDiscount !== undefined) data.maxDiscount = body.maxDiscount
    if (body.startsAt) data.startsAt = new Date(body.startsAt)
    if (body.endsAt) data.endsAt = new Date(body.endsAt)

    await db.$transaction(async (tx) => {
      if (body.productIds !== undefined) {
        await tx.promotionProduct.deleteMany({ where: { promotionId: id } })
        if (body.productIds.length > 0) {
          await tx.promotionProduct.createMany({
            data: body.productIds.map((productId: string) => ({ promotionId: id, productId })),
          })
        }
      }
      await tx.promotion.update({ where: { id }, data })
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Promotion',
      entityId: id,
      oldValue: safeJson({ code: existing.code, name: existing.name, isActive: existing.isActive }),
      newValue: safeJson({ code: body.code ?? existing.code, name: body.name ?? existing.name, isActive: body.isActive ?? existing.isActive }),
    })
    return ok({ ok: true })
  }
)

export const DELETE = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'promotions.delete')
    const { id } = await ctx.params
    const existing = await db.promotion.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) throw new NotFoundError('ไม่พบโปร')

    // SOFT DELETE
    await db.promotion.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'Promotion',
      entityId: id,
      oldValue: safeJson({ code: existing.code, name: existing.name }),
    })
    return ok({ ok: true })
  }
)
