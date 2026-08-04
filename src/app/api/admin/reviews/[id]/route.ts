import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError, badRequest } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

// ============================================================
// GET /api/admin/reviews
//   List all reviews with filters (rating, published, productId, search).
//   Permission: customers.read (reviews are customer-facing content)
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'customers.read')

  const sp = req.nextUrl.searchParams
  const rating = sp.get('rating')
  const published = sp.get('published')
  const productId = sp.get('productId')
  const search = sp.get('search')?.trim()

  const where: Record<string, unknown> = {}
  if (rating && rating !== 'all') where.rating = Number(rating)
  if (published === 'true') where.isPublished = true
  if (published === 'false') where.isPublished = false
  if (productId) where.productId = productId
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { comment: { contains: search, mode: 'insensitive' } },
    ]
  }

  const reviews = await db.productReview.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      product: { select: { id: true, name: true, slug: true } },
    },
  })

  return ok({
    reviews: reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product?.name ?? '—',
      productSlug: r.product?.slug ?? null,
      customerId: r.customerId,
      customerName: r.customerName,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      images: safeParseImages(r.images),
      isVerified: r.isVerified,
      isPublished: r.isPublished,
      helpfulCount: r.helpfulCount,
      reply: r.reply,
      repliedAt: r.repliedAt?.toISOString() ?? null,
      orderId: r.orderId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  })
})

function safeParseImages(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map((x) => String(x)) : []
  } catch {
    return []
  }
}

// ============================================================
// PATCH /api/admin/reviews/[id]
//   Toggle isPublished (and only that).
// ============================================================
const patchSchema = z.object({
  isPublished: z.boolean().optional(),
})

export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'customers.update')
    const { id } = await ctx.params
    const body = patchSchema.parse(await req.json())

    const existing = await db.productReview.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบรีวิว')

    if (body.isPublished === undefined) {
      return badRequest('ไม่มี field ที่ต้องการแก้ไข')
    }

    const updated = await db.productReview.update({
      where: { id },
      data: { isPublished: body.isPublished },
    })

    // Recompute product aggregate.
    const agg = await db.productReview.aggregate({
      where: { productId: existing.productId, isPublished: true },
      _avg: { rating: true },
      _count: true,
    })
    await db.product.update({
      where: { id: existing.productId },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'ProductReview',
      entityId: id,
      oldValue: { isPublished: existing.isPublished },
      newValue: { isPublished: updated.isPublished },
    })

    return ok({ ok: true, isPublished: updated.isPublished })
  }
)

// ============================================================
// DELETE /api/admin/reviews/[id]
// ============================================================
export const DELETE = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'customers.delete')
    const { id } = await ctx.params

    const existing = await db.productReview.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบรีวิว')

    await db.productReview.delete({ where: { id } })

    // Recompute product aggregate.
    const agg = await db.productReview.aggregate({
      where: { productId: existing.productId, isPublished: true },
      _avg: { rating: true },
      _count: true,
    })
    await db.product.update({
      where: { id: existing.productId },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    })

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'ProductReview',
      entityId: id,
      oldValue: { rating: existing.rating, customerName: existing.customerName },
    })
    return ok({ ok: true })
  }
)
