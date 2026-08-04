/**
 * AUDIT-005: Customer OTP verify must use the correct cookie name
 * (CUSTOMER_SESSION_COOKIE = 'kh_customer_session') and include
 * the `secure` flag in production.
 *
 * Previously: wrote `kh_customer` but `/api/customer/me` reads
 * `kh_customer_session` — customer login never persisted.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('AUDIT-005: Customer cookie name + secure flag', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/auth/otp/verify/route.ts'),
    'utf-8'
  )

  it('must import CUSTOMER_SESSION_COOKIE constant', () => {
    expect(source).toContain('CUSTOMER_SESSION_COOKIE')
    expect(source).toContain("from '@/lib/customer-session'")
  })

  it('must NOT use the old wrong cookie name "kh_customer"', () => {
    // Must not have the bare string 'kh_customer' (only the constant is correct)
    expect(source).not.toContain("'kh_customer'")
  })

  it('must set secure flag based on NODE_ENV', () => {
    expect(source).toContain('secure:')
    expect(source).toContain("process.env.NODE_ENV === 'production'")
  })

  it('must use OTP attempt tracking (attempts < 5)', () => {
    expect(source).toContain('attempts: { lt: 5 }')
  })
})
