import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, badRequest, handle } from '@/lib/api-response'
import { validate, cateringInquirySchema, cateringTypeSchema } from '@/lib/validation'
import { nextSeq } from '@/lib/sequence'
import { rateLimitResponse } from '@/lib/rate-limit'

// ============================================================
// POST /api/catering/inquiry  (public — storefront catering inquiry)
// Validates with cateringInquirySchema. Uses nextSeq for eventNo.
// Validates eventDate is in the future if provided.
//
// NOTE: no real rate-limiting without Redis. TODO: add IP-based throttle.
// ============================================================

function typeLabel(t: string) {
  switch (t) {
    case 'BREAK':
      return 'จัดเบรค'
    case 'SEMINAR':
      return 'งานสัมมนา'
    case 'WEDDING':
      return 'งานแต่ง'
    case 'MERIT':
      return 'งานบุญ'
    case 'CORPORATE':
      return 'งานองค์กร'
    case 'PARTY':
      return 'งานเลี้ยง'
    default:
      return 'งาน'
  }
}

// AUDIT (P3-9): IP-based rate limit (5 req/min) applied below —
// replaces the previous TODO comment.
export const POST = handle(async (req: NextRequest) => {
  const limited = rateLimitResponse(req)
  if (limited) return limited

  const body = validate(cateringInquirySchema, await req.json())

  // Validate eventDate is in the future if provided
  if (body.eventDate) {
    const d = new Date(body.eventDate)
    if (isNaN(d.getTime())) {
      return badRequest('วันที่งานไม่ถูกต้อง')
    }
    if (d.getTime() < Date.now() - 24 * 3600 * 1000) {
      return badRequest('วันที่งานต้องเป็นวันในอนาคต')
    }
  }

  // Client IP is now used by the rate limiter (rate-limit.ts).
  const _clientIp = req.headers.get('x-forwarded-for') ?? null
  void _clientIp

  const eventNo = await nextSeq('event', 'EVT-', 5)

  const guests = body.guestCount
  const ev = await db.cateringEvent.create({
    data: {
      eventNo,
      title: body.title || `${typeLabel(body.type)} ${body.customerName}`,
      type: body.type,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail ?? null,
      guestCount: guests,
      eventDate: body.eventDate ? new Date(body.eventDate) : new Date(),
      location: body.location || 'ระบุภายหลัง',
      budget: guests * 80,
      totalQuote: guests * 100,
      status: 'DRAFT',
      notes: body.notes,
      items: JSON.stringify([]),
      checklist: JSON.stringify([
        'ติดต่อลูกค้า',
        'ส่งใบเสนอราคา',
        'ยืนยันออเดอร์',
        'สั่งวัตถุดิบ',
        'ทำขนม',
        'จัดส่ง',
      ]),
    },
  })

  return created({ ok: true, eventNo, id: ev.id })
})
