import { NextRequest } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { ok, handle, badRequest } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'

// ============================================================
// POST /api/admin/ai-assistant
// Admin-only AI helper — gathers live business context (orders,
// revenue, low stock, pending orders, active production) and
// feeds it to the LLM so replies are grounded in real data.
// Permission: dashboard.read (any admin can ask the assistant)
// ============================================================

type ChatTurn = { role: 'user' | 'assistant'; content: string }

interface Payload {
  message?: string
  messages?: ChatTurn[]
}

export const POST = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')
  const body = (await req.json().catch(() => ({}))) as Payload

  const incoming = body.message?.trim()
  const history = Array.isArray(body.messages) ? body.messages.slice(-10) : []

  if (!incoming) {
    return badRequest('กรุณาระบุคำถาม')
  }

  // ---- Gather live business context in parallel ----
  const [
    completedOrders,
    revenueAgg,
    lowStockRows,
    pendingOrders,
    activeBatches,
    recentOrders,
    bestSellers,
    todayOrders,
    todayRevenueAgg,
    customers,
  ] = await Promise.all([
    db.order.count({ where: { status: 'COMPLETED' } }),
    db.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { total: true },
    }),
    db.inventory.findMany({
      where: { quantity: { lt: 20 } },
      include: { product: { select: { name: true, sku: true } } },
      take: 12,
      orderBy: { quantity: 'asc' },
    }),
    db.order.count({
      where: {
        status: {
          in: ['PENDING', 'PAID', 'PREPARING', 'COOKING', 'PACKING', 'OUT_FOR_DELIVERY'],
        },
      },
    }),
    db.productionBatch.count({
      where: { status: { in: ['QUEUED', 'COOKING', 'QC'] } },
    }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { orderNo: true, status: true, total: true, channel: true, createdAt: true },
    }),
    db.product.findMany({
      orderBy: { soldCount: 'desc' },
      take: 5,
      select: { name: true, soldCount: true, price: true },
    }),
    db.order.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    db.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { total: true },
    }),
    db.customer.count(),
  ])

  const todayRevenue = todayRevenueAgg._sum.total ?? 0
  const totalRevenue = revenueAgg._sum.total ?? 0

  const lowStockList = lowStockRows
    .map((r) => `• ${r.product.name} (คงเหลือ ${r.quantity} ${r.unit})`)
    .join('\n')

  const bestSellersList = bestSellers
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} — ขายแล้ว ${p.soldCount} ชิ้น @ ฿${p.price.toLocaleString()}`
    )
    .join('\n')

  const recentOrdersList = recentOrders
    .map(
      (o) =>
        `• ${o.orderNo} | ${o.channel} | ${o.status} | ฿${o.total.toLocaleString()} | ${o.createdAt.toISOString().slice(0, 10)}`
    )
    .join('\n')

  const systemPrompt = `คุณคือ "ผู้ช่วย AI" สำหรับร้านขนมไทย "Khanom House" — ร้านขนมไทยโบราณรับจัดเบรคงานมงคล

ตอบคำถามเป็นภาษาไทย สั้น กระชับ เป็นมิตร ให้คำแนะนำที่นำไปใช้ได้จริง

ข้อมูลธุรกิจปัจจุบัน (อัปเดตทันทีจากระบบ):
- ออเดอร์สำเร็จสะสม: ${completedOrders} ออเดอร์
- ยอดขายรวมสะสม: ฿${totalRevenue.toLocaleString()}
- ยอดขายวันนี้: ฿${todayRevenue.toLocaleString()} (จาก ${todayOrders} ออเดอร์)
- ออเดอร์รอดำเนินการ: ${pendingOrders} ออเดอร์
- คิวผลิตกำลังทำ/รอ: ${activeBatches} คิว
- จำนวนลูกค้าสะสม: ${customers} ราย

สต็อกต่ำ (ต่ำกว่า 20 หน่วย):
${lowStockList || '• ไม่มีสินค้าที่สต็อกต่ำ'}

สินค้าขายดี 5 อันดับ:
${bestSellersList}

ออเดอร์ล่าสุด 5 รายการ:
${recentOrdersList}

หมายเหตุ:
- หากข้อมูลไม่พอให้ตอบ ให้แนะนำให้ผู้ใช้ไปดูในส่วนแอดมินที่เกี่ยวข้อง
- ห้าม invent ตัวเลขที่ไม่มีในข้อมูล
- ใช้เครื่องหมาย bullet • และขึ้นบรรทัดใหม่เพื่อให้อ่านง่าย`

  // Build conversation — system + history (sanitized) + current message
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...history
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: incoming },
  ]

  try {
    const zai = await ZAI.create()
    const response = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    const reply =
      response.choices[0]?.message?.content?.trim() ||
      'ขออภัย ผมไม่สามารถตอบคำถามนี้ได้ในขณะนี้ ลองถามใหม่อีกครั้งนะครับ'

    return ok({
      reply,
      context: {
        todayRevenue,
        todayOrders,
        pendingOrders,
        activeBatches,
        lowStock: lowStockRows.length,
      },
    })
  } catch (e) {
    console.error('[ai-assistant] LLM call failed:', e)
    return ok({
      reply:
        'ขออภัยครับ ระบบ AI ขัดข้องในขณะนี้ ลองอีกครั้งในสักครู่ — หรือติดต่อทีมเทคนิคหากปัญหายังคงอยู่',
      error: true,
    })
  }
})
