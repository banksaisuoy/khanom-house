import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, notFound, handle } from '@/lib/api-response'

// ============================================================
// GET /api/products/[slug]  (public storefront)
//
// AUDIT (P3-5): wrapped in `handle()` and uses shared response helpers
// instead of bare NextResponse.json + ad-hoc try/catch that leaked
// `e.message` to the client on 500. Response shape preserved: { product }.
// ============================================================
export const GET = handle(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
  ) => {
    const { slug } = await params
    const product = await db.product.findUnique({
      where: { slug },
      include: { category: true },
    })
    if (!product) {
      return notFound('Not found')
    }
    const result = {
      ...product,
      images: safeParse<string[]>(product.images, []),
      tags: safeParse<string[]>(product.tags, []),
      allergens: safeParse<string[]>(product.allergens, []),
      storageInstructions: product.storageInstructions,
      consumeWithin: product.consumeWithin,
      isVegan: product.isVegan,
      isHalal: product.isHalal,
      isVegetarian: product.isVegetarian,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            nameEn: product.category.nameEn,
            slug: product.category.slug,
            icon: product.category.icon,
          }
        : null,
    }
    return ok({ product: result })
  }
)

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}
