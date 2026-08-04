import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, badRequest, handle } from '@/lib/api-response'

// ============================================================
// GET /api/promotions/validate?code=XXX
// AUDIT FIX H-8: `discount = type === 'PERCENT' ? value/100 : 0.1`
// — FIXED type was hard-coded to 10% regardless of value.
// Fix: PERCENT → value/100, FIXED → value, BOGO → 0 (handled separately).
// Also checks isActive, endsAt > now, usedCount < usageLimit.
//
// AUDIT (P3-5): wrapped in `handle()` and uses shared response helpers
// instead of bare NextResponse.json + ad-hoc try/catch. Response shape
// preserved: `{ valid, error }` for invalid; `{ valid: true, code, ... }`
// for valid.
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) {
    return badRequest('กรุณาระบุรหัสคูปอง')
  }
  const promo = await db.promotion.findUnique({
    where: { code: code.toUpperCase() },
  })
  if (!promo || !promo.isActive || promo.deletedAt) {
    return ok({ valid: false, error: 'ไม่พบคูปองนี้' })
  }
  const now = new Date()
  if (promo.endsAt && promo.endsAt < now) {
    return ok({ valid: false, error: 'คูปองหมดอายุแล้ว' })
  }
  if (promo.startsAt && promo.startsAt > now) {
    return ok({ valid: false, error: 'คูปองยังไม่เริ่มใช้งาน' })
  }
  if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
    return ok({ valid: false, error: 'คูปองใช้งานครบแล้ว' })
  }
  // FIX: previously `type === 'PERCENT' ? value/100 : 0.1` — hard-coded
  // 10% for any non-PERCENT type. Now compute correctly per type.
  const discount =
    promo.type === 'PERCENT'
      ? promo.value / 100
      : promo.type === 'FIXED'
        ? promo.value
        : 0 // BOGO — no monetary discount; handled in cart logic
  return ok({
    valid: true,
    code: promo.code,
    name: promo.name,
    discount,
    type: promo.type,
    value: promo.value,
    minSpend: promo.minSpend,
    maxDiscount: promo.maxDiscount,
  })
})
