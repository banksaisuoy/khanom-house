import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

function mapRecipe(r: {
  id: string
  productId: string
  yieldQty: number
  yieldUnit: string
  prepTimeMin: number
  cookTimeMin: number
  instructions: string | null
  items: { id: string; ingredientName: string; quantity: number; unit: string; costPerUnit: number }[]
  product: { name: string; slug: string; type: string } | null
}) {
  const items = r.items.map((it) => ({
    id: it.id,
    ingredientName: it.ingredientName,
    quantity: it.quantity,
    unit: it.unit,
    costPerUnit: it.costPerUnit,
    lineCost: it.quantity * it.costPerUnit,
  }))
  const totalCost = items.reduce((s, it) => s + it.lineCost, 0)
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
    costPerUnit: r.yieldQty > 0 ? totalCost / r.yieldQty : 0,
  }
}

// GET /api/admin/recipes/[id]
// Permission: recipes.read
export const GET = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'recipes.read')
  const { id } = await params
  const r = await db.recipe.findUnique({
    where: { id },
    include: {
      items: true,
      product: { select: { name: true, slug: true, type: true } },
    },
  })
  if (!r) throw new NotFoundError('ไม่พบสูตร')
  return ok({ recipe: mapRecipe(r) })
})

// PATCH /api/admin/recipes/[id]
// Permission: recipes.update
export const PATCH = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'recipes.update')
  const { id } = await params
  const body = (await req.json()) as {
    yieldQty: number
    yieldUnit: string
    prepTimeMin: number
    cookTimeMin: number
    instructions?: string | null
    items: { ingredientName: string; quantity: number; unit: string; costPerUnit: number }[]
  }
  const existing = await db.recipe.findUnique({ where: { id }, include: { items: true } })
  if (!existing) throw new NotFoundError('ไม่พบสูตร')
  if (!body.items?.length) throw new NotFoundError('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ')

  await db.$transaction(async (tx) => {
    await tx.recipe.update({
      where: { id },
      data: {
        yieldQty: body.yieldQty,
        yieldUnit: body.yieldUnit,
        prepTimeMin: body.prepTimeMin ?? 0,
        cookTimeMin: body.cookTimeMin ?? 0,
        instructions: body.instructions || null,
      },
    })
    await tx.recipeItem.deleteMany({ where: { recipeId: id } })
    await tx.recipeItem.createMany({
      data: body.items.map((it) => ({
        recipeId: id,
        ingredientName: it.ingredientName.trim(),
        quantity: it.quantity,
        unit: it.unit,
        costPerUnit: it.costPerUnit,
      })),
    })
  })

  // AUDIT (P3-6): log recipe update (yield/times + items rewrite).
  await logAudit({
    userId: user.id,
    action: 'UPDATE',
    entity: 'Recipe',
    entityId: id,
    oldValue: safeJson({
      yieldQty: existing.yieldQty,
      yieldUnit: existing.yieldUnit,
      prepTimeMin: existing.prepTimeMin,
      cookTimeMin: existing.cookTimeMin,
      itemsCount: existing.items.length,
    }),
    newValue: safeJson({
      yieldQty: body.yieldQty,
      yieldUnit: body.yieldUnit,
      prepTimeMin: body.prepTimeMin ?? 0,
      cookTimeMin: body.cookTimeMin ?? 0,
      itemsCount: body.items.length,
    }),
  })

  const refreshed = await db.recipe.findUnique({
    where: { id },
    include: {
      items: true,
      product: { select: { name: true, slug: true, type: true } },
    },
  })
  return ok({ recipe: refreshed ? mapRecipe(refreshed) : null })
})

// DELETE /api/admin/recipes/[id]
// Permission: recipes.delete
export const DELETE = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'recipes.delete')
  const { id } = await params
  const existing = await db.recipe.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบสูตร')
  await db.recipe.delete({ where: { id } }) // cascade deletes items
  await logAudit({
    userId: user.id,
    action: 'DELETE',
    entity: 'Recipe',
    entityId: id,
    oldValue: safeJson({ productId: existing.productId, yieldQty: existing.yieldQty }),
  })
  return ok({ ok: true })
})
