import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle } from '@/lib/api-response'
import { validate, wasteCreateSchema } from '@/lib/validation'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// GET /api/admin/waste?from=&to=&source=&q=
// Permission: waste.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'waste.read')

  const sp = req.nextUrl.searchParams
  const from = sp.get('from')
  const to = sp.get('to')
  const source = sp.get('source')
  const q = sp.get('q')?.trim()

  const where: Record<string, unknown> = {}
  if (source && source !== 'all') where.source = source
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as { gte?: Date }).gte = new Date(from)
    if (to) (where.createdAt as { lte?: Date }).lte = new Date(to + 'T23:59:59.999')
  }
  if (q) {
    where.OR = [
      { productName: { contains: q } },
      { batchNo: { contains: q } },
      { reason: { contains: q } },
    ]
  }

  const logs = await db.wasteLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, role: true } } },
    take: 500,
  })

  return ok({
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  })
})

// ============================================================
// POST /api/admin/waste
// AUDIT FIX H-10: caller supplied `value`.
// Fix: value computed server-side as quantity * product.costPrice when
//      productId is provided. Caller-supplied value is ignored.
// Permission: waste.create
// ============================================================
export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'waste.create')
  const body = validate(wasteCreateSchema, await req.json())

  // Server-side value computation
  let value = body.value ?? 0
  if (body.productId) {
    const p = await db.product.findUnique({ where: { id: body.productId } })
    if (p) {
      value = body.quantity * p.costPrice
    }
  }

  const w = await db.wasteLog.create({
    data: {
      productId: body.productId || null,
      productName: body.productName,
      batchNo: body.batchNo ?? null,
      userId: user.id,
      source: body.source,
      quantity: body.quantity,
      unit: body.unit,
      value,
      reason: body.reason,
      imageUrl: body.imageUrl ?? null,
    },
  })
  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'WasteLog',
    entityId: w.id,
    newValue: safeJson({ productName: w.productName, source: w.source, value: w.value }),
  })
  return created({ ok: true, id: w.id })
})
