import { db } from '@/lib/db'
import { KitchenBoard } from '@/components/admin/kitchen/kitchen-board'
import type { BatchDTO } from '@/components/admin/kitchen/batch-card'

export const dynamic = 'force-dynamic'

async function getBatches(): Promise<BatchDTO[]> {
  const rows = await db.productionBatch.findMany({
    where: { status: { in: ['QUEUED', 'COOKING', 'QC', 'COMPLETED'] } },
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
  return rows.map((b) => ({
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
  }))
}

async function getBranchName() {
  const b = await db.branch.findFirst({ where: { isMain: true } })
  return b?.name ?? 'สาขา'
}

export default async function KitchenPage() {
  const [batches, branchName] = await Promise.all([getBatches(), getBranchName()])
  return <KitchenBoard initialBatches={batches} branchName={branchName} />
}
