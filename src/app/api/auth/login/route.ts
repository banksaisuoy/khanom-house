/**
 * Demo login endpoint.
 *
 * WHY: Audit fix C-1/C-13 — admin routes now require a session cookie.
 * Validates email+password against the User table (bcrypt) and sets a
 * `kh_session` cookie containing the userId.
 *
 * AUDIT (P3-5): wrapped in `handle()` and uses shared response helpers
 * (ok / badRequest / unauthorized) instead of bare NextResponse.json +
 * ad-hoc try/catch. Response shape preserved: `{ user }` on success.
 *
 * SECURITY NOTE: Demo-grade session (cookie value = userId). Production
 * must use a signed JWT or server-side session store.
 */
import { db } from '@/lib/db'
import {
  ok,
  badRequest,
  unauthorized,
  handle,
} from '@/lib/api-response'
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from '@/lib/auth'
import { signSessionToken } from '@/lib/session-signing'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'

export const POST = handle(async (req: NextRequest) => {
  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.password) {
    return badRequest('กรุณากรอกอีเมลและรหัสผ่าน')
  }

  const user = await db.user.findUnique({
    where: { email: String(body.email).toLowerCase().trim(), isActive: true },
    select: { id: true, email: true, name: true, role: true, branchId: true, passwordHash: true },
  })
  if (!user) {
    return unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  }

  const valid = await bcrypt.compare(String(body.password), user.passwordHash)
  if (!valid) {
    return unauthorized('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  await logAudit({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
    userAgent: req.headers.get('user-agent') ?? null,
  })

  const res = ok({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId },
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
