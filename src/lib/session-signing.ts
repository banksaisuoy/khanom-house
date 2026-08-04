/**
 * Session token signing/verification using HMAC-SHA256.
 *
 * WHY: Previously the session cookie was a raw `userId` — anyone who
 * obtained a userId (from logs, URLs, error messages) could forge a
 * cookie and impersonate that user. Now: cookie value is
 * `{userId}.{hmac(userId)}` and tampered cookies are rejected.
 *
 * The HMAC secret is read from `SESSION_SECRET` env var. In
 * development a fallback secret is used (with a console warning).
 * In production, `SESSION_SECRET` MUST be set — startup throws if not.
 */
import crypto from 'crypto'

const DEV_FALLBACK_SECRET = 'khanom-house-dev-secret-DO-NOT-USE-IN-PRODUCTION'

let _warned = false

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SESSION_SECRET environment variable is required in production. ' +
        'Generate one with: openssl rand -hex 32'
      )
    }
    // Dev only — log a warning once
    if (!_warned) {
      console.warn('[security] SESSION_SECRET not set — using insecure dev fallback. Do NOT use in production.')
      _warned = true
    }
    return DEV_FALLBACK_SECRET
  }
  return secret
}

/**
 * Sign a userId into a session token: `{userId}.{hmac}`.
 */
export function signSessionToken(userId: string): string {
  const secret = getSessionSecret()
  const hmac = crypto.createHmac('sha256', secret).update(userId).digest('hex')
  return `${userId}.${hmac}`
}

/**
 * Verify a session token and return the userId if valid.
 * Returns null for:
 *   - Malformed tokens (no `.` separator)
 *   - Tampered HMAC (does not match)
 *   - Empty/null input
 */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null

  const dotIndex = token.lastIndexOf('.')
  if (dotIndex < 1) return null

  const userId = token.substring(0, dotIndex)
  const signature = token.substring(dotIndex + 1)

  if (!userId || !signature) return null

  const secret = getSessionSecret()
  const expectedHmac = crypto.createHmac('sha256', secret).update(userId).digest('hex')

  // Use timingSafeEqual to prevent timing attacks
  try {
    const a = Buffer.from(signature, 'hex')
    const b = Buffer.from(expectedHmac, 'hex')
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null
    return userId
  } catch {
    return null
  }
}
