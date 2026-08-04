import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const expenseUpdateSchema = z.object({
  date: z.string().datetime().optional(),
  category: z.enum(['INGREDIENT', 'UTILITY', 'MARKETING', 'SALARY', 'RENT', 'OTHER']).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  amount: z.number().finite().positive().max(10_000_000).optional(),
  branchId: z.string().nullable().optional(),
  receiptUrl: z.string().max(500).nullable().optional(),
})

// PATCH /api/admin/expenses/[id]
// Permission: accounting.update
export const PATCH = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'accounting.update')
  const { id } = await params
  const body = expenseUpdateSchema.parse(await req.json())

  const existing = await db.expense.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบค่าใช้จ่าย')

  if (body.branchId !== undefined && body.branchId) {
    requireBranchAccess(user, body.branchId)
  }

  const data: Record<string, unknown> = {}
  if (body.date !== undefined) data.date = new Date(body.date)
  if (body.category !== undefined) data.category = body.category
  if (body.description !== undefined) data.description = body.description
  if (typeof body.amount === 'number') data.amount = body.amount
  if (body.branchId !== undefined) data.branchId = body.branchId || null
  if (body.receiptUrl !== undefined) data.receiptUrl = body.receiptUrl || null

  const e = await db.expense.update({ where: { id }, data })
  await logAudit({
    userId: user.id,
    action: 'UPDATE',
    entity: 'Expense',
    entityId: id,
    oldValue: safeJson({ category: existing.category, description: existing.description, amount: existing.amount }),
    newValue: safeJson({ category: e.category, description: e.description, amount: e.amount }),
  })

  return ok({ ok: true })
})

// DELETE /api/admin/expenses/[id]  (hard delete — expenses are correctable)
// Permission: accounting.delete
export const DELETE = handle(async (req: NextRequest, { params }: Params) => {
  const user = await requirePermission(req, 'accounting.delete')
  const { id } = await params
  const existing = await db.expense.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบค่าใช้จ่าย')

  await db.expense.delete({ where: { id } })
  await logAudit({
    userId: user.id,
    action: 'DELETE',
    entity: 'Expense',
    entityId: id,
    oldValue: safeJson({ category: existing.category, description: existing.description, amount: existing.amount }),
  })
  return ok({ ok: true })
})
