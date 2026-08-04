/**
 * SECURITY TEST: HMAC session token signing/verification.
 *
 * Verifies:
 * - Valid token is accepted
 * - Tampered token is rejected
 * - Malformed token is rejected
 * - Different userId produces different signature
 */
import { describe, it, expect } from 'vitest'
import { signSessionToken, verifySessionToken } from '@/lib/session-signing'

describe('SECURITY: HMAC Session Token', () => {
  it('valid token verifies and returns userId', () => {
    const userId = 'cmr_test_user_123'
    const token = signSessionToken(userId)
    const verified = verifySessionToken(token)

    expect(verified).toBe(userId)
  })

  it('tampered token is rejected', () => {
    const userId = 'cmr_test_user_123'
    const token = signSessionToken(userId)

    // Tamper: change the userId part but keep the signature
    const parts = token.split('.')
    const tamperedToken = `${'cmr_different_user'}.${parts[1]}`
    const verified = verifySessionToken(tamperedToken)

    expect(verified).toBeNull()
  })

  it('malformed token (no dot) is rejected', () => {
    expect(verifySessionToken('justastring')).toBeNull()
    expect(verifySessionToken('')).toBeNull()
    expect(verifySessionToken(null)).toBeNull()
    expect(verifySessionToken(undefined)).toBeNull()
  })

  it('different userIds produce different signatures', () => {
    const token1 = signSessionToken('user_1')
    const token2 = signSessionToken('user_2')

    expect(token1).not.toBe(token2)

    // user_2's signature should not verify for user_1
    const sig2 = token2.split('.')[1]
    const fakeToken = `user_1.${sig2}`
    expect(verifySessionToken(fakeToken)).toBeNull()
  })

  it('token format is userId.hmac', () => {
    const userId = 'test_user_abc'
    const token = signSessionToken(userId)

    expect(token).toContain('.')
    const [uid, sig] = token.split('.')
    expect(uid).toBe(userId)
    expect(sig).toMatch(/^[0-9a-f]{64}$/) // SHA-256 hex = 64 chars
  })
})
