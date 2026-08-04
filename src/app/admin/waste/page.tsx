import { db } from '@/lib/db'
import { WasteClient } from '@/components/admin/waste/waste-client'
import type { WasteLog } from '@/components/admin/waste/waste-client'

export const dynamic = 'force-dynamic'

export default async function WastePage() {
  const logs = await db.wasteLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, role: true } } },
    take: 500,
  })

  const initial: WasteLog[] = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }))

  return <WasteClient initialLogs={initial} />
}
