/**
 * INTEGRATION TEST: POS cancel bill — branch-specific stock reversal.
 *
 * Verifies:
 * - Stock returns to the CORRECT branch (not any branch)
 * - Shift totals are reversed
 * - Second cancel is rejected (idempotent)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as cancelBill } from '@/app/api/admin/pos/cancel-bill/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds, testBranchId, testBranchBId, testCashierId, testProductId, testShiftId } from './test-db'
import { signedSession } from './test-db'
import { mockRequest, getJson } from './mock-request'

async function createBill(db: ReturnType<typeof getTestDb>, opts: { total: number; paymentMethod?: string }) {
  const bill = await db.posBill.create({
    data: {
      billNo: `POS-TEST-${Date.now()}`,
      shiftId: testShiftId,
      userId: testCashierId,
      subtotal: opts.total,
      total: opts.total,
      paymentMethod: opts.paymentMethod || 'CASH',
      status: 'COMPLETED',
      items: {
        create: [{
          productId: testProductId,
          name: 'ทองหยิบ',
          price: 30,
          quantity: 2,
          total: 60,
        }],
      },
    },
  })

  // Decrement stock at branch A (simulating checkout)
  const inv = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
  if (inv) {
    await db.inventory.update({ where: { id: inv.id }, data: { quantity: { decrement: 2 } } })
  }

  // Update shift totals
  await db.shift.update({
    where: { id: testShiftId },
    data: {
      totalSales: { increment: opts.total },
      cashSales: opts.paymentMethod === 'CASH' || !opts.paymentMethod ? { increment: opts.total } : undefined,
    } as any,
  })

  return bill
}

describe('INTEGRATION: POS cancel bill — branch + shift', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => { await cleanMutations() })

  it('cancel bill reverses stock at the CORRECT branch (A), not branch B', async () => {
    const db = getTestDb()

    // Create a bill + decrement stock
    const bill = await createBill(db, { total: 60 })

    // Verify stock was decremented
    const invABefore = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
    const invBBefore = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchBId } })
    expect(invABefore!.quantity).toBe(98) // 100 - 2
    expect(invBBefore!.quantity).toBe(50) // unchanged

    // Cancel the bill
    const res = await cancelBill(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: { billId: bill.id, reason: 'ทดสอบยกเลิก' },
    }))
    const data = await getJson(res)
    expect(data.cancelled).toBe(true)

    // Verify stock returned to branch A only
    const invAAfter = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchId } })
    const invBAfter = await db.inventory.findFirst({ where: { productId: testProductId, branchId: testBranchBId } })
    expect(invAAfter!.quantity).toBe(100) // restored
    expect(invBAfter!.quantity).toBe(50)  // unchanged
  })

  it('cancel bill reverses shift totals', async () => {
    const db = getTestDb()
    const bill = await createBill(db, { total: 100, paymentMethod: 'CASH' })

    const shiftBefore = await db.shift.findUnique({ where: { id: testShiftId } })
    expect(shiftBefore!.totalSales).toBe(100)
    expect(shiftBefore!.cashSales).toBe(100)

    await cancelBill(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: { billId: bill.id, reason: 'ทดสอบ' },
    }))

    const shiftAfter = await db.shift.findUnique({ where: { id: testShiftId } })
    expect(shiftAfter!.totalSales).toBe(0) // reversed
    expect(shiftAfter!.cashSales).toBe(0)  // reversed
  })

  it('second cancel of the same bill is rejected (idempotent)', async () => {
    const db = getTestDb()
    const bill = await createBill(db, { total: 60 })

    // First cancel succeeds
    const res1 = await cancelBill(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: { billId: bill.id, reason: 'ยกเลิกครั้งแรก' },
    }))
    expect((await getJson(res1)).cancelled).toBe(true)

    // Second cancel fails
    const res2 = await cancelBill(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: { billId: bill.id, reason: 'ยกเลิกซ้ำ' },
    }))
    expect(res2.status).toBeGreaterThanOrEqual(400)
  })

  it('cancel bill without reason is rejected', async () => {
    const db = getTestDb()
    const bill = await createBill(db, { total: 60 })

    const res = await cancelBill(mockRequest({
      method: 'POST',
      cookies: { kh_session: signedSession(testCashierId) },
      body: { billId: bill.id },
    }))
    expect(res.status).toBe(400)
  })
})
