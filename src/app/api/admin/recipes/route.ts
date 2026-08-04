import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import type { RecipeDTO, RecipeItemDTO } from '@/lib/admin-catalog'
import { ok, created, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

function mapRecipe(r: {
  id: string
  productId: string
  yieldQty: number
  yieldUnit: string
  prepTimeMin: number
  cookTimeMin: number
  instructions: string | null
  items: {
    id: string
    ingredientName: string
    quantity: number
    unit: string
    costPerUnit: number
  }[]
  product: { name: string; slug: string; type: string } | null
}): RecipeDTO {
  const items: RecipeItemDTO[] = r.items.map((it) => ({
    id: it.id,
    ingredientName: it.ingredientName,
    quantity: it.quantity,
    unit: it.unit,
    costPerUnit: it.costPerUnit,
    lineCost: it.quantity * it.costPerUnit,
  }))
  const totalCost = items.reduce((s, it) => s + it.lineCost, 0)
  const costPerUnit = r.yieldQty > 0 ? totalCost / r.yieldQty : 0
  return {
    id: r.id,
    productId: r.productId,
    productName: r.product?.name ?? '',
    productSlug: r.product?.slug ?? null,
    productType: r.product?.type ?? null,
    yieldQty: r.yieldQty,
    yieldUnit: r.yieldUnit,
    prepTimeMin: r.prepTimeMin,
    cookTimeMin: r.cookTimeMin,
    instructions: r.instructions,
    items,
    totalCost,
    costPerUnit,
  }
}

// GET /api/admin/recipes
//   ?productId=   return single recipe for a product
//   ?noRecipe=1   returns products that have NO recipe (for the create dialog picker)
// Permission: recipes.read
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'recipes.read')

  const sp = req.nextUrl.searchParams
  const productId = sp.get('productId') || ''

  if (productId) {
    const r = await db.recipe.findUnique({
      where: { productId },
      include: {
        items: true,
        product: { select: { name: true, slug: true, type: true } },
      },
    })
    if (!r) return ok({ recipe: null })
    return ok({ recipe: mapRecipe(r) })
  }

  const recipes = await db.recipe.findMany({
    orderBy: { product: { name: 'asc' } },
    include: {
      items: true,
      product: { select: { name: true, slug: true, type: true, isActive: true } },
    },
  })
  const dto = recipes
    .filter((r) => r.product?.isActive !== false)
    .map(mapRecipe)

  // Products without recipes
  const allActiveProducts = await db.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, type: true, unit: true, costPrice: true, price: true },
  })
  const withRecipe = new Set(recipes.map((r) => r.productId))
  const withoutRecipe = allActiveProducts
    .filter((p) => !withRecipe.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, type: p.type, unit: p.unit }))

  // Existing ingredient names (autocomplete)
  const allItems = await db.recipeItem.findMany({ select: { ingredientName: true } })
  const ingredientNames = Array.from(new Set(allItems.map((i) => i.ingredientName))).sort()

  return ok({
    recipes: dto,
    productsWithoutRecipe: withoutRecipe,
    ingredientNames,
  })
})

// POST /api/admin/recipes
// AUDIT FIX M-10: use upsert instead of findUnique+create.
// Body: {
//   productId, yieldQty, yieldUnit, prepTimeMin, cookTimeMin, instructions,
//   items: [{ ingredientName, quantity, unit, costPerUnit }]
// }
// Permission: recipes.create
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'recipes.create')
  const body = (await req.json()) as {
    productId: string
    yieldQty: number
    yieldUnit: string
    prepTimeMin: number
    cookTimeMin: number
    instructions?: string | null
    items: { ingredientName: string; quantity: number; unit: string; costPerUnit: number }[]
  }

  if (!body.productId) throw new NotFoundError('กรุณาระบุสินค้า')
  if (!body.items?.length) throw new NotFoundError('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ')
  if (body.yieldQty <= 0) throw new NotFoundError('ปริมาณผลผลิตต้องมากกว่า 0')

  const product = await db.product.findUnique({ where: { id: body.productId } })
  if (!product) throw new NotFoundError('ไม่พบสินค้า')

  const recipeId = await db.$transaction(async (tx) => {
    // AUDIT FIX M-10: use upsert (atomic — no find-then-create race)
    const upserted = await tx.recipe.upsert({
      where: { productId: body.productId },
      create: {
        productId: body.productId,
        yieldQty: body.yieldQty,
        yieldUnit: body.yieldUnit,
        prepTimeMin: body.prepTimeMin ?? 0,
        cookTimeMin: body.cookTimeMin ?? 0,
        instructions: body.instructions || null,
      },
      update: {
        yieldQty: body.yieldQty,
        yieldUnit: body.yieldUnit,
        prepTimeMin: body.prepTimeMin ?? 0,
        cookTimeMin: body.cookTimeMin ?? 0,
        instructions: body.instructions || null,
      },
    })
    // Replace items: delete-all + create-many in same tx
    await tx.recipeItem.deleteMany({ where: { recipeId: upserted.id } })
    await tx.recipeItem.createMany({
      data: body.items.map((it) => ({
        recipeId: upserted.id,
        ingredientName: it.ingredientName.trim(),
        quantity: it.quantity,
        unit: it.unit,
        costPerUnit: it.costPerUnit,
      })),
    })
    return upserted.id
  })

  const refreshed = await db.recipe.findUnique({
    where: { id: recipeId },
    include: {
      items: true,
      product: { select: { name: true, slug: true, type: true } },
    },
  })
  void user
  return created({ recipe: refreshed ? mapRecipe(refreshed) : null })
})
