import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

export const POST = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')
  const body = await req.json()
  const faq = await db.faq.create({ data: { question: body.question, answer: body.answer, category: body.category || 'general', sortOrder: body.sortOrder || 0, isPublished: body.isPublished ?? true } })
  return created(faq)
})

export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')
  const faqs = await db.faq.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] })
  return ok({ faqs })
})
