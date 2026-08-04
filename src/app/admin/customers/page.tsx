import { db } from '@/lib/db'
import { CustomersClient } from '@/components/admin/customers/customers-client'
import type { CustomerListItem } from '@/components/admin/customers/customer-detail-sheet'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const customers = await db.customer.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, orderNo: true, total: true, createdAt: true, status: true },
      },
    },
  })

  const initial: CustomerListItem[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    tier: c.tier,
    points: c.points,
    totalSpent: c.totalSpent,
    visitCount: c.visitCount,
    birthday: c.birthday ? c.birthday.toISOString() : null,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    lastOrder: c.orders[0]
      ? {
          id: c.orders[0].id,
          orderNo: c.orders[0].orderNo,
          total: c.orders[0].total,
          createdAt: c.orders[0].createdAt.toISOString(),
          status: c.orders[0].status,
        }
      : null,
  }))

  return <CustomersClient initialCustomers={initial} />
}
