/**
 * AUDIT-004: Gift card creation must validate amount and require
 * gift_cards.create permission (not customers.create).
 *
 * AUDIT-009: PDPA delete must use per-customer unique phone.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

describe('AUDIT-004: Gift card validation + permission', () => {
  const source = stripComments(
    fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/gift-cards/route.ts'),
      'utf-8'
    )
  )

  it('must use gift_cards.create permission (not customers.create)', () => {
    expect(source).toContain("'gift_cards.create'")
    expect(source).not.toMatch(/requirePermission\(req,\s*['"]customers\.create['"]\)/)
  })

  it('must have a Zod schema capping amount at 50000', () => {
    expect(source).toContain('giftCardCreateSchema')
    expect(source).toContain('max(50000')
  })

  it('must log audit on creation', () => {
    expect(source).toContain('logAudit')
    expect(source).toContain("'GiftCard'")
    expect(source).toContain("'CREATE'")
  })
})

describe('AUDIT-009: PDPA delete phone uniqueness', () => {
  const source = stripComments(
    fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/admin/customers/[id]/delete-data/route.ts'),
      'utf-8'
    )
  )

  it('must NOT use constant phone 0000000000', () => {
    expect(source).not.toContain("'0000000000'")
  })

  it('must use per-customer unique phone (DELETED-{id})', () => {
    expect(source).toContain('DELETED-')
    expect(source).toContain('slice(-6)')
  })
})
