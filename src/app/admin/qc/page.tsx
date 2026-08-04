import { db } from '@/lib/db'
import { QcBoard } from '@/components/admin/qc/qc-board'
import type { BatchDTO } from '@/components/admin/kitchen/batch-card'

export const dynamic = 'force-dynamic'

async function getBatchesByStatus(statuses: string[]) {
  const rows = await db.productionBatch.findMany({
    where: { status: { in: statuses } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
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
  })) as BatchDTO[]
}

export default async function QcPage() {
  // Pending QC: status = 'QC' and qcStatus is null/PENDING
  const [qcRows, completedRows] = await Promise.all([
    db.productionBatch.findMany({
      where: { status: 'QC' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: {
        product: { select: { id: true, name: true, slug: true, type: true, unit: true, recipe: { include: { items: true } } } },
        user: { select: { id: true, name: true } },
      },
    }),
    db.productionBatch.findMany({
      where: { qcStatus: 'PASS' },
      orderBy: { completedAt: 'desc' },
      take: 30,
      include: {
        product: { select: { id: true, name: true, slug: true, type: true, unit: true, recipe: { include: { items: true } } } },
        user: { select: { id: true, name: true } },
      },
    }),
  ])

  const mapBatch = (b: typeof qcRows[number]): BatchDTO => ({
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
  })

  const pending = qcRows
    .filter((b) => !b.qcStatus || b.qcStatus === 'PENDING')
    .map(mapBatch)
  const passed = completedRows.map(mapBatch)

  // silence unused
  void getBatchesByStatus

  return <QcBoard initialPending={pending} initialPassed={passed} />
}
