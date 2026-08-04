import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const PATCH = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'orders.update')
  const { id } = await params
  const body = await req.json()
  const zone = await db.deliveryZone.update({ where: { id }, data: { ...body, districts: body.districts ? JSON.stringify(body.districts) : undefined } })
  return ok(zone)
})

export const DELETE = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'orders.update')
  const { id } = await params
  await db.deliveryZone.delete({ where: { id } })
  return ok({ deleted: true })
})
