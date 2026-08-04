import { db } from '@/lib/db'
import { PromotionsClient, type PromotionRow } from '@/components/admin/promotions/promotions-client'

export const dynamic = 'force-dynamic'

export default async function PromotionsPage() {
  const promos = await db.promotion.findMany({
    orderBy: [{ isActive: 'desc' }, { endsAt: 'desc' }],
    include: { products: { include: { product: { select: { id: true, name: true, sku: true } } } } },
  })

  const initial: PromotionRow[] = promos.map((p) => ({
    ...p,
    startsAt: p.startsAt.toISOString(),
    endsAt: p.endsAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
    products: p.products.map((pp) => ({ productId: pp.productId, name: pp.product.name, sku: pp.product.sku })),
  }))

  return <PromotionsClient initialPromotions={initial} />
}
