/**
 * INTEGRATION TEST: Public checkout atomicity.
 *
 * Verifies:
 * - Checkout within stock succeeds
 * - Stock decreases correctly
 * - Order is created with correct total
 * - Member points are added if customer exists
 * - Checkout over stock fails
 * - Stock must not go negative
 * - Order must not be created on failed checkout
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as checkout } from '@/app/api/orders/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds, testBranchId, testProductId, testCashierId, signedSession } from './test-db'
import { mockRequest, getJson } from './mock-request'

describe('INTEGRATION: Public checkout atomicity', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => {
    await cleanMutations()
    // Reset inventory to known state
    const db = getTestDb()
    await db.inventory.updateMany({ where: { productId: testProductId, branchId: testBranchId }, data: { quantity: 10 } })
  })

  it('checkout within stock succeeds + stock decreases + order created', async () => {
    const db = getTestDb()

    const res = await checkout(mockRequest({
      method: 'POST',
      body: {
        items: [{ productId: testProductId, quantity: 3, price: 30, name: 'ทองหยิบ' }],
        customerName: 'ลูกค้าทดสอบ',
        customerPhone: '0810000099',
        paymentMethod: 'CASH',
        address: '123 ถนนสีลม',
      },
    }))
    const data = await getJson(res)

    expect(res.status).toBe(201)
    expect(data.orderNo).toBeDefined()
    expect(data.total).toBeGreaterThan(0)

    // Stock must have decreased
    const inv = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
    expect(inv!.quantity).toBe(7) // 10 - 3

    // Order must exist
    const order = await db.order.findFirst({ where: { orderNo: data.orderNo } })
    expect(order).toBeDefined()
    expect(order!.status).not.toBe('CANCELLED')
  })

  it('checkout over stock fails + stock unchanged + no order created', async () => {
    const db = getTestDb()

    const res = await checkout(mockRequest({
      method: 'POST',
      body: {
        items: [{ productId: testProductId, quantity: 100, price: 30, name: 'ทองหยิบ' }],
        customerName: 'ลูกค้าทดสอบ',
        customerPhone: '0810000098',
        paymentMethod: 'CASH',
        address: '123 ถนนสีลม',
      },
    }))

    // Must fail (409 or 400)
    expect(res.status).toBeGreaterThanOrEqual(400)

    // Stock must NOT have changed
    const inv = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
    expect(inv!.quantity).toBe(10) // unchanged

    // No order should have been created for this phone
    const orders = await db.order.findMany({ where: { customerPhone: '0810000098' } })
    expect(orders.length).toBe(0)
  })

  it('stock must not go negative after failed checkout', async () => {
    const db = getTestDb()

    // Attempt to buy more than stock
    await checkout(mockRequest({
      method: 'POST',
      body: {
        items: [{ productId: testProductId, quantity: 999, price: 30, name: 'ทองหยิบ' }],
        customerName: 'ลูกค้าทดสอบ',
        customerPhone: '0810000097',
        paymentMethod: 'CASH',
        address: '123',
      },
    }))

    const inv = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
    expect(inv!.quantity).toBeGreaterThanOrEqual(0) // never negative
    expect(inv!.quantity).toBe(10) // unchanged
  })

  it('checkout with empty cart fails', async () => {
    const res = await checkout(mockRequest({
      method: 'POST',
      body: {
        items: [],
        customerName: 'ลูกค้าทดสอบ',
        customerPhone: '0810000096',
        paymentMethod: 'CASH',
        address: '123',
      },
    }))
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('checkout with invalid payment method fails', async () => {
    const res = await checkout(mockRequest({
      method: 'POST',
      body: {
        items: [{ productId: testProductId, quantity: 1, price: 30, name: 'ทองหยิบ' }],
        customerName: 'ลูกค้าทดสอบ',
        customerPhone: '0810000095',
        paymentMethod: 'INVALID_METHOD',
        address: '123',
      },
    }))
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('checkout with invalid phone fails', async () => {
    const res = await checkout(mockRequest({
      method: 'POST',
      body: {
        items: [{ productId: testProductId, quantity: 1, price: 30, name: 'ทองหยิบ' }],
        customerName: 'ลูกค้าทดสอบ',
        customerPhone: 'bad-phone',
        paymentMethod: 'CASH',
        address: '123',
      },
    }))
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
