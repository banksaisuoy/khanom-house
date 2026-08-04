import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle } from '@/lib/api-response'

export const GET = handle(async () => {
  const faqs = await db.faq.findMany({
    where: { isPublished: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })
  return ok({ faqs })
})
