import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// GET /api/admin/promotions
// Filters out soft-deleted promotions.
// Permission: promotions.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'promotions.read')

  const promos = await db.promotion.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: 'desc' }, { endsAt: 'desc' }],
    include: { products: { include: { product: { select: { id: true, name: true, sku: true } } } } },
  })
  return ok({
    promotions: promos.map((p) => ({
      ...p,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      products: p.products.map((pp) => ({ productId: pp.productId, name: pp.product.name, sku: pp.product.sku })),
    })),
  })
})

interface CreatePayload {
  code: string
  name: string
  type: string
  value: number
  minSpend?: number
  maxDiscount?: number | null
  usageLimit?: number | null
  startsAt: string
  endsAt: string
  isActive?: boolean
  productIds?: string[]
}

const VALID_TYPES = ['PERCENT', 'FIXED', 'BOGO']

// ============================================================
// POST /api/admin/promotions
// Permission: promotions.create
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'promotions.create')
  const body = (await req.json()) as CreatePayload
  if (!body.code || !body.name || !body.type || !body.startsAt || !body.endsAt) {
    return ok({ ok: false, error: 'ข้อมูลไม่ครบ' })
  }
  if (!VALID_TYPES.includes(body.type)) {
    return ok({ ok: false, error: 'ประเภทโปรไม่ถูกต้อง' })
  }
  const existing = await db.promotion.findUnique({ where: { code: body.code.toUpperCase() } })
  if (existing && !existing.deletedAt) {
    return ok({ ok: false, error: 'รหัสโปรซ้ำ' })
  }

  const p = await db.promotion.create({
    data: {
      code: body.code.toUpperCase(),
      name: body.name,
      type: body.type,
      value: Number(body.value) || 0,
      minSpend: Number(body.minSpend) || 0,
      maxDiscount: body.maxDiscount ?? null,
      usageLimit: body.usageLimit ?? null,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      isActive: body.isActive ?? true,
      products: body.productIds && body.productIds.length > 0
        ? { create: body.productIds.map((productId) => ({ productId })) }
        : undefined,
    },
  })
  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'Promotion',
    entityId: p.id,
    newValue: safeJson({ code: p.code, name: p.name, type: p.type }),
  })
  return created({ ok: true, id: p.id })
})
