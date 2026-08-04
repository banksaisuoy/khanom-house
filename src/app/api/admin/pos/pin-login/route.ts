import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, unauthorized } from '@/lib/api-response'
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from '@/lib/auth'
import { signSessionToken } from '@/lib/session-signing'
import { logAudit } from '@/lib/audit'
import { rateLimitResponse } from '@/lib/rate-limit'
import { validate } from '@/lib/validation'
import { z } from 'zod'

// ============================================================
// POST /api/admin/pos/pin-login
//   Quick PIN login for POS — cashier enters last 4 digits of
//   their phone number; we match against active CASHIER and
//   BRANCH_MANAGER users ONLY.
//
//   PHASE 3 FIX (AUDIT-002): Previously matched ALL active users
//   including SUPER_ADMIN — a cashier could brute-force a 4-digit
//   PIN to escalate to admin. Now: (1) only CASHIER + BRANCH_MANAGER
//   are candidates, (2) rate-limited per IP, (3) failed attempts
//   are audit-logged with IP.
// ============================================================

const pinSchema = z.object({
  pin: z.string().trim().regex(/^\d{4}$/, 'PIN ต้องเป็นตัวเลข 4 หลัก'),
  branchId: z.string().optional(),
})

export const POST = handle(async (req: NextRequest) => {
  // Rate limit: 5 attempts per minute per IP
  const limited = rateLimitResponse(req)
  if (limited) return limited

  const body = validate(pinSchema, await req.json())

  // SECURITY: Only CASHIER and BRANCH_MANAGER can PIN-login.
  // SUPER_ADMIN, ACCOUNTANT, etc. must use full email+password login.
  const candidates = await db.user.findMany({
    where: {
      isActive: true,
      role: { in: ['CASHIER', 'BRANCH_MANAGER'] },
      phone: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      branchId: true,
      phone: true,
    },
  })

  const matches = candidates.filter((u) => {
    const digits = (u.phone ?? '').replace(/[^\d]/g, '')
    return digits.length >= 4 && digits.slice(-4) === body.pin
  })

  if (matches.length === 0) {
    await logAudit({
      userId: null,
      action: 'LOGIN',
      entity: 'User',
      newValue: { ok: false, reason: 'PIN_NOT_FOUND' },
      ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    })
    return unauthorized('PIN ไม่ถูกต้อง')
  }

  // If branchId supplied, prefer a user on that branch.
  let user = matches[0]
  if (body.branchId) {
    const onBranch = matches.find((u) => u.branchId === body.branchId)
    if (onBranch) user = onBranch
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  await logAudit({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    newValue: { method: 'PIN', role: user.role },
    ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
  })

  const res = ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    },
  })
  res.cookies.set(SESSION_COOKIE, signSessionToken(user.id), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: '/',
  })
  return res
})
