import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { nextSeq } from '@/lib/sequence'

// POST /api/admin/pos/hold — พักบิล
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'pos.checkout')
  const body = await req.json()

  const holdCode = await nextSeq('hold', 'HOLD', 4)

  const held = await db.heldBill.create({
    data: {
      holdCode,
      shiftId: body.shiftId || null,
      userId: user.id,
      items: JSON.stringify(body.items || []),
      subtotal: body.subtotal || 0,
      discount: body.discount || 0,
      total: body.total || 0,
      notes: body.notes || null,
      customerName: body.customerName || null,
      customerPhone: body.customerPhone || null,
    },
  })

  return created({ holdCode, id: held.id })
})

// GET /api/admin/pos/hold — list held bills for current shift
export const GET = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'pos.read')
  const bills = await db.heldBill.findMany({
    where: { recalled: false, userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return ok({ bills })
})
