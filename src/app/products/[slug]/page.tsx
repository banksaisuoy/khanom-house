import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Heart, ShoppingBag, Snowflake, Clock, Share2 } from 'lucide-react'
import { ProductDetailClient } from '@/components/store/product-detail-client'

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    include: { category: true, reviews: { where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 10 } },
  })
  if (!product) return notFound()

  const related = await db.product.findMany({
    where: { categoryId: product.categoryId, isActive: true, id: { not: product.id } },
    take: 4,
  })

  const allergens = JSON.parse(product.allergens || '[]') as string[]
  const avgRating = product.reviews.length > 0 ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : product.rating

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link href="/#products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> กลับไปรายการสินค้า
        </Link>
        <ProductDetailClient product={JSON.parse(JSON.stringify({ ...product, allergens, avgRating }))} related={JSON.parse(JSON.stringify(related))} />
      </div>
    </div>
  )
}
