import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { nextSeq } from '@/lib/sequence'
import { z } from 'zod'

// ============================================================
// GET /api/admin/purchase-orders?status=&supplierId=&search=
//   Returns array of PurchaseOrderDTO.
//   Permission: products.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'products.read')

  const sp = req.nextUrl.searchParams
  const status = sp.get('status') || ''
  const supplierId = sp.get('supplierId') || ''
  const search = sp.get('search')?.trim() || ''

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (supplierId) where.supplierId = supplierId
  if (search) {
    where.OR = [
      { poNo: { contains: search } },
      { supplier: { name: { contains: search } } },
    ]
  }

  const pos = await db.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      branch: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  })

  return ok({
    purchaseOrders: pos.map((p) => ({
      id: p.id,
      poNo: p.poNo,
      supplierId: p.supplierId,
      supplierName: p.supplier.name,
      supplierCode: p.supplier.code,
      branchId: p.branchId,
      branchName: p.branch?.name ?? null,
      status: p.status,
      total: p.total,
      receivedTotal: p.receivedTotal,
      expectedAt: p.expectedAt?.toISOString() ?? null,
      receivedAt: p.receivedAt?.toISOString() ?? null,
      notes: p.notes,
      userId: p.userId,
      userName: p.user?.name ?? null,
      itemCount: p._count.items,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  })
})

// ============================================================
// POST /api/admin/purchase-orders
//   Creates PO + items in a transaction. Auto-generates poNo with nextSeq.
//   Permission: products.create
// ============================================================
const poItemSchema = z.object({
  productName: z.string().trim().min(1).max(200),
  productId: z.string().optional(),
  quantity: z.number().finite().positive().max(100000),
  unit: z.string().trim().min(1).max(30).default('ชิ้น'),
  unitPrice: z.number().finite().min(0).max(1000000),
  notes: z.string().max(500).optional(),
})

const poCreateSchema = z.object({
  supplierId: z.string().min(1),
  branchId: z.string().optional(),
  expectedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(poItemSchema).min(1, 'ต้องมีอย่างน้อย 1 รายการ').max(200),
})

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'products.create')
  const body = poCreateSchema.parse(await req.json())

  // Verify supplier exists
  const supplier = await db.supplier.findUnique({ where: { id: body.supplierId } })
  if (!supplier) throw new Error('ไม่พบซัพพลายเออร์')

  // Compute total
  const itemsWithTotal = body.items.map((it) => ({
    ...it,
    total: Number((it.quantity * it.unitPrice).toFixed(2)),
  }))
  const total = Number(itemsWithTotal.reduce((s, it) => s + it.total, 0).toFixed(2))

  const poNo = await nextSeq('po', 'PO', 6)

  const po = await db.$transaction(async (tx) => {
    const created = await tx.purchaseOrder.create({
      data: {
        poNo,
        supplierId: body.supplierId,
        branchId: body.branchId || null,
        status: 'DRAFT',
        total,
        receivedTotal: 0,
        expectedAt: body.expectedAt ? new Date(body.expectedAt) : null,
        notes: body.notes || null,
        userId: user.id,
        items: {
          create: itemsWithTotal.map((it) => ({
            productName: it.productName,
            productId: it.productId || null,
            quantity: it.quantity,
            receivedQty: 0,
            unit: it.unit,
            unitPrice: it.unitPrice,
            total: it.total,
            notes: it.notes || null,
          })),
        },
      },
      include: { items: true },
    })
    return created
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'PurchaseOrder',
    entityId: po.id,
    newValue: { poNo: po.poNo, supplierId: po.supplierId, total: po.total, itemCount: po.items.length },
  })

  return created({ po: { id: po.id, poNo: po.poNo } })
})
