/**
 * INTEGRATION TEST: OTP send + verify + customer session.
 *
 * Tests the actual route handlers with a real Prisma test database.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as otpSend } from '@/app/api/auth/otp/send/route'
import { POST as otpVerify } from '@/app/api/auth/otp/verify/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds } from './test-db'
import { mockRequest, getJson, getSetCookie, getCookieName } from './mock-request'

describe('INTEGRATION: OTP send + verify', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => { await cleanMutations() })

  it('OTP send does NOT return the code in the response body', async () => {
    const req = mockRequest({ method: 'POST', body: { phone: '0810000001', purpose: 'LOGIN' } })
    const res = await otpSend(req)
    const data = await getJson(res)

    expect(data.sent).toBe(true)
    expect(data.code).toBeUndefined()
    expect(data.message).not.toMatch(/\d{6}/) // no 6-digit code in message
  })

  it('OTP send stores a code in the database', async () => {
    const db = getTestDb()
    const req = mockRequest({ method: 'POST', body: { phone: '0810000001', purpose: 'LOGIN' } })
    await otpSend(req)

    const otp = await db.otpCode.findFirst({
      where: { phone: '0810000001', purpose: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
    })

    expect(otp).toBeDefined()
    expect(otp!.code).toMatch(/^\d{6}$/)
    expect(otp!.verified).toBe(false)
  })

  it('OTP verify with correct code sets correct cookie name', async () => {
    const db = getTestDb()
    // Send OTP
    await otpSend(mockRequest({ method: 'POST', body: { phone: '0810000001', purpose: 'LOGIN' } }))
    // Get the code from DB
    const otp = await db.otpCode.findFirst({
      where: { phone: '0810000001', purpose: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
    })
    expect(otp).toBeDefined()

    // Verify
    const verifyReq = mockRequest({
      method: 'POST',
      body: { phone: '0810000001', code: otp!.code, purpose: 'LOGIN' },
    })
    const res = await otpVerify(verifyReq)
    const data = await getJson(res)

    expect(data.verified).toBe(true)
    expect(data.customer).toBeDefined()

    // Cookie must be set with the correct name
    const setCookie = getSetCookie(res)
    expect(setCookie).toBeDefined()
    const cookieName = getCookieName(setCookie)
    expect(cookieName).toBe('kh_customer_session')
  })

  it('OTP verify with wrong code fails and increments attempts', async () => {
    const db = getTestDb()
    // Send OTP
    await otpSend(mockRequest({ method: 'POST', body: { phone: '0810000001', purpose: 'LOGIN' } }))

    // Verify with wrong code
    const res = await otpVerify(mockRequest({
      method: 'POST',
      body: { phone: '0810000001', code: '000000', purpose: 'LOGIN' },
    }))
    const data = await getJson(res)
    expect(data.error).toBeDefined()

    // Check attempts incremented
    const otp = await db.otpCode.findFirst({
      where: { phone: '0810000001', purpose: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
    })
    expect(otp!.attempts).toBe(1)
  })

  it('cookie must be HttpOnly', async () => {
    const db = getTestDb()
    await otpSend(mockRequest({ method: 'POST', body: { phone: '0810000001', purpose: 'LOGIN' } }))
    const otp = await db.otpCode.findFirst({ where: { phone: '0810000001' }, orderBy: { createdAt: 'desc' } })

    const res = await otpVerify(mockRequest({
      method: 'POST',
      body: { phone: '0810000001', code: otp!.code, purpose: 'LOGIN' },
    }))

    const setCookie = getSetCookie(res)
    expect(setCookie).toContain('HttpOnly')
  })
})
