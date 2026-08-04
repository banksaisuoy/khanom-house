import { db } from '@/lib/db'
import { SettingsClient } from '@/components/admin/settings/settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const branches = await db.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, address: true, phone: true, isMain: true },
    orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
  })

  return <SettingsClient branches={branches} />
}
