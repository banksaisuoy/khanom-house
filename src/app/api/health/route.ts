import { db } from '@/lib/db'
import { ok, serverError, handle } from '@/lib/api-response'

/**
 * GET /api/health
 * Lightweight liveness probe — returns 200 if the process is alive.
 * Does NOT check database (use /api/ready for that).
 */
export const GET = handle(async () => {
  return ok({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'development',
    version: process.env.npm_package_version ?? '0.2.0',
  })
})
