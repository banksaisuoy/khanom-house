import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

// ============================================================
// GET /api/admin/suppliers?search=&status=
//   Returns array of SupplierDTO with PO counts.
//   Permission: products.read (suppliers are inventory-adjacent)
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'products.read')

  const sp = req.nextUrl.searchParams
  const search = sp.get('search')?.trim() || ''
  const status = sp.get('status') || '' // active | inactive

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { contactName: { contains: search } },
      { phone: { contains: search } },
    ]
  }
  if (status === 'active') where.isActive = true
  if (status === 'inactive') where.isActive = false

  const suppliers = await db.supplier.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    take: 200,
    include: {
      _count: { select: { purchaseOrders: true } },
    },
  })

  return ok({
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      address: s.address,
      taxId: s.taxId,
      paymentTerms: s.paymentTerms,
      rating: s.rating,
      isActive: s.isActive,
      poCount: s._count.purchaseOrders,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  })
})

// ============================================================
// POST /api/admin/suppliers
//   Creates a new supplier. Auto-generates code from name if not provided.
//   Permission: products.create
// ============================================================
const supplierCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().max(30).optional(),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(254).optional(),
  address: z.string().trim().max(500).optional(),
  taxId: z.string().trim().max(40).optional(),
  paymentTerms: z.string().trim().max(120).optional(),
  rating: z.number().int().min(0).max(5).default(3),
  isActive: z.boolean().default(true),
})

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'products.create')
  const body = supplierCreateSchema.parse(await req.json())

  // Generate code from name if not provided
  let code = body.code?.trim()
  if (!code) {
    const base = body.name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
    const n = await db.supplier.count()
    code = `${base}-${String(n + 1).padStart(3, '0')}`
  }

  const s = await db.supplier.create({
    data: {
      name: body.name,
      code,
      contactName: body.contactName || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      taxId: body.taxId || null,
      paymentTerms: body.paymentTerms || null,
      rating: body.rating,
      isActive: body.isActive,
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'Supplier',
    entityId: s.id,
    oldValue: null,
    newValue: { name: s.name, code: s.code },
  })

  return created({
    supplier: {
      id: s.id,
      name: s.name,
      code: s.code,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      address: s.address,
      taxId: s.taxId,
      paymentTerms: s.paymentTerms,
      rating: s.rating,
      isActive: s.isActive,
      poCount: 0,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    },
  })
})
