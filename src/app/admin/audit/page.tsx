import { db } from '@/lib/db'
import { AuditClient } from '@/components/admin/audit/audit-client'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return <AuditClient initialUsers={users.map((u) => ({ id: u.id, name: u.name, role: u.role }))} />
}
