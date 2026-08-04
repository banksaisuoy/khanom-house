/**
 * Logout — clears the session cookie.
 *
 * AUDIT (P3-5): wrapped in `handle()` for consistent error shape; uses
 * `ok()` from the shared api-response module instead of bare NextResponse.
 */
import { ok, handle } from '@/lib/api-response'
import { SESSION_COOKIE } from '@/lib/auth'

export const POST = handle(async () => {
  const res = ok({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return res
})
