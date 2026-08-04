import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/recipes/[id]/scale?qty=10
//   Returns scaled ingredients + computed cost for producing `qty` units.
// Permission: recipes.read
export const GET = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'recipes.read')
  const { id } = await params
  const qtyParam = req.nextUrl.searchParams.get('qty')
  const qty = Number(qtyParam)
  if (!qty || qty <= 0) throw new NotFoundError('qty ต้องมากกว่า 0')

  const r = await db.recipe.findUnique({
    where: { id },
    include: {
      items: true,
      product: { select: { name: true, slug: true, type: true, unit: true } },
    },
  })
  if (!r) throw new NotFoundError('ไม่พบสูตร')

  const scale = qty / r.yieldQty
  const scaledItems = r.items.map((it) => {
    const scaledQty = it.quantity * scale
    return {
      ingredientName: it.ingredientName,
      originalQty: it.quantity,
      scaledQty,
      unit: it.unit,
      costPerUnit: it.costPerUnit,
      lineCost: scaledQty * it.costPerUnit,
    }
  })
  const totalCost = scaledItems.reduce((s, it) => s + it.lineCost, 0)
  const originalCost = r.items.reduce((s, it) => s + it.quantity * it.costPerUnit, 0)

  return ok({
    recipe: {
      id: r.id,
      productId: r.productId,
      productName: r.product?.name ?? '',
      productSlug: r.product?.slug ?? null,
      productType: r.product?.type ?? null,
      yieldQty: r.yieldQty,
      yieldUnit: r.yieldUnit,
    },
    requestedQty: qty,
    requestedUnit: r.product?.unit ?? r.yieldUnit,
    scale,
    items: scaledItems,
    totalCost,
    costPerUnit: totalCost / qty,
    originalCost,
  })
})
