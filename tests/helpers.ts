/**
 * Test helpers — pure function tests that don't require a running server.
 * These verify the SECURITY CONTRACT of the codebase (RBAC matrix,
 * validation schemas, cookie config) by importing the actual source.
 */
import { db } from '@/lib/db'

/** Clear all test data between tests (order matters for FK constraints). */
export async function cleanupTestDB() {
  // Only clean mutation tables — never delete seed users/products
  await db.stockMovement.deleteMany({})
  await db.orderItem.deleteMany({})
  await db.order.deleteMany({})
  await db.posBillItem.deleteMany({})
  await db.posBill.deleteMany({})
  await db.auditLog.deleteMany({})
  await db.otpCode.deleteMany({})
}

/** Get a test admin user (Super Admin). */
export async function getAdminUser() {
  return db.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
}

/** Get a test cashier user. */
export async function getCashierUser() {
  return db.user.findFirst({ where: { role: 'CASHIER' } })
}

/** Get a test manager user. */
export async function getManagerUser() {
  return db.user.findFirst({ where: { role: 'BRANCH_MANAGER' } })
}

/** Get the main branch. */
export async function getMainBranch() {
  return db.branch.findFirst({ where: { isMain: true } })
}

/** Get a test product. */
export async function getFirstProduct() {
  return db.product.findFirst({})
}
