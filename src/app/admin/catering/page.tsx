import { db } from '@/lib/db'
import { normalizeChecklist } from '@/lib/admin-ui'
import { CateringClient } from '@/components/admin/catering/catering-client'
import type { CateringEventDetail } from '@/components/admin/catering/event-detail-sheet'

export const dynamic = 'force-dynamic'

export default async function CateringPage() {
  const events = await db.cateringEvent.findMany({
    orderBy: { eventDate: 'desc' },
    include: { assignedUser: { select: { id: true, name: true, role: true } } },
  })

  const initial: CateringEventDetail[] = events.map((e) => ({
    ...e,
    eventDate: e.eventDate.toISOString(),
    setupTime: e.setupTime?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    items: e.items ? JSON.parse(e.items) : [],
    checklist: normalizeChecklist(e.checklist ? JSON.parse(e.checklist) : []),
  }))

  return <CateringClient initialEvents={initial} />
}
