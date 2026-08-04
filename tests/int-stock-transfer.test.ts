/**
 * INTEGRATION TEST: Stock transfer ship — must throw on missing inventory.
 *
 * Verifies:
 * - Transfer with no source inventory fails
 * - Transfer status does NOT change to IN_TRANSIT on failure
 * - No partial stock mutation occurs
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { POST as transferShip } from '@/app/api/admin/stock-transfer/[id]/ship/route'
import { getTestDb, ensureSeeded, cleanMutations, disconnectTestDb, refreshIds, testManagerId, testBranchId, testBranchBId } from './test-db'
import { signedSession } from './test-db'
import { mockRequest, getJson } from './mock-request'

describe('INTEGRATION: Stock transfer ship — missing inventory', () => {
  beforeAll(async () => {
    await ensureSeeded()
    await refreshIds()
  })
  afterAll(async () => { await disconnectTestDb() })
  beforeEach(async () => { await cleanMutations() })

  it('transfer with missing source inventory fails', async () => {
    const db = getTestDb()

    // Create a product with NO inventory at branch B
    const newProduct = await db.product.create({
      data: {
        name: 'ทดสอบไม่มีสต็อก',
        slug: 'test-no-stock',
        sku: 'TEST-NOSKU',
        price: 10,
        costPrice: 5,
        unit: 'ชิ้น',
        categoryId: (await db.category.findFirst())!.id,
        type: 'FRESH',
        isActive: true,
      },
    })

    // Create transfer from Branch A → Branch B for a product that has NO inventory at A
    // (newProduct has no inventory at all)
    const transfer = await db.stockTransfer.create({
      data: {
        transferNo: 'TRF-TEST-001',
        fromBranchId: testBranchId,
        toBranchId: testBranchBId,
        status: 'PENDING',
        items: JSON.stringify([{ productId: newProduct.id, productName: 'ทดสอบไม่มีสต็อก', quantity: 5, unit: 'ชิ้น' }]),
        totalItems: 5,
        userId: testManagerId,
      },
    })

    // Ship must fail
    const res = await transferShip(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: transfer.id }) }
    )
    expect(res.status).toBeGreaterThanOrEqual(400)

    // Transfer status must NOT have changed
    const updated = await db.stockTransfer.findUnique({ where: { id: transfer.id } })
    expect(updated!.status).toBe('PENDING')
  })

  it('transfer with valid inventory succeeds and decrements source', async () => {
    const db = getTestDb()

    // Use the seeded product that HAS inventory at branch A
    const product = await db.product.findFirst({})
    const invBefore = await db.inventory.findFirst({ where: { productId: product!.id, branchId: testBranchId } })
    expect(invBefore).toBeDefined()
    const qtyBefore = invBefore!.quantity

    const transfer = await db.stockTransfer.create({
      data: {
        transferNo: 'TRF-TEST-002',
        fromBranchId: testBranchId,
        toBranchId: testBranchBId,
        status: 'PENDING',
        items: JSON.stringify([{ productId: product!.id, productName: 'ทองหยิบ', quantity: 5, unit: 'ชิ้น' }]),
        totalItems: 5,
        userId: testManagerId,
      },
    })

    const res = await transferShip(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: transfer.id }) }
    )
    expect(res.status).toBe(200)

    // Source inventory decremented
    const invAfter = await db.inventory.findFirst({ where: { productId: product!.id, branchId: testBranchId } })
    expect(invAfter!.quantity).toBe(qtyBefore - 5)

    // Transfer status is now IN_TRANSIT
    const updated = await db.stockTransfer.findUnique({ where: { id: transfer.id } })
    expect(updated!.status).toBe('IN_TRANSIT')
  })

  it('failed transfer creates no stock movements', async () => {
    const db = getTestDb()

    const newProduct = await db.product.create({
      data: {
        name: 'ทดสอบไม่มีสต็อก 2',
        slug: 'test-no-stock-2',
        sku: 'TEST-NOSKU-2',
        price: 10,
        costPrice: 5,
        unit: 'ชิ้น',
        categoryId: (await db.category.findFirst())!.id,
        type: 'FRESH',
        isActive: true,
      },
    })

    const transfer = await db.stockTransfer.create({
      data: {
        transferNo: 'TRF-TEST-003',
        fromBranchId: testBranchId,
        toBranchId: testBranchBId,
        status: 'PENDING',
        items: JSON.stringify([{ productId: newProduct.id, productName: 'ทดสอบ', quantity: 3, unit: 'ชิ้น' }]),
        totalItems: 3,
        userId: testManagerId,
      },
    })

    // Ship fails
    await transferShip(
      mockRequest({ method: 'POST', cookies: { kh_session: signedSession(testManagerId) } }),
      { params: Promise.resolve({ id: transfer.id }) }
    )

    // No stock movements should exist for this transfer
    const movements = await db.stockMovement.findMany({
      where: { refId: transfer.id },
    })
    expect(movements.length).toBe(0)
  })
})
