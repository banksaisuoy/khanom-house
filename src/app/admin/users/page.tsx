import { db } from '@/lib/db'
import { UsersClient, type UserRow } from '@/components/admin/users/users-client'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const [users, branches] = await Promise.all([
    db.user.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true, email: true, name: true, phone: true, avatarUrl: true,
        role: true, branchId: true, isActive: true, lastLoginAt: true, createdAt: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    }),
    db.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const initial: UserRow[] = users.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }))

  return <UsersClient initialUsers={initial} branches={branches} />
}
