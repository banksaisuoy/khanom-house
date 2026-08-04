import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  parseJsonArray,
  slugify,
  suggestSku,
  type ProductAdminDTO,
  type InventoryRowDTO,
} from '@/lib/admin-catalog'
import { ok, created, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// GET /api/admin/products
//   ?search=&categoryId=&type=&status=active|inactive&best=1&flash=1
// Returns array of ProductAdminDTO.
// Permission: products.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'products.read')

  const sp = req.nextUrl.searchParams
  const search = sp.get('search')?.trim() || ''
  const categoryId = sp.get('categoryId') || ''
  const type = sp.get('type') || ''
  const status = sp.get('status') || ''
  const best = sp.get('best') === '1'
  const flash = sp.get('flash') === '1'

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { nameEn: { contains: search } },
      { sku: { contains: search } },
      { barcode: { contains: search } },
    ]
  }
  if (categoryId) where.categoryId = categoryId
  if (type) where.type = type
  if (status === 'active') where.isActive = true
  if (status === 'inactive') where.isActive = false
  if (best) where.isBestSeller = true
  if (flash) where.isFlashSale = true

  // AUDIT (P2-4): use select to fetch only the inventory fields actually
  // consumed by the DTO (was `include: { branch: true }` which fetched
  // every Branch column). Also added `take: 200` to bound the result set.
  const products = await db.product.findMany({
    where,
    take: 200,
    orderBy: [{ isActive: 'desc' }, { soldCount: 'desc' }, { name: 'asc' }],
    include: {
      category: true,
      inventory: {
        select: {
          id: true,
          branchId: true,
          branch: { select: { name: true } },
          type: true,
          quantity: true,
          unit: true,
          reorderPoint: true,
          safetyStock: true,
          batchNo: true,
          expiryAt: true,
          location: true,
          updatedAt: true,
        },
      },
      recipe: { select: { id: true, yieldQty: true, yieldUnit: true } },
    },
  })

  const dto: ProductAdminDTO[] = products.map((p) => {
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
    const totalStock = inventory.reduce((sum, i) => sum + i.quantity, 0)
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
  })

  return ok({ products: dto })
})

// ============================================================
// POST /api/admin/products
// Body: partial product fields.
// Permission: products.create
// ============================================================
type CreateBody = {
  name: string
  nameEn?: string | null
  sku?: string | null
  barcode?: string | null
  description?: string | null
  categoryId: string
  type?: string
  price: number
  memberPrice?: number | null
  wholesalePrice?: number | null
  eventPrice?: number | null
  costPrice?: number
  unit?: string
  tags?: string[]
  isBestSeller?: boolean
  isFeatured?: boolean
  isFlashSale?: boolean
  flashSalePrice?: number | null
  flashSaleEndAt?: string | null
  flashSaleStock?: number | null
  shelfLifeHours?: number | null
  needsRefrigeration?: boolean
  allergens?: string[]
  storageInstructions?: string | null
  consumeWithin?: string | null
  isVegan?: boolean
  isHalal?: boolean
  isVegetarian?: boolean
}

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'products.create')
  const body = (await req.json()) as CreateBody
  if (!body.name || !body.categoryId || typeof body.price !== 'number') {
    return ok({ ok: false, error: 'กรุณาระบุชื่อ หมวดหมู่ และราคา' })
  }

  const existingSkus = await db.product.findMany({ select: { sku: true } })
  const sku = body.sku?.trim() || suggestSku(body.name, existingSkus.map((p) => p.sku))
  const slug = slugify(body.name) + '-' + Date.now().toString(36)

  const createdProduct = await db.product.create({
    data: {
      name: body.name.trim(),
      nameEn: body.nameEn?.trim() || null,
      slug,
      sku,
      barcode: body.barcode?.trim() || null,
      description: body.description || null,
      categoryId: body.categoryId,
      type: body.type || 'FRESH',
      price: body.price,
      memberPrice: body.memberPrice ?? null,
      wholesalePrice: body.wholesalePrice ?? null,
      eventPrice: body.eventPrice ?? null,
      costPrice: body.costPrice ?? 0,
      unit: body.unit || 'ชิ้น',
      tags: JSON.stringify(body.tags ?? []),
      isBestSeller: body.isBestSeller ?? false,
      isFeatured: body.isFeatured ?? false,
      isFlashSale: body.isFlashSale ?? false,
      flashSalePrice: body.isFlashSale ? (body.flashSalePrice ?? null) : null,
      flashSaleEndAt: body.isFlashSale && body.flashSaleEndAt ? new Date(body.flashSaleEndAt) : null,
      flashSaleStock: body.isFlashSale ? (body.flashSaleStock ?? null) : null,
      shelfLifeHours: body.shelfLifeHours ?? null,
      needsRefrigeration: body.needsRefrigeration ?? false,
      allergens: JSON.stringify(body.allergens ?? []),
      storageInstructions: body.storageInstructions?.trim() || null,
      consumeWithin: body.consumeWithin?.trim() || null,
      isVegan: body.isVegan ?? false,
      isHalal: body.isHalal ?? false,
      isVegetarian: body.isVegetarian ?? false,
    },
  })

  return created({ product: { id: createdProduct.id, sku: createdProduct.sku } })
})
