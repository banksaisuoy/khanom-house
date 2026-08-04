import { db } from '@/lib/db'
import { Storefront } from '@/components/store/storefront'
import { ProductDTO, CategoryDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Neon cold start can take 2-3 seconds on first request
export const maxDuration = 30

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export default async function Home() {
  // Graceful fallback if Neon is cold-starting
  let products: any[] = []
  let categories: any[] = []

  try {
    ;[products, categories] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { soldCount: 'desc' },
      }),
      db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])
  } catch (e) {
    console.error('[storefront] DB error (Neon cold start?):', e instanceof Error ? e.message : e)
    // Return empty storefront — user can retry
  }

  const productDTOs: ProductDTO[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    categoryId: p.categoryId,
    type: p.type,
    price: p.price,
    memberPrice: p.memberPrice,
    costPrice: p.costPrice,
    unit: p.unit,
    images: safeParse<string[]>(p.images, []),
    tags: safeParse<string[]>(p.tags, []),
    isBestSeller: p.isBestSeller,
    isFeatured: p.isFeatured,
    isFlashSale: p.isFlashSale,
    flashSalePrice: p.flashSalePrice,
    flashSaleEndAt: p.flashSaleEndAt?.toISOString() ?? null,
    flashSaleStock: p.flashSaleStock,
    shelfLifeHours: p.shelfLifeHours,
    needsRefrigeration: p.needsRefrigeration,
    allergens: safeParse<string[]>(p.allergens, []),
    storageInstructions: p.storageInstructions,
    consumeWithin: p.consumeWithin,
    isVegan: p.isVegan,
    isHalal: p.isHalal,
    isVegetarian: p.isVegetarian,
    rating: p.rating,
    reviewCount: p.reviewCount,
    soldCount: p.soldCount,
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

  const categoryDTOs: CategoryDTO[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    slug: c.slug,
    icon: c.icon,
    sortOrder: c.sortOrder,
  }))

  return (
    <Storefront initialProducts={productDTOs} categories={categoryDTOs} />
  )
}
