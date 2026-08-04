/**
 * AUDIT-001: OTP send must NOT return the OTP code in the response.
 *
 * Tests verify the source code contract by stripping comments and
 * checking only executable code.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

function stripComments(source: string): string {
  // Remove single-line comments (// ...) and multi-line (/* ... */)
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

describe('AUDIT-001: OTP send must not expose code', () => {
  const rawSource = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/auth/otp/send/route.ts'),
    'utf-8'
  )
  const source = stripComments(rawSource)

  it('return ok(...) must NOT contain `code` as a property', () => {
    // Find the return ok(...) line that returns to the client
    const returnMatches = source.match(/return ok\(\{[^}]+\}\)/g) || []
    const sentReturn = returnMatches.find((l) => l.includes('sent'))

    expect(sentReturn).toBeDefined()
    // Must not contain `code` as a standalone word in the response object
    expect(sentReturn!).not.toMatch(/\bcode\b/)
  })

  it('must NOT include the OTP value in the message', () => {
    const returnMatches = source.match(/return ok\(\{[^}]+\}\)/g) || []
    const sentReturn = returnMatches.find((l) => l.includes('sent'))

    expect(sentReturn).toBeDefined()
    expect(sentReturn!).not.toContain('รหัส OTP ของคุณคือ')
  })

  it('code generation must use Math.random or crypto', () => {
    expect(source).toMatch(/Math\.floor\(100000 \+ Math\.random|crypto\.randomInt/)
  })
})
