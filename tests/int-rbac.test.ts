/**
 * INTEGRATION TEST: RBAC enforcement — CASHIER vs BRANCH_MANAGER.
 *
 * Tests that actual route handlers reject/accept based on the session
 * cookie + RBAC matrix.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as giftCardCreate } from '@/app/api/admin/gift-cards/route'
import { GET as usersList } from '@/app/api/admin/users/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds, testCashierId, testManagerId } from './test-db'
import { signedSession } from './test-db'
import { mockRequest, getJson } from './mock-request'

describe('INTEGRATION: RBAC enforcement', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => { await cleanMutations() })

  it('CASHIER cannot access users route', async () => {
    const req = mockRequest({
      method: 'GET',
      cookies: { kh_session: signedSession(testCashierId) },
    })
    const res = await usersList(req)
    const data = await getJson(res)

    expect(res.status).toBe(403)
    expect(data.error).toBeDefined()
  })

  it('BRANCH_MANAGER can access users route (has users.read)', async () => {
    const req = mockRequest({
      method: 'GET',
      cookies: { kh_session: signedSession(testManagerId) },
    })
    const res = await usersList(req)
    const data = await getJson(res)

    expect(res.status).toBe(200)
    expect(data.users).toBeDefined()
  })

  it('CASHIER cannot create gift cards', async () => {
    const req = mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: { amount: 500 },
    })
    const res = await giftCardCreate(req)
    const data = await getJson(res)

    expect(res.status).toBe(403)
    expect(data.error).toBeDefined()
  })

  it('BRANCH_MANAGER can create gift cards', async () => {
    const req = mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testManagerId) },
      body: { amount: 500, buyerName: 'Test Buyer' },
    })
    const res = await giftCardCreate(req)
    const data = await getJson(res)

    expect(res.status).toBe(201)
    expect(data.code).toBeDefined()
    expect(data.balance).toBe(500)
  })

  it('gift card amount > 50000 is rejected', async () => {
    const req = mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testManagerId) },
      body: { amount: 50001 },
    })
    const res = await giftCardCreate(req)
    expect(res.status).toBe(400)
  })

  it('gift card creation creates an audit log', async () => {
    const db = getTestDb()
    const req = mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testManagerId) },
      body: { amount: 300 },
    })
    await giftCardCreate(req)

    const audit = await db.auditLog.findFirst({
      where: { entity: 'GiftCard' },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit).toBeDefined()
    expect(audit!.action).toBe('CREATE')
    expect(audit!.userId).toBe(testManagerId)
  })

  it('unauthenticated request to users route returns 401', async () => {
    const req = mockRequest({ method: 'GET' }) // no cookies
    const res = await usersList(req)
    expect(res.status).toBe(401)
  })
})
