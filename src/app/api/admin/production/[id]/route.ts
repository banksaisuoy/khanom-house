import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/production/[id] — single batch detail
// Permission: kitchen.read
// ============================================================
export const GET = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    await requirePermission(req, 'kitchen.read')
    const { id } = await ctx.params

    const b = await db.productionBatch.findUnique({
      where: { id },
      include: {
        product: {
          include: { recipe: { include: { items: true } } },
        },
        user: { select: { name: true } },
      },
    })
    if (!b) throw new NotFoundError('ไม่พบคิวผลิต')
    return ok({
      id: b.id,
      batchNo: b.batchNo,
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
      productName: b.product.name,
      unit: b.product.unit,
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
  }
)

// ============================================================
// PATCH /api/admin/production/[id]
// AUDIT FIX C-11: mass-assignment bypasses /complete flow.
// Fix: allowlist only `notes` and `priority`. Status/producedQty/wastedQty
//      must go through /start, /complete, /qc.
// Permission: kitchen.update
// ============================================================
export const PATCH = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'kitchen.update')
    const { id } = await ctx.params

    const body = (await req.json()) as Record<string, unknown>
    const data: Record<string, unknown> = {}
    if (typeof body.notes === 'string') data.notes = body.notes
    if (typeof body.priority === 'number') data.priority = body.priority

    if (Object.keys(data).length === 0) {
      return ok({ ok: true, status: undefined })
    }

    const updated = await db.productionBatch.update({ where: { id }, data })
    return ok({ ok: true, status: updated.status })
  }
)
