import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')
  const sp = new URL(req.url).searchParams
  const days = parseInt(sp.get('days') || '7')

  // Analyze sales from last N days
  const from = new Date(Date.now() - days * 86400000)
  const orderItems = await db.orderItem.findMany({
    where: { order: { createdAt: { gte: from }, status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] } } },
    include: { product: { select: { name: true, slug: true, type: true, costPrice: true, price: true, isFlashSale: true } } },
    take: 5000,
  })

  // Group by product
  const productSales = new Map<string, { name: string; slug: string; type: string; totalQty: number; totalRevenue: number; daysCount: number }>()
  for (const item of orderItems) {
    const key = item.productId
    if (!productSales.has(key)) {
      productSales.set(key, { name: item.product.name, slug: item.product.slug, type: item.product.type, totalQty: 0, totalRevenue: 0, daysCount: days })
    }
    const p = productSales.get(key)!
    p.totalQty += item.quantity
    p.totalRevenue += item.total
  }

  // Suggest production qty = avg daily sales × 1.2 (20% buffer)
  const suggestions = Array.from(productSales.values())
    .map(p => ({
      ...p,
      avgDaily: p.totalQty / p.daysCount,
      suggestedQty: Math.ceil((p.totalQty / p.daysCount) * 1.2),
      trend: p.totalQty > (p.daysCount * 5) ? 'high' : p.totalQty > (p.daysCount * 2) ? 'medium' : 'low',
    }))
    .filter(p => p.suggestedQty > 0)
    .sort((a, b) => b.suggestedQty - a.suggestedQty)
    .slice(0, 15)

  return ok({ suggestions, period: { days, from: from.toISOString() } })
})
