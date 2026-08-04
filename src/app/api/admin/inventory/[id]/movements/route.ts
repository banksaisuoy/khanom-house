import { NextRequest } from 'next/server'
import { fetchInventoryDetail } from '@/app/api/admin/inventory/route'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/inventory/[id]/movements  -> { inventory: InventoryDetailDTO }
// Permission: inventory.read
export const GET = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'inventory.read')
  const { id } = await params
  const inv = await fetchInventoryDetail(id, 100)
  if (!inv) throw new NotFoundError('ไม่พบรายการสต็อก')
  return ok({ inventory: inv })
})
