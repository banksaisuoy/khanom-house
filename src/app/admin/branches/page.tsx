import { db } from '@/lib/db'
import { BranchesClient } from '@/components/admin/branches/branches-client'

export const dynamic = 'force-dynamic'

export default async function AdminBranchesPage() {
  const [branches, userCount] = await Promise.all([
    db.branch.findMany({
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { users: true, inventory: true } } },
    }),
    db.user.count({ where: { isActive: true } }),
  ])

  const branchList = branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    address: b.address,
    phone: b.phone,
    isMain: b.isMain,
    isActive: b.isActive,
    userCount: b._count.users,
    inventoryCount: b._count.inventory,
    createdAt: b.createdAt.toISOString(),
  }))

  return <BranchesClient initialBranches={branchList} totalUserCount={userCount} />
}
