import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'

export const GET = handle(async () => {
  const zones = await db.deliveryZone.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  return ok({ zones: zones.map(z => ({ ...z, districts: JSON.parse(z.districts) })) })
})
