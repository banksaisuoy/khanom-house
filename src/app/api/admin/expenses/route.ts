import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission, requireBranchAccess } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

// ============================================================
// GET /api/admin/expenses?from=&to=&category=&branchId=&search=
//   Returns array of ExpenseDTO + summary aggregates.
//   Permission: accounting.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'accounting.read')

  const sp = req.nextUrl.searchParams
  const from = sp.get('from') || ''
  const to = sp.get('to') || ''
  const category = sp.get('category') || ''
  const branchId = sp.get('branchId') || ''
  const search = sp.get('search')?.trim() || ''

  const where: Record<string, unknown> = {}
  if (from || to) {
    const range: Record<string, unknown> = {}
    if (from) range.gte = new Date(from)
    if (to) {
      const tTo = new Date(to)
      tTo.setHours(23, 59, 59, 999)
      range.lte = tTo
    }
    where.date = range
  }
  if (category) where.category = category
  if (branchId) {
    where.branchId = branchId
  }
  if (search) {
    where.description = { contains: search }
  }

  const [expenses, byCategory] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 500,
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    db.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: true,
      where,
    }),
  ])

  return ok({
    expenses: expenses.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      category: e.category,
      description: e.description,
      amount: e.amount,
      branchId: e.branchId,
      branchName: e.branch?.name ?? null,
      receiptUrl: e.receiptUrl,
      userId: e.userId,
      userName: e.user?.name ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    byCategory: byCategory.map((c) => ({
      category: c.category,
      amount: c._sum.amount ?? 0,
      count: c._count,
    })),
  })
})

// ============================================================
// POST /api/admin/expenses
//   Creates a new expense.
//   Permission: accounting.create
// ============================================================
const expenseCreateSchema = z.object({
  date: z.string().datetime().optional(),
  category: z.enum(['INGREDIENT', 'UTILITY', 'MARKETING', 'SALARY', 'RENT', 'OTHER']),
  description: z.string().trim().min(1).max(500),
  amount: z.number().finite().positive().max(10_000_000),
  branchId: z.string().optional(),
  receiptUrl: z.string().max(500).optional(),
})

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'accounting.create')
  const body = expenseCreateSchema.parse(await req.json())

  if (body.branchId) {
    requireBranchAccess(user, body.branchId)
  }

  const e = await db.expense.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      category: body.category,
      description: body.description,
      amount: body.amount,
      branchId: body.branchId || null,
      receiptUrl: body.receiptUrl || null,
      userId: user.id,
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'Expense',
    entityId: e.id,
    newValue: { category: e.category, description: e.description, amount: e.amount, date: e.date },
  })

  return created({
    expense: {
      id: e.id,
      date: e.date.toISOString(),
      category: e.category,
      description: e.description,
      amount: e.amount,
      branchId: e.branchId,
      receiptUrl: e.receiptUrl,
      userId: e.userId,
      createdAt: e.createdAt.toISOString(),
    },
  })
})
