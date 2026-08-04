/**
 * Test database setup — uses a SEPARATE SQLite file (db/test.db).
 *
 * This file is imported by all integration tests. It:
 * 1. Creates a fresh PrismaClient pointing at test.db
 * 2. Pushes the schema to test.db
 * 3. Seeds minimal test data (users, branch, products)
 * 4. Provides a `testDb` singleton for assertions
 * 5. Cleans up between test suites
 */
import { db as testDb } from '@/lib/db'
import bcrypt from 'bcryptjs'

let seeded = false

/**
 * Get the test database client.
 * Uses the SAME db instance as route handlers (from @/lib/db).
 * The setup file sets DATABASE_URL to test.db before any imports.
 */
export function getTestDb() {
  return testDb
}

/** Seed minimal test data if not already seeded. */
export async function ensureSeeded() {
  if (seeded) return
  const db = getTestDb()

  // Clean everything — order matters for FK constraints
  await db.stockMovement.deleteMany({})
  await db.orderItem.deleteMany({})
  await db.slipUpload.deleteMany({})
  await db.refund.deleteMany({})
  await db.payment.deleteMany({})
  await db.delivery.deleteMany({})
  await db.taxInvoice.deleteMany({})
  await db.giftCard.deleteMany({})
  await db.heldBill.deleteMany({})
  await db.storeCredit.deleteMany({})
  await db.productReview.deleteMany({})
  await db.stockTransfer.deleteMany({})
  await db.expense.deleteMany({})
  await db.staffSchedule.deleteMany({})
  await db.purchaseOrderItem.deleteMany({})
  await db.purchaseOrder.deleteMany({})
  await db.supplier.deleteMany({})
  await db.order.deleteMany({})
  await db.posBillItem.deleteMany({})
  await db.posBill.deleteMany({})
  await db.deliveryZone.deleteMany({})
  await db.faq.deleteMany({})
  await db.blogPost.deleteMany({})
  await db.auditLog.deleteMany({})
  await db.otpCode.deleteMany({})
  await db.notification.deleteMany({})
  await db.inventory.deleteMany({})
  await db.product.deleteMany({})
  await db.category.deleteMany({})
  await db.customer.deleteMany({})
  await db.shift.deleteMany({})
  await db.user.deleteMany({})
  await db.branch.deleteMany({})
  await db.sequence.deleteMany({})

  // Branch
  const branch = await db.branch.create({
    data: { name: 'Test Branch A', code: 'TST-A', isMain: true, isActive: true },
  })
  const branchB = await db.branch.create({
    data: { name: 'Test Branch B', code: 'TST-B', isMain: false, isActive: true },
  })

  // Users — all with password from SEED_PASSWORD env
  const pwd = await bcrypt.hash('test-password-not-for-production', 10)
  const superAdmin = await db.user.create({
    data: { email: 'admin@test.th', name: 'Super Admin', passwordHash: pwd, role: 'SUPER_ADMIN', branchId: branch.id, phone: '0810000001' },
  })
  const manager = await db.user.create({
    data: { email: 'manager@test.th', name: 'Manager', passwordHash: pwd, role: 'BRANCH_MANAGER', branchId: branch.id, phone: '0810000002' },
  })
  const cashier = await db.user.create({
    data: { email: 'cashier@test.th', name: 'Cashier', passwordHash: pwd, role: 'CASHIER', branchId: branch.id, phone: '0810000003' },
  })

  // Category + Product
  const cat = await db.category.create({
    data: { name: 'ขนมสด', slug: 'fresh', icon: '🍰', sortOrder: 1 },
  })
  const product = await db.product.create({
    data: {
      name: 'ทองหยิบ',
      slug: 'thong-yip',
      sku: 'TY-001',
      price: 30,
      costPrice: 15,
      unit: 'ชิ้น',
      categoryId: cat.id,
      type: 'FRESH',
      isActive: true,
      shelfLifeHours: 24,
    },
  })

  // Inventory at branch A
  const invA = await db.inventory.create({
    data: {
      productId: product.id,
      branchId: branch.id,
      type: 'FINISHED',
      quantity: 100,
      unit: 'ชิ้น',
      reorderPoint: 10,
      safetyStock: 5,
    },
  })

  // Inventory at branch B
  const invB = await db.inventory.create({
    data: {
      productId: product.id,
      branchId: branchB.id,
      type: 'FINISHED',
      quantity: 50,
      unit: 'ชิ้น',
      reorderPoint: 10,
      safetyStock: 5,
    },
  })

  // Open shift for cashier
  const shift = await db.shift.create({
    data: {
      shiftNo: 'SH-TEST-001',
      branchId: branch.id,
      userId: cashier.id,
      openingCash: 2000,
      expectedCash: 2000,
      status: 'OPEN',
    },
  })

  // Sequence seed
  await db.sequence.create({ data: { name: 'order', value: 0 } })
  await db.sequence.create({ data: { name: 'pos_bill', value: 0 } })
  await db.sequence.create({ data: { name: 'gift', value: 0 } })
  await db.sequence.create({ data: { name: 'refund', value: 0 } })
  await db.sequence.create({ data: { name: 'hold', value: 0 } })
  await db.sequence.create({ data: { name: 'transfer', value: 0 } })

  seeded = true
}

