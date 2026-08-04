/**
 * AUDIT-002: PIN login must only accept CASHIER and BRANCH_MANAGER roles.
 * SUPER_ADMIN must NOT be reachable via PIN login.
 *
 * AUDIT-011: CASHIER must NOT have `orders.update` permission.
 *
 * AUDIT-012: Users route must use `users.read` permission (not dashboard.read).
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('AUDIT-002: PIN login role restriction', () => {
  it('candidate query must filter to CASHIER + BRANCH_MANAGER only', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/pos/pin-login/route.ts'),
      'utf-8'
    )

    expect(source).toContain("role: { in: ['CASHIER', 'BRANCH_MANAGER'] }")
    expect(source).not.toContain("role: { in: ['CASHIER', 'BRANCH_MANAGER', 'SUPER_ADMIN']")
  })

  it('must call rateLimitResponse before processing', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/pos/pin-login/route.ts'),
      'utf-8'
    )

    expect(source).toContain('rateLimitResponse(req)')
  })
})

describe('AUDIT-011: CASHIER RBAC must not include orders.update', () => {
  it('CASHIER permission set must not contain orders.update', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/auth.ts'),
      'utf-8'
    )

    // Extract the CASHIER block
    const cashierMatch = source.match(/CASHIER:\s*new Set\(\[([\s\S]*?)\]\)/)
    expect(cashierMatch).toBeDefined()
    const cashierBlock = cashierMatch![1]

    // Must NOT contain 'orders.update'
    expect(cashierBlock).not.toMatch(/['"]orders\.update['"]/)

    // Must still have pos.checkout and orders.read (basic cashier abilities)
    expect(cashierBlock).toContain('pos.checkout')
    expect(cashierBlock).toContain('orders.read')
  })
})

describe('AUDIT-012: Users route must use users.read', () => {
  it('GET /api/admin/users must require users.read (not dashboard.read)', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/users/route.ts'),
      'utf-8'
    )

    const getHandler = source.match(/export const GET[\s\S]*?await requirePermission\([^)]+\)/)
    expect(getHandler).toBeDefined()
    expect(getHandler![0]).toContain("'users.read'")
    expect(getHandler![0]).not.toContain("'dashboard.read'")
  })
})
