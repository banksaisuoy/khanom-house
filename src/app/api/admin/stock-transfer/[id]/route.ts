import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// ============================================================
// GET /api/admin/stock-transfer/[id]  -> StockTransferDetailDTO
//   Permission: inventory.read
// ============================================================
export const GET = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'inventory.read')
  const { id } = await params

  const t = await db.stockTransfer.findUnique({
    where: { id },
    include: {
      fromBranch: { select: { id: true, name: true, code: true } },
      toBranch: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, name: true } },
    },
  })
  if (!t) throw new NotFoundError('ไม่พบใบโอนสต็อก')

  let items: Array<{ productId: string; productName: string; quantity: number; unit: string }> = []
  try {
    const parsed = JSON.parse(t.items)
    if (Array.isArray(parsed)) items = parsed
  } catch {
    items = []
  }

  return ok({
    transfer: {
      id: t.id,
      transferNo: t.transferNo,
      fromBranchId: t.fromBranchId,
      fromBranchName: t.fromBranch.name,
      fromBranchCode: t.fromBranch.code,
      toBranchId: t.toBranchId,
      toBranchName: t.toBranch.name,
      toBranchCode: t.toBranch.code,
      status: t.status,
      items,
      totalItems: t.totalItems,
      notes: t.notes,
      userId: t.userId,
      userName: t.user?.name ?? null,
      shippedAt: t.shippedAt ? t.shippedAt.toISOString() : null,
      receivedAt: t.receivedAt ? t.receivedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    },
  })
})
