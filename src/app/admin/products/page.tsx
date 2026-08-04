import { db } from '@/lib/db'
import { ProductsClient } from '@/components/admin/products/products-client'
import type { CategoryDTO } from '@/lib/admin-catalog'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: 'asc' } })
  const branches = await db.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })

  const cats: CategoryDTO[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    slug: c.slug,
    icon: c.icon,
    sortOrder: c.sortOrder,
  }))

  const branchList = branches.map((b) => ({ id: b.id, name: b.name, isMain: b.isMain }))

  return <ProductsClient categories={cats} branches={branchList} />
}
