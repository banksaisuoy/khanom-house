import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'accounting.read')
  const { id } = await params
  await db.taxInvoice.update({ where: { id }, data: { status: 'CANCELLED' } })
  return ok({ cancelled: true })
})
