/**
 * INTEGRATION TEST: POS checkout + shift totals.
 *
 * Verifies:
 * - POS checkout creates bill + decrements inventory
 * - Shift totalSales increases correctly
 * - cashSales / qrSales / cardSales update by payment method
 * - Invalid payment payload fails safely
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as posCheckout } from '@/app/api/admin/pos/checkout/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds, testBranchId, testProductId, testCashierId, testShiftId, signedSession } from './test-db'
import { mockRequest, getJson } from './mock-request'

describe('INTEGRATION: POS checkout + shift totals', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => {
    await cleanMutations()
    const db = getTestDb()
    // Reset inventory + shift
    await db.inventory.updateMany({ where: { productId: testProductId, branchId: testBranchId }, data: { quantity: 100 } })
    await db.shift.update({ where: { id: testShiftId }, data: { totalSales: 0, cashSales: 0, cardSales: 0, qrSales: 0, expectedCash: 2000 } })
  })

  it('POS checkout creates bill + decrements inventory + updates shift totals', async () => {
    const db = getTestDb()
    const beforeInv = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })

    const res = await posCheckout(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: {
        shiftId: testShiftId,
        items: [{ productId: testProductId, quantity: 5, price: 30, name: 'ทองหยิบ' }],
        paymentMethod: 'CASH',
        discount: 0,
      },
    }))
    const data = await getJson(res)

    expect(res.status).toBe(201)
    expect(data.billNo).toBeDefined()

    // Inventory decreased
    const afterInv = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
    expect(afterInv!.quantity).toBe(beforeInv!.quantity - 5)

    // Shift totals updated
    const shift = await db.shift.findUnique({ where: { id: testShiftId } })
    expect(shift!.totalSales).toBeGreaterThan(0)
    expect(shift!.cashSales).toBeGreaterThan(0)
    expect(shift!.expectedCash).toBe(2000 + shift!.cashSales) // opening + cash sales
  })

  it('QR payment updates qrSales (not cashSales)', async () => {
    const db = getTestDb()

    await posCheckout(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: {
        shiftId: testShiftId,
        items: [{ productId: testProductId, quantity: 2, price: 30, name: 'ทองหยิบ' }],
        paymentMethod: 'PROMPTPAY',
        discount: 0,
      },
    }))

    const shift = await db.shift.findUnique({ where: { id: testShiftId } })
    expect(shift!.qrSales).toBeGreaterThan(0)
    expect(shift!.cashSales).toBe(0) // no cash sale
  })

  it('Card payment updates cardSales', async () => {
    const db = getTestDb()

    await posCheckout(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: {
        shiftId: testShiftId,
        items: [{ productId: testProductId, quantity: 1, price: 30, name: 'ทองหยิบ' }],
        paymentMethod: 'CARD',
        discount: 0,
      },
    }))

    const shift = await db.shift.findUnique({ where: { id: testShiftId } })
    expect(shift!.cardSales).toBeGreaterThan(0)
    expect(shift!.cashSales).toBe(0)
  })

  it('invalid payment method fails safely', async () => {
    const res = await posCheckout(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: {
        shiftId: testShiftId,
        items: [{ productId: testProductId, quantity: 1, price: 30, name: 'ทองหยิบ' }],
        paymentMethod: 'INVALID',
        discount: 0,
      },
    }))
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('empty cart fails', async () => {
    const res = await posCheckout(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: {
        shiftId: testShiftId,
        items: [],
        paymentMethod: 'CASH',
        discount: 0,
      },
    }))
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('unauthenticated checkout fails (401)', async () => {
    const res = await posCheckout(mockRequest({
      method: 'POST',
      // no cookies
      body: {
        shiftId: testShiftId,
        items: [{ productId: testProductId, quantity: 1, price: 30, name: 'ทองหยิบ' }],
        paymentMethod: 'CASH',
        discount: 0,
      },
    }))
    expect(res.status).toBe(401)
  })
})
