import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { nextSeq } from '@/lib/sequence'
import { logAudit } from '@/lib/audit'

// ============================================================
// GET /api/admin/production?status=&today=
// Returns active batches (QUEUED, COOKING, QC, COMPLETED today)
// Permission: kitchen.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'kitchen.read')

  const sp = req.nextUrl.searchParams
  const statusFilter = sp.get('status')
  const todayOnly = sp.get('today') === '1'
  const productsWithRecipes = sp.get('products-with-recipes') === '1'

  // Special mode: list products that have a recipe (for start-production dialog)
  if (productsWithRecipes) {
    const withRecipe = await db.product.findMany({
      where: { isActive: true, recipe: { isNot: null } },
      include: { recipe: { include: { items: true } } },
      orderBy: { name: 'asc' },
    })
    return ok({
      products: withRecipe.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        unit: p.unit,
        recipe: p.recipe
          ? {
              yieldQty: p.recipe.yieldQty,
              yieldUnit: p.recipe.yieldUnit,
              prepTimeMin: p.recipe.prepTimeMin,
              cookTimeMin: p.recipe.cookTimeMin,
              instructions: p.recipe.instructions,
              items: p.recipe.items.map((ri) => ({
                ingredientName: ri.ingredientName,
                quantity: ri.quantity,
                unit: ri.unit,
                costPerUnit: ri.costPerUnit,
              })),
            }
          : null,
      })),
    })
  }

  const where: Record<string, unknown> = {}
  if (statusFilter) {
    where.status = statusFilter
  } else {
    where.status = { in: ['QUEUED', 'COOKING', 'QC', 'COMPLETED'] }
  }
  if (todayOnly) {
    where.createdAt = { gte: new Date(Date.now() - 24 * 3600 * 1000) }
  }

  const batches = await db.productionBatch.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          unit: true,
          recipe: { include: { items: true } },
        },
      },
      user: { select: { id: true, name: true } },
    },
  })

  return ok({
    items: batches.map((b) => ({
      id: b.id,
      batchNo: b.batchNo,
      productId: b.productId,
      productName: b.product.name,
      productSlug: b.product.slug,
      productType: b.product.type,
      unit: b.product.unit,
      plannedQty: b.plannedQty,
      producedQty: b.producedQty,
      wastedQty: b.wastedQty,
      status: b.status,
      priority: b.priority,
      startedAt: b.startedAt?.toISOString() ?? null,
      completedAt: b.completedAt?.toISOString() ?? null,
      qcStatus: b.qcStatus,
      qcNote: b.qcNote,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      cookName: b.user?.name ?? null,
      recipe: b.product.recipe
        ? {
            yieldQty: b.product.recipe.yieldQty,
            yieldUnit: b.product.recipe.yieldUnit,
            prepTimeMin: b.product.recipe.prepTimeMin,
            cookTimeMin: b.product.recipe.cookTimeMin,
            instructions: b.product.recipe.instructions,
            items: b.product.recipe.items.map((ri) => ({
              ingredientName: ri.ingredientName,
              quantity: ri.quantity,
              unit: ri.unit,
              costPerUnit: ri.costPerUnit,
            })),
          }
        : null,
    })),
  })
})

// ============================================================
// POST /api/admin/production — create new batch (QUEUED)
// Uses nextSeq for batchNo (fixes count()+1 race).
// Permission: kitchen.create
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'kitchen.create')
  const body = await req.json()
  const { productId, plannedQty, priority, notes } = body as {
    productId: string
    plannedQty: number
    priority?: number
    notes?: string
  }
  if (!productId || !plannedQty || plannedQty <= 0) {
    return ok({ ok: false, error: 'ข้อมูลไม่ครบ' })
  }

  const batchNo = await nextSeq('batch', 'BATCH-', 6)

  const batch = await db.productionBatch.create({
    data: {
      batchNo,
      productId,
      userId: user.id,
      plannedQty,
      status: 'QUEUED',
      priority: priority ?? 0,
      notes,
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'ProductionBatch',
    entityId: batch.id,
    newValue: `Created ${batchNo} qty=${plannedQty}`,
  })

  return created({ ok: true, batchId: batch.id, batchNo })
})
