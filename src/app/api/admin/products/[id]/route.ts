import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  parseJsonArray,
  slugify,
  type ProductAdminDTO,
  type InventoryRowDTO,
} from '@/lib/admin-catalog'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

async function loadProduct(id: string): Promise<ProductAdminDTO | null> {
  const p = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      inventory: { include: { branch: true } },
      recipe: { select: { id: true, yieldQty: true, yieldUnit: true } },
    },
  })
  if (!p) return null
  const inventory: InventoryRowDTO[] = p.inventory.map((i) => ({
    id: i.id,
    branchId: i.branchId,
    branchName: i.branch?.name ?? '',
    type: i.type,
    quantity: i.quantity,
    unit: i.unit,
    reorderPoint: i.reorderPoint,
    safetyStock: i.safetyStock,
    batchNo: i.batchNo,
    expiryAt: i.expiryAt ? i.expiryAt.toISOString() : null,
    location: i.location,
    updatedAt: i.updatedAt.toISOString(),
  }))
  const totalStock = inventory.reduce((s, i) => s + i.quantity, 0)
  const lowStock = inventory.some((i) => i.quantity <= i.reorderPoint)
  return {
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    slug: p.slug,
    sku: p.sku,
    barcode: p.barcode,
    description: p.description,
    categoryId: p.categoryId,
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          nameEn: p.category.nameEn,
          slug: p.category.slug,
          icon: p.category.icon,
          sortOrder: p.category.sortOrder,
        }
      : null,
    type: p.type,
    price: p.price,
    memberPrice: p.memberPrice,
    wholesalePrice: p.wholesalePrice,
    eventPrice: p.eventPrice,
    costPrice: p.costPrice,
    unit: p.unit,
    images: parseJsonArray(p.images),
    tags: parseJsonArray(p.tags),
    isBestSeller: p.isBestSeller,
    isFeatured: p.isFeatured,
    isFlashSale: p.isFlashSale,
    flashSalePrice: p.flashSalePrice,
    flashSaleEndAt: p.flashSaleEndAt ? p.flashSaleEndAt.toISOString() : null,
    flashSaleStock: p.flashSaleStock,
    shelfLifeHours: p.shelfLifeHours,
    needsRefrigeration: p.needsRefrigeration,
    allergens: parseJsonArray(p.allergens),
    storageInstructions: p.storageInstructions,
    consumeWithin: p.consumeWithin,
    isVegan: p.isVegan,
    isHalal: p.isHalal,
    isVegetarian: p.isVegetarian,
    rating: p.rating,
    reviewCount: p.reviewCount,
    soldCount: p.soldCount,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    inventory,
    recipe: p.recipe ?? null,
    totalStock,
    lowStock,
  }
}

// GET /api/admin/products/[id]  -> ProductAdminDTO + salesSparkline (last 7 days)
// Permission: products.read
export const GET = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'products.read')
  const { id } = await params
  const product = await loadProduct(id)
  if (!product) throw new NotFoundError('ไม่พบสินค้า')

  const since = new Date(Date.now() - 7 * 86400000)
  const items = await db.orderItem.findMany({
    where: { productId: id, order: { createdAt: { gte: since } } },
    select: { quantity: true, total: true, order: { select: { createdAt: true } } },
  })
  const days: { date: string; qty: number; revenue: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ date: key, qty: 0, revenue: 0 })
  }
  const map = new Map(days.map((d) => [d.date, d]))
  for (const it of items) {
    const d = it.order.createdAt
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const row = map.get(key)
    if (row) {
      row.qty += it.quantity
      row.revenue += it.total
    }
  }

  return ok({ product, salesSparkline: days })
})

type PatchBody = Partial<{
  name: string
  nameEn: string | null
  barcode: string | null
  description: string | null
  categoryId: string
  type: string
  price: number
  memberPrice: number | null
  wholesalePrice: number | null
  eventPrice: number | null
  costPrice: number
  unit: string
  tags: string[]
  isBestSeller: boolean
  isFeatured: boolean
  isFlashSale: boolean
  flashSalePrice: number | null
  flashSaleEndAt: string | null
  flashSaleStock: number | null
  shelfLifeHours: number | null
  needsRefrigeration: boolean
  allergens: string[]
  storageInstructions: string | null
  consumeWithin: string | null
  isVegan: boolean
  isHalal: boolean
  isVegetarian: boolean
  isActive: boolean
}>

// PATCH /api/admin/products/[id]
// Permission: products.update
export const PATCH = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'products.update')
  const { id } = await params
  const body = (await req.json()) as PatchBody
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบสินค้า')

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) {
    data.name = body.name.trim()
    data.slug = slugify(body.name) + '-' + id.slice(-4)
  }
  if (body.nameEn !== undefined) data.nameEn = body.nameEn?.trim() || null
  if (body.barcode !== undefined) data.barcode = body.barcode?.trim() || null
  if (body.description !== undefined) data.description = body.description || null
  if (body.categoryId) data.categoryId = body.categoryId
  if (body.type) data.type = body.type
  if (typeof body.price === 'number') data.price = body.price
  if (body.memberPrice !== undefined) data.memberPrice = body.memberPrice
  if (body.wholesalePrice !== undefined) data.wholesalePrice = body.wholesalePrice
  if (body.eventPrice !== undefined) data.eventPrice = body.eventPrice
  if (typeof body.costPrice === 'number') data.costPrice = body.costPrice
  if (body.unit !== undefined) data.unit = body.unit
  if (body.tags !== undefined) data.tags = JSON.stringify(body.tags)
  if (typeof body.isBestSeller === 'boolean') data.isBestSeller = body.isBestSeller
  if (typeof body.isFeatured === 'boolean') data.isFeatured = body.isFeatured
  if (typeof body.isFlashSale === 'boolean') data.isFlashSale = body.isFlashSale
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (typeof body.needsRefrigeration === 'boolean') data.needsRefrigeration = body.needsRefrigeration
  if (body.shelfLifeHours !== undefined) data.shelfLifeHours = body.shelfLifeHours
  if (body.allergens !== undefined) data.allergens = JSON.stringify(body.allergens)
  if (body.storageInstructions !== undefined) data.storageInstructions = body.storageInstructions?.trim() || null
  if (body.consumeWithin !== undefined) data.consumeWithin = body.consumeWithin?.trim() || null
  if (typeof body.isVegan === 'boolean') data.isVegan = body.isVegan
  if (typeof body.isHalal === 'boolean') data.isHalal = body.isHalal
  if (typeof body.isVegetarian === 'boolean') data.isVegetarian = body.isVegetarian

  // Flash sale fields — only when isFlashSale true
  if (body.isFlashSale) {
    if (body.flashSalePrice !== undefined) data.flashSalePrice = body.flashSalePrice
    if (body.flashSaleEndAt !== undefined)
      data.flashSaleEndAt = body.flashSaleEndAt ? new Date(body.flashSaleEndAt) : null
    if (body.flashSaleStock !== undefined) data.flashSaleStock = body.flashSaleStock
  } else if (body.isFlashSale === false) {
    data.flashSalePrice = null
    data.flashSaleEndAt = null
    data.flashSaleStock = null
  }

  await db.product.update({ where: { id }, data })
  const refreshed = await loadProduct(id)
  return ok({ product: refreshed })
})

// DELETE — soft delete (isActive=false)
// Permission: products.delete
export const DELETE = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'products.delete')
  const { id } = await params
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบสินค้า')
  await db.product.update({ where: { id }, data: { isActive: false } })
  return ok({ ok: true })
})
