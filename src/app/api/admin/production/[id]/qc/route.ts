import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, ConflictError, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'

// ============================================================
// POST /api/admin/production/[id]/qc
// AUDIT FIX C-10 (paired) + M-14: inventory increment moved here.
//   - On PASS: status QC → COMPLETED, increment inventory by producedQty,
//     create StockMovement PRODUCTION, set completedAt.
//   - On FAIL: status stays QC, optional WasteLog.
//   - Guard: updateMany on (id, status='QC') prevents double-QC.
// Permission: kitchen.qc
// ============================================================

// Permissive schema — accepts the spec's {status, note?, checklist?} PLUS
// the existing frontend's optional `logWaste` field for backward compat.
const qcSchema = z.object({
  status: z.enum(['PASS', 'FAIL']),
  note: z.string().max(500).optional(),
  checklist: z.array(z.boolean()).optional(),
  logWaste: z
    .object({
      quantity: z.number().positive().max(100000),
      reason: z.string().max(500).optional(),
    })
    .optional(),
})

export const POST = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'kitchen.qc')
    const { id } = await ctx.params
    const body = qcSchema.parse(await req.json())

    const batch = await db.productionBatch.findUnique({
      where: { id },
      include: { product: true },
    })
    if (!batch) throw new NotFoundError('ไม่พบคิวผลิต')

    const branch = await db.branch.findFirst({ where: { isMain: true } })
    if (!branch) throw new NotFoundError('ไม่พบสาขา')

    const result = await db.$transaction(async (tx) => {
      // Atomic guard: only allow QC if status is QC
      const r = await tx.productionBatch.updateMany({
        where: { id, status: 'QC' },
        data: {
          qcStatus: body.status,
          qcNote: body.note,
          status: body.status === 'PASS' ? 'COMPLETED' : 'QC',
          ...(body.status === 'PASS' ? { completedAt: new Date() } : {}),
        },
      })
      if (r.count === 0) {
        throw new ConflictError('ไม่สามารถบันทึก QC ได้ (สถานะไม่ใช่ QC หรือตรวจแล้ว)')
      }

      // On PASS — increment inventory by producedQty + StockMovement PRODUCTION
      if (body.status === 'PASS' && batch.producedQty > 0) {
        let inv = await tx.inventory.findFirst({
          where: {
            productId: batch.productId,
            branchId: branch.id,
            type: 'FINISHED',
          },
        })
        if (!inv) {
          inv = await tx.inventory.create({
            data: {
              productId: batch.productId,
              branchId: branch.id,
              type: 'FINISHED',
              quantity: batch.producedQty,
              unit: batch.product.unit,
            },
          })
        } else {
          inv = await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { increment: batch.producedQty } },
          })
        }
        await tx.stockMovement.create({
          data: {
            inventoryId: inv.id,
            type: 'PRODUCTION',
            quantity: batch.producedQty,
            reason: `Production ${batch.batchNo}`,
            refType: 'PRODUCTION',
            refId: batch.id,
            userId: user.id,
          },
        })
      }

      // On FAIL — optional waste log
      if (
        body.status === 'FAIL' &&
        body.logWaste &&
        body.logWaste.quantity > 0
      ) {
        await tx.wasteLog.create({
          data: {
            productId: batch.productId,
            productName: batch.product.name,
            batchNo: batch.batchNo,
            userId: user.id,
            source: 'PRODUCTION',
            quantity: body.logWaste.quantity,
            unit: batch.product.unit,
            value: body.logWaste.quantity * batch.product.costPrice,
            reason: body.logWaste.reason || `QC FAIL ${batch.batchNo}`,
          },
        })
      }

      return body.status === 'PASS' ? 'COMPLETED' : 'QC'
    })

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'ProductionBatch',
      entityId: id,
      oldValue: { status: 'QC' },
      newValue: { status: result, qcStatus: body.status },
    })

    return ok({ ok: true, status: result, qcStatus: body.status })
  }
)
