import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'

export const POST = handle(async (req: NextRequest) => {
  const { address, subtotal } = await req.json()
  const zones = await db.deliveryZone.findMany({ where: { isActive: true } })
  let matchedZone: any = null
  let shippingFee = 40 // default
  for (const zone of zones) {
    const districts = JSON.parse(zone.districts) as string[]
    if (districts.some(d => address.includes(d))) {
      matchedZone = zone
      shippingFee = subtotal >= zone.freeShippingThreshold ? 0 : zone.shippingFee
      break
    }
  }
  return ok({ zone: matchedZone?.name || null, shippingFee, freeShippingThreshold: matchedZone?.freeShippingThreshold || 500, estimatedDays: matchedZone?.estimatedDays || 1 })
})
