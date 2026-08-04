/**
 * INTEGRATION TEST: Customer session HMAC security.
 *
 * Verifies:
 * 1. OTP verify sets a signed customer session cookie (format: customerId.hmac)
 * 2. customer/me accepts a valid signed cookie
 * 3. customer/me rejects a tampered cookie
 * 4. customer/me rejects a malformed cookie
 * 5. customer/me returns null for no cookie
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as otpSend } from '@/app/api/auth/otp/send/route'
import { POST as otpVerify } from '@/app/api/auth/otp/verify/route'
import { GET as customerMe } from '@/app/api/customer/me/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds } from './test-db'
import { mockRequest, getJson, getSetCookie, getCookieName } from './mock-request'
import { signCustomerSession } from '@/lib/customer-session'

describe('INTEGRATION: Customer session HMAC security', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => { await cleanMutations() })

  async function getSignedCookie(): Promise<string> {
    const db = getTestDb()
    // Send OTP
    await otpSend(mockRequest({ method: 'POST', body: { phone: '0810000001', purpose: 'LOGIN' } }))
    // Get code from DB
    const otp = await db.otpCode.findFirst({
      where: { phone: '0810000001', purpose: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
    })
    expect(otp).toBeDefined()
    // Verify OTP → get signed cookie
    const res = await otpVerify(mockRequest({
      method: 'POST',
      body: { phone: '0810000001', code: otp!.code, purpose: 'LOGIN' },
    }))
    const setCookie = getSetCookie(res)
    expect(setCookie).toBeDefined()
    // Extract cookie value from Set-Cookie header
    // Format: kh_customer_session=VALUE; HttpOnly; ...
    const match = setCookie!.match(/kh_customer_session=([^;]+)/)
    expect(match).toBeDefined()
    return match![1]
  }

  it('1. OTP verify sets a signed cookie (customerId.hmac format)', async () => {
    const cookieValue = await getSignedCookie()

    // Must contain a dot (signed format: id.hmac)
    expect(cookieValue).toContain('.')

    const [idPart, sigPart] = cookieValue.split('.')
    expect(idPart).toBeDefined()
    expect(sigPart).toBeDefined()
    expect(sigPart).toMatch(/^[0-9a-f]{64}$/) // SHA-256 hex
  })

  it('2. customer/me accepts a valid signed cookie', async () => {
    const cookieValue = await getSignedCookie()

    // Find the customer that was created
    const db = getTestDb()
    const customer = await db.customer.findUnique({ where: { phone: '0810000001' } })
    expect(customer).toBeDefined()

    // Call /api/customer/me with the signed cookie
    const res = await customerMe(mockRequest({
      method: 'GET',
      cookies: { kh_customer_session: cookieValue },
    }))
    const data = await getJson(res)

    expect(data.customer).toBeDefined()
    expect(data.customer).not.toBeNull()
    expect(data.customer.phone).toBe('0810000001')
  })

  it('3. customer/me rejects a tampered cookie', async () => {
    const cookieValue = await getSignedCookie()

    // Tamper: change the id part but keep the signature
    const [_, sig] = cookieValue.split('.')
    const tamperedCookie = `cmr_tampered_fake_id.${sig}`

    const res = await customerMe(mockRequest({
      method: 'GET',
      cookies: { kh_customer_session: tamperedCookie },
    }))
    const data = await getJson(res)

    expect(data.customer).toBeNull()
  })

  it('4. customer/me rejects a malformed cookie (no dot)', async () => {
    const res = await customerMe(mockRequest({
      method: 'GET',
      cookies: { kh_customer_session: 'justarandomstring' },
    }))
    const data = await getJson(res)

    expect(data.customer).toBeNull()
  })

  it('5. customer/me returns null for no cookie', async () => {
    const res = await customerMe(mockRequest({ method: 'GET' }))
    const data = await getJson(res)

    expect(data.customer).toBeNull()
  })

  it('6. customer/me rejects empty cookie value', async () => {
    const res = await customerMe(mockRequest({
      method: 'GET',
      cookies: { kh_customer_session: '' },
    }))
    const data = await getJson(res)

    expect(data.customer).toBeNull()
  })

  it('7. signed cookie with wrong secret is rejected', async () => {
    // Manually sign with a different secret (simulate attacker)
    const cookieValue = await getSignedCookie()
    const [idPart] = cookieValue.split('.')

    // Create a fake signature
    const fakeSig = '0000000000000000000000000000000000000000000000000000000000000000'
    const fakeCookie = `${idPart}.${fakeSig}`

    const res = await customerMe(mockRequest({
      method: 'GET',
      cookies: { kh_customer_session: fakeCookie },
    }))
    const data = await getJson(res)

    expect(data.customer).toBeNull()
  })
})
