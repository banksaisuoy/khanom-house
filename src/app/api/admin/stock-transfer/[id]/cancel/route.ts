import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, conflict, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'inventory.adjust')
  const { id } = await params
  const r = await db.stockTransfer.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED' } })
  if (r.count === 0) return conflict('ไม่สามารถยกเลิกได้')
  return ok({ cancelled: true })
})
