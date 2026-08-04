import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { validate, customerUpdateSchema } from '@/lib/validation'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// GET    /api/admin/customers/[id]   (360 view)
// PATCH  /api/admin/customers/[id]   (allowlist — NO points/tier)
// DELETE /api/admin/customers/[id]   (soft delete via deletedAt)
// ============================================================

export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requirePermission(req, 'customers.read')
    const { id } = await ctx.params

    const c = await db.customer.findUnique({
      where: { id, deletedAt: null },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { items: { select: { productId: true, name: true, quantity: true, total: true } } },
        },
        loyaltyLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })
    if (!c) throw new NotFoundError('ไม่พบลูกค้า')

    // Compute favorite product
    const productCounts = new Map<string, { name: string; qty: number; spent: number }>()
    for (const o of c.orders) {
      for (const it of o.items) {
        const cur = productCounts.get(it.productId) ?? { name: it.name, qty: 0, spent: 0 }
        cur.qty += it.quantity
        cur.spent += it.total
        productCounts.set(it.productId, cur)
      }
    }
    const favorites = Array.from(productCounts.entries())
      .map(([pid, v]) => ({ productId: pid, ...v }))
      .sort((a, b) => b.qty - a.qty)
    const favorite = favorites[0] ?? null

    return ok({
      ...c,
      birthday: c.birthday ? c.birthday.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      orders: c.orders.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      loyaltyLogs: c.loyaltyLogs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      favorite,
      stats: {
        totalSpent: c.totalSpent,
        visitCount: c.visitCount,
        avgBasket: c.visitCount > 0 ? c.totalSpent / c.visitCount : 0,
        orderCount: c.orders.length,
      },
    })
  }
)

export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'customers.update')
    const { id } = await ctx.params

    const existing = await db.customer.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบลูกค้า')

    const body = validate(customerUpdateSchema, await req.json())
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.email !== undefined) data.email = body.email || null
    if (body.notes !== undefined) data.notes = body.notes
    if (body.birthday !== undefined) {
      data.birthday = body.birthday ? new Date(body.birthday) : null
    }
    // NOTE: points/tier are intentionally excluded — use /points endpoint.

    const c = await db.customer.update({ where: { id }, data })
    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: id,
      oldValue: safeJson({ name: existing.name, phone: existing.phone, tier: existing.tier, points: existing.points }),
      newValue: safeJson({ name: c.name, phone: c.phone, tier: c.tier, points: c.points }),
    })
    return ok({ ok: true })
  }
)

export const DELETE = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'customers.delete')
    const { id } = await ctx.params
    const existing = await db.customer.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบลูกค้า')

    // SOFT DELETE — keep row for historical reference / order integrity
    await db.customer.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'Customer',
      entityId: id,
      oldValue: safeJson({ name: existing.name, phone: existing.phone }),
    })
    return ok({ ok: true })
  }
)
