import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const PATCH = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'dashboard.read')
  const { id } = await params
  const body = await req.json()
  const faq = await db.faq.update({ where: { id }, data: body })
  return ok(faq)
})

export const DELETE = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'dashboard.read')
  const { id } = await params
  await db.faq.delete({ where: { id } })
  return ok({ deleted: true })
})
