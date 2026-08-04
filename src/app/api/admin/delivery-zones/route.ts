import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest) => {
  await requirePermission(req, 'orders.update')
  const body = await req.json()
  const zone = await db.deliveryZone.create({
    data: { name: body.name, districts: JSON.stringify(body.districts || []), shippingFee: body.shippingFee, freeShippingThreshold: body.freeShippingThreshold || 500, estimatedDays: body.estimatedDays || 1, isActive: body.isActive ?? true },
  })
  return created(zone)
})

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'orders.read')
  const zones = await db.deliveryZone.findMany({ orderBy: { name: 'asc' } })
  return ok({ zones: zones.map(z => ({ ...z, districts: JSON.parse(z.districts) })) })
})
