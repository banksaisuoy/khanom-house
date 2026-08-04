import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, ConflictError, NotFoundError } from '@/lib/api-response'
import { validate, productionCompleteSchema } from '@/lib/validation'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/production/[id]/complete
// AUDIT FIX C-10: allows re-completion → double inventory increment.
// Fix: updateMany guard (status must be COOKING); inventory increment is
//      moved to /qc (PASS) — this route only sets status to QC + records
//      produced/wasted quantities + WasteLog.
// Permission: kitchen.complete
// ============================================================
export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'kitchen.complete')
    const { id } = await ctx.params
    const body = validate(productionCompleteSchema, await req.json())

    const batch = await db.productionBatch.findUnique({
      where: { id },
      include: { product: true },
    })
    if (!batch) throw new NotFoundError('ไม่พบคิวผลิต')

    const branch = await db.branch.findFirst({ where: { isMain: true } })
    if (!branch) throw new NotFoundError('ไม่พบสาขา')

    await db.$transaction(async (tx) => {
      // Atomic guard: only allow transition from COOKING → QC
      const r = await tx.productionBatch.updateMany({
        where: { id, status: 'COOKING' },
        data: {
          status: 'QC',
          producedQty: body.producedQty,
          wastedQty: body.wastedQty,
          completedAt: new Date(),
          notes: body.notes,
          qcStatus: 'PENDING',
        },
      })
      if (r.count === 0) {
        throw new ConflictError(
          'ไม่สามารถบันทึกผลผลิตได้ (สถานะไม่ใช่ COOKING หรือบันทึกแล้ว)'
        )
      }

      // Waste log for wastedQty if any (still created here — waste happens during cooking)
      if (body.wastedQty > 0) {
        await tx.wasteLog.create({
          data: {
            productId: batch.productId,
            productName: batch.product.name,
            batchNo: batch.batchNo,
            userId: user.id,
            source: 'PRODUCTION',
            quantity: body.wastedQty,
            unit: batch.product.unit,
            value: body.wastedQty * batch.product.costPrice,
            reason: `Waste from ${batch.batchNo}`,
          },
        })
      }

      // NOTE: Inventory increment is intentionally NOT done here.
      // It happens in /qc on PASS — prevents double-increment if /complete
      // is called twice (the guard above prevents that anyway).
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'ProductionBatch',
      entityId: id,
      oldValue: { status: 'COOKING' },
      newValue: { status: 'QC', producedQty: body.producedQty, wastedQty: body.wastedQty },
    })

    return ok({
      ok: true,
      status: 'QC',
      producedQty: body.producedQty,
      wastedQty: body.wastedQty,
    })
  }
)
