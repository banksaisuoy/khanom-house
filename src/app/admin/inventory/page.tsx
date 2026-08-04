import { db } from '@/lib/db'
import { InventoryClient } from '@/components/admin/inventory/inventory-client'

export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage() {
  const branches = await db.branch.findMany({ where: { isActive: true }, orderBy: { isMain: 'desc' } })
  const branchList = branches.map((b) => ({ id: b.id, name: b.name, isMain: b.isMain }))
  return <InventoryClient branches={branchList} />
}
