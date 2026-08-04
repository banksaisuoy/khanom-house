import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, badRequest, handle } from '@/lib/api-response'
import { rateLimitResponse } from '@/lib/rate-limit'
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_COOKIE_MAX_AGE, signCustomerSession } from '@/lib/customer-session'
import { validate } from '@/lib/validation'
import { z } from 'zod'

// PHASE 3 FIX (AUDIT-005): Cookie name mismatch + missing secure flag.
// Previously: wrote cookie name `kh_customer` but `/api/customer/me` reads
// `kh_customer_session` — customer login never persisted. Also missing
// `secure` flag (cookie sent over plaintext HTTP).
// Now: uses the shared `CUSTOMER_SESSION_COOKIE` constant, adds `secure`
// in production, and validates input with Zod.

const otpVerifySchema = z.object({
  phone: z.string().trim().min(1).max(20),
  code: z.string().trim().length(6),
  purpose: z.enum(['LOGIN', 'REGISTER', 'RESET']).default('LOGIN'),
})

export const POST = handle(async (req: NextRequest) => {
  const limited = rateLimitResponse(req)
  if (limited) return limited

  const body = validate(otpVerifySchema, await req.json())

  // Check attempts < 5 to prevent brute force (AUDIT-023)
  const otp = await db.otpCode.findFirst({
    where: {
      phone: body.phone,
      code: body.code,
      purpose: body.purpose,
      verified: false,
      attempts: { lt: 5 },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) {
    // Increment attempts on the most recent unverified code for this phone
    const recent = await db.otpCode.findFirst({
      where: { phone: body.phone, purpose: body.purpose, verified: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      await db.otpCode.update({ where: { id: recent.id }, data: { attempts: { increment: 1 } } })
    }
    return badRequest('รหัส OTP ไม่ถูกต้องหรือหมดอายุ')
  }

  await db.otpCode.update({ where: { id: otp.id }, data: { verified: true } })

  // Find or create customer
  let customer = await db.customer.findUnique({ where: { phone: body.phone } })
  if (!customer) {
    customer = await db.customer.create({ data: { name: 'ลูกค้า', phone: body.phone, tier: 'BRONZE' } })
  }

  const res = NextResponse.json({
    verified: true,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      tier: customer.tier,
      points: customer.points,
    },
  })
  res.cookies.set(CUSTOMER_SESSION_COOKIE, signCustomerSession(customer.id), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CUSTOMER_SESSION_COOKIE_MAX_AGE,
    path: '/',
  })
  return res
})
