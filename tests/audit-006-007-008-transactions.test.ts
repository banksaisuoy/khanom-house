/**
 * AUDIT-006: Slip verification must be idempotent and transactional.
 *
 * AUDIT-007: POS cancel bill must reverse inventory at the correct branch
 * and reverse shift totals.
 *
 * AUDIT-008: Stock transfer ship must throw on missing inventory.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('AUDIT-006: Slip verify idempotent + transactional', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/admin/slip-upload/[id]/verify/route.ts'),
    'utf-8'
  )

  it('must check status === PENDING before processing', () => {
    expect(source).toContain("status !== 'PENDING'")
    expect(source).toContain("'ไม่สามารถยืนยันได้ (สลิปถูกตรวจสอบแล้วหรือถูกปฏิเสธ)")
  })

  it('must use $transaction for slip update + order update', () => {
    expect(source).toContain('db.$transaction')
  })

  it('must use updateMany with status: PENDING guard (idempotent)', () => {
    expect(source).toContain('updateMany')
    expect(source).toContain("status: 'PENDING'")
  })

  it('must log audit on success', () => {
    expect(source).toContain('logAudit')
    expect(source).toContain("entity: 'SlipUpload'")
  })
})

describe('AUDIT-007: Cancel bill branch filter + shift reversal', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/admin/pos/cancel-bill/route.ts'),
    'utf-8'
  )

  it('must fetch bill with shift to get branchId', () => {
    expect(source).toContain('include: { shift:')
    expect(source).toContain('branchId: true')
  })

  it('must filter inventory by branchId (not just productId)', () => {
    expect(source).toContain('branchId: bill.shift.branchId')
    // Must NOT have the old pattern of findFirst with only productId
    expect(source).not.toMatch(/findFirst\(\{\s*where:\s*\{\s*productId:\s*item\.productId\s*\}\s*\}\)/)
  })

  it('must reverse shift totals (totalSales, cashSales, etc.)', () => {
    expect(source).toContain('totalSales')
    expect(source).toContain('cashSales')
    expect(source).toContain('shift.update')
  })
})

describe('AUDIT-008: Stock transfer ship must throw on missing inventory', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/admin/stock-transfer/[id]/ship/route.ts'),
    'utf-8'
  )

  it('must throw when inventory is null (not silently skip)', () => {
    expect(source).toContain('if (!inv)')
    expect(source).toContain('throw new Error')
    expect(source).toContain('ไม่พบสต็อกต้นทาง')
  })

  it('must NOT have the old `if (inv) { ... }` pattern that silently skips', () => {
    // The old code had `if (inv) { ... }` without an else throw
    // The new code must have `if (!inv) { throw }` BEFORE the update
    const oldPattern = /if \(inv\)\s*\{/
    expect(source).not.toMatch(oldPattern)
  })
})
