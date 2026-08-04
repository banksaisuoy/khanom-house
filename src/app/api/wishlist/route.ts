import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, badRequest, handle } from '@/lib/api-response'

// ============================================================
// GET /api/wishlist?sessionKey=...
// Returns: { items: [...] }
//
// AUDIT (P3-5): wrapped in `handle()` and uses shared response helpers
// instead of bare NextResponse.json + ad-hoc try/catch that leaked
// `e.message` to the client on 500. Response shape preserved.
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const sessionKey = searchParams.get('sessionKey')
  if (!sessionKey) {
    return ok({ items: [] })
  }
  const items = await db.wishlistItem.findMany({
    where: { sessionKey },
    include: { product: { include: { category: true } } },
    take: 200,
  })
  return ok({ items })
})

// ============================================================
// POST /api/wishlist  { sessionKey, productId, action: 'add' | 'remove' }
// Returns: { ok, action } on success; { error } on 400.
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const body = await req.json()
  const { sessionKey, productId, action } = body as {
    sessionKey: string
    productId: string
    action: 'add' | 'remove'
  }
  if (!sessionKey || !productId) {
    return badRequest('missing fields')
  }
  if (action === 'remove') {
    await db.wishlistItem.deleteMany({
      where: { sessionKey, productId },
    })
    return ok({ ok: true, action: 'removed' })
  }
  const existing = await db.wishlistItem.findFirst({
    where: { sessionKey, productId },
  })
  if (existing) {
    return ok({ ok: true, action: 'exists' })
  }
  await db.wishlistItem.create({
    data: { sessionKey, productId },
  })
  return ok({ ok: true, action: 'added' })
})
