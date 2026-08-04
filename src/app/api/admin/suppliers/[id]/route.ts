import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const supplierUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().max(30).optional(),
  contactName: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().max(254).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  taxId: z.string().trim().max(40).optional().nullable(),
  paymentTerms: z.string().trim().max(120).optional().nullable(),
  rating: z.number().int().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/admin/suppliers/[id]
// Permission: products.update
export const PATCH = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'products.update')
  const { id } = await params
  const body = supplierUpdateSchema.parse(await req.json())

  const existing = await db.supplier.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบซัพพลายเออร์')

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.code !== undefined) data.code = body.code
  if (body.contactName !== undefined) data.contactName = body.contactName ?? null
  if (body.phone !== undefined) data.phone = body.phone ?? null
  if (body.email !== undefined) data.email = body.email ?? null
  if (body.address !== undefined) data.address = body.address ?? null
  if (body.taxId !== undefined) data.taxId = body.taxId ?? null
  if (body.paymentTerms !== undefined) data.paymentTerms = body.paymentTerms ?? null
  if (typeof body.rating === 'number') data.rating = body.rating
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive

  const s = await db.supplier.update({ where: { id }, data })
  await logAudit({
    userId: user.id,
    action: 'UPDATE',
    entity: 'Supplier',
    entityId: id,
    oldValue: safeJson({ name: existing.name, code: existing.code, phone: existing.phone, isActive: existing.isActive }),
    newValue: safeJson({ name: s.name, code: s.code, phone: s.phone, isActive: s.isActive }),
  })

  return ok({ ok: true })
})

// DELETE — soft delete (isActive=false)
// Permission: products.delete
export const DELETE = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'products.delete')
  const { id } = await params
  const existing = await db.supplier.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบซัพพลายเออร์')

  await db.supplier.update({ where: { id }, data: { isActive: false } })
  await logAudit({
    userId: user.id,
    action: 'DELETE',
    entity: 'Supplier',
    entityId: id,
    oldValue: safeJson({ name: existing.name, code: existing.code }),
  })
  return ok({ ok: true })
})
