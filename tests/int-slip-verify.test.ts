/**
 * INTEGRATION TEST: Slip verification idempotency.
 *
 * Verifies:
 * - First verify succeeds + marks order PAID
 * - Second verify is rejected (idempotent)
 * - Audit log created
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as slipVerify } from '@/app/api/admin/slip-upload/[id]/verify/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds, testManagerId, testBranchId, testProductId } from './test-db'
import { signedSession } from './test-db'
import { mockRequest, getJson } from './mock-request'

async function createSlipAndOrder(db: ReturnType<typeof getTestDb>) {
  const order = await db.order.create({
    data: {
      orderNo: 'KH-TEST-001',
      channel: 'WEBSITE',
      customerName: 'Test Customer',
      customerPhone: '0810000001',
      type: 'DELIVERY',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      paymentMethod: 'BANK_TRANSFER',
      subtotal: 100,
      shipping: 40,
      tax: 0,
      total: 140,
      branchId: testBranchId,
    },
  })

  const slip = await db.slipUpload.create({
    data: {
      orderId: order.id,
      imageUrl: 'https://example.com/slip.jpg',
      amount: 140,
      bankName: 'SCB',
      transferDate: new Date(),
      refCode: 'REF001',
      status: 'PENDING',
    },
  })

  return { order, slip }
}

describe('INTEGRATION: Slip verification idempotency', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => { await cleanMutations() })

  it('first verify succeeds + marks order PAID', async () => {
    const db = getTestDb()
    const { order, slip } = await createSlipAndOrder(db)

    const res = await slipVerify(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: slip.id }) }
    )
    const data = await getJson(res)

    expect(data.verified).toBe(true)

    // Verify order is now PAID
    const updatedOrder = await db.order.findUnique({ where: { id: order.id } })
    expect(updatedOrder!.paymentStatus).toBe('PAID')
    expect(updatedOrder!.status).toBe('PAID')
  })

  it('second verify is rejected (idempotent)', async () => {
    const db = getTestDb()
    const { slip } = await createSlipAndOrder(db)

    // First verify
    await slipVerify(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: slip.id }) }
    )

    // Second verify must fail
    const res2 = await slipVerify(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: slip.id }) }
    )
    expect(res2.status).toBeGreaterThanOrEqual(400)
  })

  it('audit log is created on verify', async () => {
    const db = getTestDb()
    const { slip } = await createSlipAndOrder(db)

    await slipVerify(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: slip.id }) }
    )

    const audit = await db.auditLog.findFirst({
      where: { entity: 'SlipUpload', entityId: slip.id },
    })
    expect(audit).toBeDefined()
    expect(audit!.action).toBe('APPROVE')
  })
})
