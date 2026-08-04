import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, conflict, handle } from '@/lib/api-response'
import { validate, customerCreateSchema } from '@/lib/validation'
import { rateLimitResponse } from '@/lib/rate-limit'

// ============================================================
// POST /api/customers/register  (public — storefront loyalty signup)
// AUDIT FIX H-13: returns existing customer on duplicate phone (info leak).
// Fix: on duplicate, return conflict with NO customer data.
// Validates + normalizes phone via customerCreateSchema.
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  // AUDIT (P3-9): IP-based rate limit (5 req/min) — public endpoint.
  const limited = rateLimitResponse(req)
  if (limited) return limited

  const body = validate(customerCreateSchema, await req.json())

  const existing = await db.customer.findUnique({ where: { phone: body.phone } })
  if (existing && !existing.deletedAt) {
    return conflict('เบอร์โทรนี้ลงทะเบียนแล้ว')
  }

  // If existing but soft-deleted, restore
  if (existing && existing.deletedAt) {
    const customer = await db.customer.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        email: body.email ?? null,
        deletedAt: null,
      },
    })
    const memberCode = 'KH' + customer.id.slice(-6).toUpperCase()
    return created({
      ok: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        tier: customer.tier,
        points: customer.points,
      },
      memberCode,
    })
  }

  const customer = await db.customer.create({
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
      tier: 'BRONZE',
      points: 0,
      totalSpent: 0,
      visitCount: 0,
    },
  })
  const memberCode = 'KH' + customer.id.slice(-6).toUpperCase()
  return created({
    ok: true,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      tier: customer.tier,
      points: customer.points,
    },
    memberCode,
  })
})

export const GET = handle(async () => {
  // Lightweight public endpoint — total loyalty members (used by storefront
  // for social proof badge).
  const count = await db.customer.count({ where: { deletedAt: null } })
  return ok({ count })
})
