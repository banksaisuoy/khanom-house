import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError, ConflictError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const PO_STATUS_FLOW: Record<string, string[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PARTIAL', 'RECEIVED', 'CANCELLED'],
  PARTIAL: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
}

// GET /api/admin/purchase-orders/[id]
//   Returns PO detail with items.
//   Permission: products.read
export const GET = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'products.read')
  const { id } = await params

  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      branch: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: { orderBy: { id: 'asc' } },
    },
  })
  if (!po) throw new NotFoundError('ไม่พบใบสั่งซื้อ')

  return ok({
    id: po.id,
    poNo: po.poNo,
    supplierId: po.supplierId,
    supplier: po.supplier,
    branchId: po.branchId,
    branch: po.branch,
    status: po.status,
    total: po.total,
    receivedTotal: po.receivedTotal,
    expectedAt: po.expectedAt?.toISOString() ?? null,
    receivedAt: po.receivedAt?.toISOString() ?? null,
    notes: po.notes,
    user: po.user,
    items: po.items.map((it) => ({
      id: it.id,
      productName: it.productName,
      productId: it.productId,
      quantity: it.quantity,
      receivedQty: it.receivedQty,
      unit: it.unit,
      unitPrice: it.unitPrice,
      total: it.total,
      notes: it.notes,
    })),
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
  })
})

const poPatchSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED']).optional(),
  expectedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

// PATCH /api/admin/purchase-orders/[id]
//   Updates PO status (with state-machine guard), expectedAt, notes.
//   Status transitions are validated against PO_STATUS_FLOW.
//   Permission: products.update
export const PATCH = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'products.update')
  const { id } = await params
  const body = poPatchSchema.parse(await req.json())

  const existing = await db.purchaseOrder.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบใบสั่งซื้อ')

  const data: Record<string, unknown> = {}
  if (body.status !== undefined && body.status !== existing.status) {
    const allowed = PO_STATUS_FLOW[existing.status] ?? []
    if (!allowed.includes(body.status)) {
      throw new ConflictError(
        `ไม่สามารถเปลี่ยนสถานะจาก ${existing.status} เป็น ${body.status} ได้`
      )
    }
    data.status = body.status
  }
  if (body.expectedAt !== undefined) {
    data.expectedAt = body.expectedAt ? new Date(body.expectedAt) : null
  }
  if (body.notes !== undefined) data.notes = body.notes ?? null

  const po = await db.purchaseOrder.update({ where: { id }, data })

  await logAudit({
    userId: user.id,
    action: 'STATUS_CHANGE',
    entity: 'PurchaseOrder',
    entityId: id,
    oldValue: safeJson({ status: existing.status, notes: existing.notes }),
    newValue: safeJson({ status: po.status, notes: po.notes }),
  })

  return ok({ ok: true })
})
