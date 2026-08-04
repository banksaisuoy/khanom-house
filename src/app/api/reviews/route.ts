import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'

export const POST = handle(async (req: NextRequest) => {
  const body = await req.json()
  const review = await db.productReview.create({
    data: {
      productId: body.productId,
      customerId: body.customerId || null,
      customerName: body.customerName,
      rating: body.rating,
      title: body.title || null,
      comment: body.comment || null,
      orderId: body.orderId || null,
      isVerified: !!body.orderId,
    },
  })
  return created(review)
})

export const GET = handle(async (req: NextRequest) => {
  const sp = new URL(req.url).searchParams
  const productId = sp.get('productId')
  const where: Record<string, unknown> = { isPublished: true }
  if (productId) where.productId = productId
  const reviews = await db.productReview.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return ok({ reviews })
})
