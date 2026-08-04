import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, conflict, handle } from '@/lib/api-response'
import { validate, customerCreateSchema } from '@/lib/validation'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'
import { computeTier } from '@/lib/admin-ui'

// ============================================================
// GET /api/admin/customers?tier=&q=&birthdayMonth=
// Filters out soft-deleted (deletedAt !== null).
// Permission: customers.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'customers.read')

  const sp = req.nextUrl.searchParams
  const tier = sp.get('tier') || undefined
  const q = sp.get('q')?.trim() || undefined
  const birthdayMonth = sp.get('birthdayMonth')

  const where: Record<string, unknown> = { deletedAt: null }
  if (tier && tier !== 'all') where.tier = tier
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ]
  }

  function serializeCustomer(c: {
    id: string
    name: string
    phone: string
    email: string | null
    tier: string
    points: number
    totalSpent: number
    visitCount: number
    birthday: Date | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
    orders?: { id: string; orderNo: string; total: number; createdAt: Date; status: string }[]
  }) {
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      tier: c.tier,
      points: c.points,
      totalSpent: c.totalSpent,
      visitCount: c.visitCount,
      birthday: c.birthday ? c.birthday.toISOString() : null,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastOrder: c.orders?.[0]
        ? {
            id: c.orders[0].id,
            orderNo: c.orders[0].orderNo,
            total: c.orders[0].total,
            createdAt: c.orders[0].createdAt.toISOString(),
            status: c.orders[0].status,
          }
        : null,
    }
  }

  if (birthdayMonth) {
    const m = Number(birthdayMonth)
    const all = await db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    const filtered = all.filter((c) => c.birthday && new Date(c.birthday).getMonth() === m)
    return ok({ customers: filtered.map(serializeCustomer) })
  }

  const customers = await db.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, orderNo: true, total: true, createdAt: true, status: true },
      },
    },
  })
  return ok({ customers: customers.map(serializeCustomer) })
})

// ============================================================
// POST /api/admin/customers
// Validates with customerCreateSchema (normalizes phone).
// Permission: customers.create
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'customers.create')
  const body = validate(customerCreateSchema, await req.json())

  const existing = await db.customer.findUnique({ where: { phone: body.phone } })
  if (existing && !existing.deletedAt) {
    return conflict('เบอร์โทรนี้มีอยู่ในระบบแล้ว')
  }
  // If existing but soft-deleted, restore
  if (existing && existing.deletedAt) {
    const c = await db.customer.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        email: body.email ?? null,
        deletedAt: null,
        points: body.points,
        tier: computeTier(body.points),
      },
    })
    await logAudit({
      userId: user.id,
      action: 'CREATE',
      entity: 'Customer',
      entityId: c.id,
      newValue: safeJson({ name: c.name, phone: c.phone, tier: c.tier, restored: true }),
    })
    return created({ ok: true, id: c.id })
  }

  const c = await db.customer.create({
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
      tier: computeTier(body.points),
      points: body.points,
      totalSpent: 0,
      visitCount: 0,
      birthday: body.birthday ? new Date(body.birthday) : null,
      notes: body.notes ?? null,
    },
  })
  if (body.points > 0) {
    await db.loyaltyLog.create({
      data: {
        customerId: c.id,
        type: 'BONUS',
        points: body.points,
        reason: 'คะแนนเริ่มต้น',
      },
    })
  }
  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'Customer',
    entityId: c.id,
    newValue: safeJson({ name: c.name, phone: c.phone, tier: c.tier }),
  })
  return created({ ok: true, id: c.id })
})
