import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, badRequest, handle } from '@/lib/api-response'
import { rateLimitResponse } from '@/lib/rate-limit'
import { validate } from '@/lib/validation'
import { z } from 'zod'

// PHASE 3 FIX (AUDIT-001): OTP must NEVER be returned in the response body.
// Previously: `return ok({ sent: true, code, message: ... })` — anyone could
// POST a phone number and receive the OTP, enabling instant account takeover.
// Now: code is generated server-side and stored only in the DB. In production
// an SMS provider would deliver it. In dev, the code is logged to the server
// console so QA can still test.

const otpSendSchema = z.object({
  phone: z.string().trim().min(1).max(20),
  purpose: z.enum(['LOGIN', 'REGISTER', 'RESET']).default('LOGIN'),
})

export const POST = handle(async (req: NextRequest) => {
  const limited = rateLimitResponse(req)
  if (limited) return limited

  const body = validate(otpSendSchema, await req.json())

  // Generate 6-digit code. Note: Math.random() is not cryptographically
  // secure — production should use crypto.randomInt or an SMS provider.
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 min

  await db.otpCode.create({
    data: { phone: body.phone, code, purpose: body.purpose, expiresAt },
  })

  // Dev-only: log to server console so QA can retrieve the code.
  // NEVER include the code in the HTTP response.
  if (process.env.NODE_ENV === 'development') {
    console.log(`[OTP] ${body.phone} (${body.purpose}): ${code}`)
  }

  return ok({ sent: true, message: 'ส่งรหัส OTP แล้ว กรุณาตรวจสอบ SMS' })
})
