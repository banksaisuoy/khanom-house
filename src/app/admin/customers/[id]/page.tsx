import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { CustomerDetailPage } from '@/components/admin/customers/customer-detail-page'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, orderNo: true, total: true, createdAt: true, status: true } },
    },
  })
  if (!c) notFound()
  const data = {
    ...c,
    birthday: c.birthday ? c.birthday.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    lastOrder: c.orders[0]
      ? { id: c.orders[0].id, orderNo: c.orders[0].orderNo, total: c.orders[0].total, createdAt: c.orders[0].createdAt.toISOString(), status: c.orders[0].status }
      : null,
  }
  return <CustomerDetailPage customer={data} />
}
