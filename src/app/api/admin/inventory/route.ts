import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { classifyStock, type InventoryDetailDTO, type InventoryRowDTO } from '@/lib/admin-catalog'
import { ok, handle } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// GET /api/admin/inventory
//   ?branchId=&type=FINISHED|RAW|PACKAGING&status=low|expiring|out&productId=
// Returns: { inventory: InventoryRowDTO[], stats: { total, low, expiring, out } }
// Permission: inventory.read
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'inventory.read')

  const sp = req.nextUrl.searchParams
  const branchId = sp.get('branchId') || ''
  const type = sp.get('type') || ''
  const status = sp.get('status') || ''
  const productId = sp.get('productId') || ''
  const search = sp.get('search')?.trim() || ''

  const where: Record<string, unknown> = {}
  if (branchId) where.branchId = branchId
  if (type) where.type = type
  if (productId) where.productId = productId

  const rows = await db.inventory.findMany({
    where,
    include: { product: { select: { id: true, name: true, slug: true, type: true } }, branch: true },
    orderBy: [{ updatedAt: 'desc' }, { product: { name: 'asc' } }],
  })

  const NOW = Date.now()
  const DAY = 86400000

  const filtered = rows.filter((r) => {
    if (search) {
      const s = search.toLowerCase()
      if (!r.product.name.toLowerCase().includes(s) && !r.product.slug.toLowerCase().includes(s)) return false
    }
    if (status === 'low') {
      return r.quantity <= r.reorderPoint
    }
    if (status === 'out') {
      return r.quantity <= 0
    }
    if (status === 'expiring') {
      if (!r.expiryAt) return false
      const ms = r.expiryAt.getTime() - NOW
      return ms < DAY
    }
    return true
  })

  const inventory: InventoryRowDTO[] = filtered.map((i) => ({
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

  // Stats across the entire branch set (ignores type filter so banners are correct)
  const statsWhere: Record<string, unknown> = {}
  if (branchId) statsWhere.branchId = branchId
  const allRows = await db.inventory.findMany({
    where: statsWhere,
    select: { quantity: true, reorderPoint: true, safetyStock: true, expiryAt: true },
  })
  const low = allRows.filter((r) => r.quantity <= r.reorderPoint).length
  const out = allRows.filter((r) => r.quantity <= 0).length
  const expiring = allRows.filter((r) => r.expiryAt && r.expiryAt.getTime() - NOW < DAY).length

  const enriched = filtered.map((i, idx) => ({
    ...inventory[idx],
    productId: i.product.id,
    productName: i.product.name,
    productSlug: i.product.slug,
    productType: i.product.type,
    status: classifyStock(i.quantity, i.reorderPoint, i.safetyStock),
  }))

  return ok({
    inventory: enriched,
    stats: { total: allRows.length, low, out, expiring },
  })
})

// helper export reused by adjust route (and movements route)
export async function fetchInventoryDetail(id: string, limit = 50): Promise<InventoryDetailDTO | null> {
  const inv = await db.inventory.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, slug: true, type: true } },
      branch: true,
      movements: {
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })
  if (!inv) return null
  return {
    id: inv.id,
    productId: inv.product.id,
    productName: inv.product.name,
    productSlug: inv.product.slug,
    productType: inv.product.type,
    branchId: inv.branchId,
    branchName: inv.branch?.name ?? '',
    type: inv.type,
    quantity: inv.quantity,
    unit: inv.unit,
    reorderPoint: inv.reorderPoint,
    safetyStock: inv.safetyStock,
    batchNo: inv.batchNo,
    expiryAt: inv.expiryAt ? inv.expiryAt.toISOString() : null,
    location: inv.location,
    updatedAt: inv.updatedAt.toISOString(),
    status: classifyStock(inv.quantity, inv.reorderPoint, inv.safetyStock),
    movements: inv.movements.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      refType: m.refType,
      refId: m.refId,
      userId: m.userId,
      userName: m.user?.name ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}
