import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'

// ============================================================
// GET /api/products  (public storefront)
//   ?category=&q=&flash=1&best=1&featured=1&limit=
//
// AUDIT (P3-5): wrapped in `handle()` and uses shared response helpers
// instead of bare NextResponse.json + ad-hoc try/catch that leaked
// `e.message` to the client on 500. Response shape preserved: { products }.
// Also: `limit` is now clamped to a safe maximum.
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const q = searchParams.get('q')
  const flash = searchParams.get('flash') === '1'
  const best = searchParams.get('best') === '1'
  const featured = searchParams.get('featured') === '1'
  // Clamp limit to a safe maximum to avoid unbounded fetches.
  const rawLimit = parseInt(searchParams.get('limit') || '50')
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50

  const where: Record<string, unknown> = { isActive: true }
  if (category && category !== 'all') {
    where.category = { slug: category }
  }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { nameEn: { contains: q } },
      { description: { contains: q } },
    ]
  }
  if (flash) {
    where.isFlashSale = true
    where.flashSaleEndAt = { gt: new Date() }
  }
  if (best) where.isBestSeller = true
  if (featured) where.isFeatured = true

  const products = await db.product.findMany({
    where,
    include: { category: true },
    orderBy: { soldCount: 'desc' },
    take: limit,
  })

  const result = products.map((p) => ({
    ...p,
    images: safeParse<string[]>(p.images, []),
    tags: safeParse<string[]>(p.tags, []),
    allergens: safeParse<string[]>(p.allergens, []),
    storageInstructions: p.storageInstructions,
    consumeWithin: p.consumeWithin,
    isVegan: p.isVegan,
    isHalal: p.isHalal,
    isVegetarian: p.isVegetarian,
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          nameEn: p.category.nameEn,
          slug: p.category.slug,
          icon: p.category.icon,
          sortOrder: p.category.sortOrder,
        }
      : null,
  }))

  return ok({ products: result })
})

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}
