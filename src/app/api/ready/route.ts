import { db } from '@/lib/db'
import { ok, serverError, handle } from '@/lib/api-response'

/**
 * GET /api/ready
 * Readiness probe — checks database connectivity + critical env vars.
 * Returns 200 if ready, 503 if not.
 */
export const GET = handle(async () => {
  const checks: Record<string, 'ok' | 'fail'> = {
    database: 'fail',
    sessionSecret: 'fail',
  }

  // Check database
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'fail'
  }

  // Check SESSION_SECRET (required in production, optional in dev)
  if (process.env.NODE_ENV === 'production') {
    checks.sessionSecret = process.env.SESSION_SECRET ? 'ok' : 'fail'
  } else {
    checks.sessionSecret = 'ok' // dev fallback is acceptable
  }

  const allOk = Object.values(checks).every((v) => v === 'ok')

  if (!allOk) {
    return serverError(new Error('Readiness check failed'), 'Service not ready')
  }

  return ok({
    status: 'ready',
    checks,
    timestamp: new Date().toISOString(),
  })
})
