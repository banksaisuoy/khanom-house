import { NextRequest } from 'next/server'
import { getDashboardData, type RangeKey } from '@/lib/dashboard'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/dashboard?range=today|7d|30d|month
// Returns aggregated executive dashboard data.
// Permission: dashboard.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')

  const rangeParam = req.nextUrl.searchParams.get('range') ?? '30d'
  const range: RangeKey = (['today', '7d', '30d', 'month'].includes(rangeParam)
    ? rangeParam
    : '30d') as RangeKey

  const data = await getDashboardData(range)
  return ok(data)
})
