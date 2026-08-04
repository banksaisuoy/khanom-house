import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { nextSeq } from '@/lib/sequence'

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'inventory.adjust')
  const body = await req.json()
  const transferNo = await nextSeq('transfer', 'TRF', 6)
  const transfer = await db.stockTransfer.create({
    data: {
      transferNo,
      fromBranchId: body.fromBranchId,
      toBranchId: body.toBranchId,
      items: JSON.stringify(body.items || []),
      totalItems: (body.items || []).reduce((s: number, i: { quantity: number }) => s + i.quantity, 0),
      notes: body.notes || null,
      userId: user.id,
      status: 'PENDING',
    },
  })
  return created(transfer)
})

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'inventory.read')
  const sp = new URL(req.url).searchParams
  const where: Record<string, unknown> = {}
  if (sp.get('status')) where.status = sp.get('status')
  const transfers = await db.stockTransfer.findMany({
    where,
    include: { fromBranch: { select: { name: true } }, toBranch: { select: { name: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return ok({ transfers })
})
