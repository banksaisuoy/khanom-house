import { db } from '@/lib/db'
import { SuppliersClient } from '@/components/admin/suppliers/suppliers-client'

export const dynamic = 'force-dynamic'

export default async function AdminSuppliersPage() {
  const [suppliers, branches, poStats] = await Promise.all([
    db.supplier.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      take: 200,
      include: { _count: { select: { purchaseOrders: true } } },
    }),
    db.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, isMain: true },
      orderBy: { isMain: 'desc' },
    }),
    db.purchaseOrder.aggregate({
      _sum: { total: true },
      _count: true,
    }),
  ])

  const supplierList = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    contactName: s.contactName,
    phone: s.phone,
    email: s.email,
    address: s.address,
    taxId: s.taxId,
    paymentTerms: s.paymentTerms,
    rating: s.rating,
    isActive: s.isActive,
    poCount: s._count.purchaseOrders,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return (
    <SuppliersClient
      initialSuppliers={supplierList}
      branches={branches}
      poStats={{
        total: poStats._count,
        sumTotal: poStats._sum.total ?? 0,
      }}
    />
  )
}
