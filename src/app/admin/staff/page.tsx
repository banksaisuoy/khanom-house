import { db } from '@/lib/db'
import { StaffClient } from '@/components/admin/staff/staff-client'

export const dynamic = 'force-dynamic'

export default async function AdminStaffPage() {
  const [users, branches] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, email: true, role: true,
        avatarUrl: true, branchId: true,
        branch: { select: { id: true, name: true } },
      },
    }),
    db.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, isMain: true },
      orderBy: { isMain: 'desc' },
    }),
  ])

  const userList = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    branchId: u.branchId,
    branchName: u.branch?.name ?? null,
  }))

  const branchList = branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    isMain: b.isMain,
  }))

  return <StaffClient users={userList} branches={branchList} />
}
