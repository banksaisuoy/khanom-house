import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/reports/products?range=7|30|90
// Returns: bestSellers[], worstSellers[], byCategory[], stockMovement[]
// ============================================================

const COMPLETED = ['COMPLETED', 'DELIVERED', 'PAID']

function getStart(range: string) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  if (range === '7') d.setDate(d.getDate() - 6)
  else if (range === '90') d.setDate(d.getDate() - 89)
  else d.setDate(d.getDate() - 29)
  return d
}

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'reports.read')
  const range = req.nextUrl.searchParams.get('range') ?? '30'
    const start = getStart(range)

    const [items, products, categories] = await Promise.all([
      db.orderItem.findMany({
        where: { order: { createdAt: { gte: start }, status: { in: COMPLETED } } },
        take: 5000,
        select: { productId: true, name: true, quantity: true, total: true, price: true, product: { select: { costPrice: true, categoryId: true } } },
      }),
      db.product.findMany({
        take: 200,
        select: {
          id: true, name: true, sku: true, price: true, costPrice: true,
          categoryId: true, soldCount: true, isActive: true,
          category: { select: { name: true } },
          inventory: { select: { quantity: true }, take: 1 },
        },
      }),
      db.category.findMany({ select: { id: true, name: true } }),
    ])

    // aggregate by product
    const prodMap = new Map<string, { productId: string; name: string; qty: number; revenue: number; cost: number; categoryId: string | null }>()
    for (const it of items) {
      const cur = prodMap.get(it.productId) ?? {
        productId: it.productId, name: it.name, qty: 0, revenue: 0, cost: 0,
        categoryId: it.product?.categoryId ?? null,
      }
      cur.qty += it.quantity
      cur.revenue += it.total
      cur.cost += (it.product?.costPrice ?? 0) * it.quantity
      prodMap.set(it.productId, cur)
    }

    const allAgg = Array.from(prodMap.values())
    const bestSellers = allAgg.sort((a, b) => b.revenue - a.revenue).slice(0, 10)
      .map((p) => ({ ...p, profit: p.revenue - p.cost }))

    // Worst sellers — products that exist but had no/little sales in range
    const soldIds = new Set(prodMap.keys())
    const noSale = products.filter((p) => !soldIds.has(p.id) && p.isActive)
    const worstSellers = noSale.slice(0, 10).map((p) => ({
      productId: p.id, name: p.name, qty: 0, revenue: 0, cost: 0, profit: 0,
    }))

    // by category
    const catMap = new Map<string, { name: string; revenue: number; qty: number; count: number }>()
    for (const it of items) {
      const catName = it.product?.categoryId
        ? categories.find((c) => c.id === it.product!.categoryId)?.name ?? 'ไม่ระบุ'
        : 'ไม่ระบุ'
      const cur = catMap.get(catName) ?? { name: catName, revenue: 0, qty: 0, count: 0 }
      cur.revenue += it.total
      cur.qty += it.quantity
      cur.count += 1
      catMap.set(catName, cur)
    }
    const byCategory = Array.from(catMap.values())
      .map((c) => ({ ...c, revenue: Math.round(c.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)

    // stock movement (top moved products — by soldCount lifetime)
    const stockMovement = products
      .map((p) => ({
        productId: p.id, name: p.name, sku: p.sku,
        soldCount: p.soldCount,
        stock: p.inventory[0]?.quantity ?? 0,
        price: p.price,
      }))
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 10)

    return ok({
      bestSellers,
      worstSellers,
      byCategory,
      stockMovement,
    })
})
