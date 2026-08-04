import { db } from '@/lib/db'
import { ExpensesClient } from '@/components/admin/expenses/expenses-client'

export const dynamic = 'force-dynamic'

export default async function AdminExpensesPage() {
  const branches = await db.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, isMain: true },
    orderBy: { isMain: 'desc' },
  })

  return <ExpensesClient branches={branches} />
}