/** Clean mutation tables between tests (keep seed data). */
export async function cleanMutations() {
  const { _resetRateLimitForTests } = await import('@/lib/rate-limit')
  _resetRateLimitForTests()

  const db = getTestDb()
  await db.stockMovement.deleteMany({})
  await db.orderItem.deleteMany({})
  await db.slipUpload.deleteMany({})
  await db.refund.deleteMany({})
  await db.payment.deleteMany({})
  await db.delivery.deleteMany({})
  await db.taxInvoice.deleteMany({})
  await db.order.deleteMany({})
  await db.posBillItem.deleteMany({})
  await db.posBill.deleteMany({})
  await db.auditLog.deleteMany({})
  await db.otpCode.deleteMany({})
  await db.giftCard.deleteMany({})
  await db.heldBill.deleteMany({})
}

/** Disconnect the test DB. */
export async function disconnectTestDb() {
  // Don't disconnect — db is owned by @/lib/db singleton.
  // Just reset the seeded flag so re-seeding can happen if needed.
  seeded = false
}

// Export commonly needed test data IDs
export let testBranchId = ''
export let testBranchBId = ''
export let testSuperAdminId = ''
export let testManagerId = ''
export let testCashierId = ''
export let testProductId = ''
export let testInventoryAId = ''
export let testInventoryBId = ''
export let testShiftId = ''

/** Refresh test data IDs after seeding. */
export async function refreshIds() {
  const db = getTestDb()
  const branchA = await db.branch.findFirst({ where: { code: 'TST-A' } })
  const branchB = await db.branch.findFirst({ where: { code: 'TST-B' } })
  const sa = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  const mgr = await db.user.findFirst({ where: { role: 'BRANCH_MANAGER' } })
  const cash = await db.user.findFirst({ where: { role: 'CASHIER' } })
  const prod = await db.product.findFirst({})
  const invA = await db.inventory.findFirst({ where: { branchId: branchA!.id } })
  const invB = await db.inventory.findFirst({ where: { branchId: branchB!.id } })
  const shift = await db.shift.findFirst({ where: { status: 'OPEN' } })

  testBranchId = branchA!.id
  testBranchBId = branchB!.id
  testSuperAdminId = sa!.id
  testManagerId = mgr!.id
  testCashierId = cash!.id
  testProductId = prod!.id
  testInventoryAId = invA!.id
  testInventoryBId = invB!.id
  testShiftId = shift!.id
}

/** Create a signed session cookie value for a test user. */
import { signSessionToken } from '@/lib/session-signing'
export function signedSession(userId: string): string {
  return signSessionToken(userId)
}
