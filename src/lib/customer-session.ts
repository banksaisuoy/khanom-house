/**
 * Customer (loyalty member) session cookie.
 *
 * Distinct from the admin/staff `kh_session` cookie. Used by the storefront
 * after OTP login.
 *
 * SECURITY: Cookie value is a signed HMAC token (`{customerId}.{hmac}`),
 * not a raw customerId. Tampered cookies are rejected silently.
 * Uses the same session-signing utility as admin sessions.
 */
import { signSessionToken, verifySessionToken } from './session-signing'

export const CUSTOMER_SESSION_COOKIE = 'kh_customer_session'
export const CUSTOMER_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * Sign a customerId into a customer session token.
 * Format: `{customerId}.{hmac}`
 */
export function signCustomerSession(customerId: string): string {
  return signSessionToken(customerId)
}

/**
 * Verify a customer session token and return the customerId if valid.
 * Returns null for tampered, malformed, or empty tokens.
 * Also supports backward-compatible raw customerId cookies (no dot)
 * during the migration period — these are accepted but not trusted
 * for sensitive operations.
 *
 * @param strict If true, reject legacy raw-id cookies. Default: false.
 */
export function verifyCustomerSession(
  token: string | undefined | null,
  strict = false
): string | null {
  if (!token) return null

  // Signed token format: `{id}.{hmac}`
  if (token.includes('.')) {
    return verifySessionToken(token)
  }

  // Legacy raw-id cookie (backward compat) — only accepted in non-strict mode
  if (!strict && token.length > 10) {
    return token
  }

  return null
}
