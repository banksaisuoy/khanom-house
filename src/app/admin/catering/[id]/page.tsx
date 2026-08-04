import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { normalizeChecklist } from '@/lib/admin-ui'
import { CateringEventDetailPage } from '@/components/admin/catering/event-detail-page'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ev = await db.cateringEvent.findUnique({
    where: { id },
    include: { assignedUser: { select: { id: true, name: true, role: true } } },
  })
  if (!ev) notFound()
  const data = {
    ...ev,
    eventDate: ev.eventDate.toISOString(),
    setupTime: ev.setupTime?.toISOString() ?? null,
    createdAt: ev.createdAt.toISOString(),
    updatedAt: ev.updatedAt.toISOString(),
    items: ev.items ? JSON.parse(ev.items) : [],
    checklist: normalizeChecklist(ev.checklist ? JSON.parse(ev.checklist) : []),
  }
  return <CateringEventDetailPage event={data} />
}
