import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, handle, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// ============================================================
// GET /api/admin/tax-invoice/[id]  -> TaxInvoiceDetailDTO (for printing)
//   Permission: accounting.read
// ============================================================
export const GET = handle(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, 'accounting.read')
  const { id } = await params

  const inv = await db.taxInvoice.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          orderNo: true,
          channel: true,
          type: true,
          notes: true,
          deliveryAddress: true,
        },
      },
    },
  })
  if (!inv) throw new NotFoundError('ไม่พบใบกำกับภาษี')

  let items: Array<{ name: string; quantity: number; price: number; total: number }> = []
  try {
    const parsed = JSON.parse(inv.items)
    if (Array.isArray(parsed)) items = parsed
  } catch {
    items = []
  }

  return ok({
    invoice: {
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      orderId: inv.orderId,
      orderNo: inv.order?.orderNo ?? null,
      orderChannel: inv.order?.channel ?? null,
      orderType: inv.order?.type ?? null,
      orderNotes: inv.order?.notes ?? null,
      customerName: inv.customerName,
      customerTaxId: inv.customerTaxId,
      customerAddress: inv.customerAddress,
      customerEmail: inv.customerEmail,
      customerPhone: inv.customerPhone,
      subtotal: inv.subtotal,
      discount: inv.discount,
      taxableAmount: inv.taxableAmount,
      vatRate: inv.vatRate,
      vatAmount: inv.vatAmount,
      total: inv.total,
      items,
      status: inv.status,
      issuedAt: inv.issuedAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    },
  })
})
