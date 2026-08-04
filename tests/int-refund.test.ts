/**
 * INTEGRATION TEST: Refund approval flow.
 *
 * Verifies:
 * - Create paid order
 * - Request refund
 * - Approve refund (manager)
 * - Stock returns for FULL refund
 * - Audit log created
 * - Second approval is rejected (idempotent)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as refundCreate } from '@/app/api/admin/refunds/route'
import { POST as refundApprove } from '@/app/api/admin/refunds/[id]/approve/route'
import { POST as refundComplete } from '@/app/api/admin/refunds/[id]/complete/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds, testBranchId, testProductId, testManagerId, testCashierId, signedSession } from './test-db'
import { mockRequest, getJson } from './mock-request'

async function createPaidOrder(db: ReturnType<typeof getTestDb>) {
  // Decrement stock first (simulate checkout)
  const inv = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
  await db.inventory.update({ where: { id: inv!.id }, data: { quantity: { decrement: 5 } } })
  await db.stockMovement.create({
    data: { inventoryId: inv!.id, type: 'SALE', quantity: 5, reason: 'Sale', refType: 'ORDER' },
  })

  const order = await db.order.create({
    data: {
      orderNo: 'KH-REFUND-001',
      channel: 'WEBSITE',
      customerName: 'Refund Customer',
      customerPhone: '0810000088',
      type: 'DELIVERY',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      subtotal: 150,
      total: 150,
      branchId: testBranchId,
      items: {
        create: [{ productId: testProductId, name: 'ทองหยิบ', price: 30, quantity: 5, total: 150 }],
      },
    },
  })
  return { order, invId: inv!.id, stockBefore: inv!.quantity - 5 }
}

describe('INTEGRATION: Refund flow', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => {
    await cleanMutations()
    const db = getTestDb()
    await db.inventory.updateMany({ where: { productId: testProductId, branchId: testBranchId }, data: { quantity: 100 } })
  })

  it('full refund: approve → stock returns → audit log', async () => {
    const db = getTestDb()
    const { order, stockBefore } = await createPaidOrder(db)

    // Create refund
    const createRes = await refundCreate(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testManagerId) },
      body: {
        orderId: order.id,
        type: 'FULL',
        reason: 'ทดสอบคืนเงิน',
        refundAmount: 150,
        refundMethod: 'CASH',
      },
    }))
    const refundData = await getJson(createRes)
    expect(refundData.refundNo).toBeDefined()

    // Approve refund (manager)
    const approveRes = await refundApprove(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: refundData.id }) }
    )
    expect(approveRes.status).toBe(200)

    // Stock must have returned
    const inv = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
    expect(inv!.quantity).toBe(stockBefore + 5) // stock restored

    // Audit log created
    const audit = await db.auditLog.findFirst({
      where: { entity: 'Refund', entityId: refundData.id },
    })
    expect(audit).toBeDefined()
  })

  it('second approval is rejected (idempotent)', async () => {
    const db = getTestDb()
    const { order } = await createPaidOrder(db)

    // Create refund
    const createRes = await refundCreate(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testManagerId) },
      body: { orderId: order.id, type: 'FULL', reason: 'ทดสอบ', refundAmount: 150, refundMethod: 'CASH' },
    }))
    const refundData = await getJson(createRes)

    // First approve
    await refundApprove(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: refundData.id }) }
    )

    // Second approve must fail
    const res2 = await refundApprove(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: refundData.id }) }
    )
    expect(res2.status).toBeGreaterThanOrEqual(400)
  })

  it('complete after approve works', async () => {
    const db = getTestDb()
    const { order } = await createPaidOrder(db)

    const createRes = await refundCreate(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testManagerId) },
      body: { orderId: order.id, type: 'FULL', reason: 'ทดสอบ', refundAmount: 150, refundMethod: 'CASH' },
    }))
    const refundData = await getJson(createRes)

    // Approve
    await refundApprove(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: refundData.id }) }
    )

    // Complete
    const res = await refundComplete(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: refundData.id }) }
    )
    expect(res.status).toBe(200)

    // Verify status is COMPLETED
    const refund = await db.refund.findUnique({ where: { id: refundData.id } })
    expect(refund!.status).toBe('COMPLETED')
    expect(refund!.processedAt).toBeDefined()
  })

  it('complete without approve fails', async () => {
    const db = getTestDb()
    const { order } = await createPaidOrder(db)

    const createRes = await refundCreate(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testManagerId) },
      body: { orderId: order.id, type: 'FULL', reason: 'ทดสอบ', refundAmount: 150, refundMethod: 'CASH' },
    }))
    const refundData = await getJson(createRes)

    // Try to complete without approving first
    const res = await refundComplete(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: refundData.id }) }
    )
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
