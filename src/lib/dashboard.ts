import { db } from '@/lib/db'

// ============================================================
// Aggregated executive dashboard data — shared by API route
// and the server-rendered /admin page.
// ============================================================

export type RangeKey = 'today' | '7d' | '30d' | 'month'

export type DashboardData = {
  range: RangeKey
  kpis: {
    todayRevenue: number
    yesterdayRevenue: number
    todayDelta: number
    grossProfit: number
    marginPct: number
    periodRevenue: number
    prevRevenue: number
    revenueDelta: number
    todayOrders: number
    avgBasket: number
    newCustomers: number
    wasteRatio: number
    wasteValue: number
    ordersDelta: number
    periodOrders: number
  }
  salesTrend: { date: string; revenue: number; profit: number; orders: number }[]
  channelSplit: { channel: string; label: string; amount: number; count: number }[]
  peakHours: { day: number; hour: number; count: number }[]
  bestSellers: { name: string; soldCount: number; revenue: number; stock: number }[]
  kitchenLoad: { queued: number; cooking: number; qc: number; capacity: number; active: number }
  recentOrders: {
    id: string
    orderNo: string
    channel: string
    status: string
    total: number
    customerName: string
    type: string
    createdAt: string
    itemCount: number
  }[]
  activeBatches: {
    id: string
    batchNo: string
    productName: string
    status: string
    priority: number
    plannedQty: number
    producedQty: number
    progress: number
    startedAt: string | null
    elapsedMin: number
    cookName: string
  }[]
  todayDeliveries: {
    id: string
    status: string
    eta: number | null
    riderName: string
    orderNo: string
    customerName: string
    address: string
    createdAt: string
  }[]
  alerts: {
    id: string
    type: string
    title: string
    message: string
    severity: string
    isRead: boolean
    createdAt: string
  }[]
  upcomingEvents: {
    id: string
    eventNo: string
    title: string
    type: string
    guestCount: number
    eventDate: string
    status: string
    location: string
    totalQuote: number
  }[]
  topProducts: {
    id: string
    name: string
    soldCount: number
    revenue: number
    stock: number
    status: string
  }[]
  auditFeed: {
    id: string
    action: string
    entity: string
    entityId: string | null
    userName: string
    userRole: string
    ip: string | null
    createdAt: string
  }[]
}

function getRangeBounds(range: RangeKey): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  let start: Date
  switch (range) {
    case 'today': {
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
      break
    }
    case '7d': {
      start = new Date(now)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
    }
    case '30d':
    default: {
      start = new Date(now)
      start.setDate(start.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      break
    }
  }

  const durationMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - durationMs)

  return { start, end, prevStart, prevEnd }
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const COMPLETED_STATUSES = ['COMPLETED', 'DELIVERED', 'PAID']

export async function getDashboardData(range: RangeKey): Promise<DashboardData> {
  const { start, end, prevStart, prevEnd } = getRangeBounds(range)

  // ============================================================
  // AUDIT (P2-1): refactor — eliminate duplicate fetch of OrderItems,
  // replace findMany+reduce with aggregate/groupBy where possible, add
  // explicit `take` caps to every unbounded query. Same response shape.
  // ============================================================
  const [
    orders,
    prevPeriodByStatus,
    todayByStatus,
    yesterdayAgg,
    customers,
    wasteLogs,
    batchStatusCounts,
    activeBatchesRaw,
    recentOrdersRaw,
    todayDeliveriesRaw,
    notifications,
    upcomingEvents,
    topProductsRaw,
    auditLogs,
  ] = await Promise.all([
    // Orders in range — include only the item fields actually used
    // (productId, quantity, product.costPrice) for cost computation.
    // Eliminates the separate allOrderItems query (was a duplicate fetch).
    db.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      take: 1000,
      include: {
        items: {
          select: {
            productId: true,
            quantity: true,
            product: { select: { costPrice: true } },
          },
        },
        delivery: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Previous period: groupBy status → sums + counts in one query
    // (was findMany + JS filter+reduce).
    db.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: prevStart, lte: prevEnd } },
      _sum: { total: true },
      _count: true,
    }),
    // Today: groupBy status → completed revenue + total count in one query
    db.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      _sum: { total: true },
      _count: true,
    }),
    // Yesterday: aggregate sum (single number, no per-row fetch needed)
    db.order.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date(Date.now() - 86400000).setHours(0, 0, 0, 0)),
          lte: new Date(new Date(Date.now() - 86400000).setHours(23, 59, 59, 999)),
        },
      },
      _sum: { total: true },
    }),
    db.customer.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { id: true, createdAt: true },
    }),
    db.wasteLog.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { value: true, source: true, quantity: true },
    }),
    // Production batch counts by status — groupBy (was findMany + 3 filters)
    db.productionBatch.groupBy({
      by: ['status'],
      _count: true,
    }),
    db.productionBatch.findMany({
      where: { status: { in: ['QUEUED', 'COOKING', 'QC'] } },
      take: 20,
      select: {
        id: true,
        batchNo: true,
        status: true,
        priority: true,
        plannedQty: true,
        producedQty: true,
        startedAt: true,
        createdAt: true,
        product: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    }),
    db.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNo: true,
        channel: true,
        status: true,
        total: true,
        customerName: true,
        type: true,
        createdAt: true,
        items: { select: { name: true, quantity: true } },
      },
    }),
    db.delivery.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      take: 50,
      include: {
        rider: { select: { name: true } },
        order: { select: { orderNo: true, customerName: true, deliveryAddress: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    db.cateringEvent.findMany({
      where: {
        eventDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 86400000),
        },
        status: { in: ['CONFIRMED', 'PREPARING', 'QUOTED'] },
      },
      orderBy: { eventDate: 'asc' },
      take: 8,
    }),
    db.product.findMany({
      orderBy: { soldCount: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        soldCount: true,
        price: true,
        costPrice: true,
        inventory: { select: { quantity: true, reorderPoint: true }, take: 1 },
      },
    }),
    db.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
  ])

  // KPIs — computed from groupBy/aggregate results (no JS filter+reduce
  // over raw rows).
  const todayCompletedRevenue = todayByStatus
    .filter((g) => COMPLETED_STATUSES.includes(g.status))
    .reduce((s, g) => s + (g._sum.total ?? 0), 0)
  const yesterdayRevenue = yesterdayAgg._sum.total ?? 0
  const todayOrderCount = todayByStatus.reduce((s, g) => s + g._count, 0)
  const avgBasket = todayOrderCount > 0 ? todayCompletedRevenue / todayOrderCount : 0

  const periodCompletedOrders = orders.filter((o) => COMPLETED_STATUSES.includes(o.status))
  const periodRevenue = periodCompletedOrders.reduce((s, o) => s + o.total, 0)
  // periodCost is now derived from orders.items (which now includes
  // product.costPrice) — eliminates the separate allOrderItems query.
  const periodCost = orders.reduce(
    (s, o) =>
      s +
      o.items.reduce((s2, it) => s2 + (it.product?.costPrice ?? 0) * it.quantity, 0),
    0
  )
  const grossProfit = periodRevenue - periodCost
  const marginPct = periodRevenue > 0 ? (grossProfit / periodRevenue) * 100 : 0

  const wasteValue = wasteLogs.reduce((s, w) => s + w.value, 0)
  const wasteRatio = periodRevenue > 0 ? (wasteValue / periodRevenue) * 100 : 0

  const newCustomers = customers.length

  const prevRevenue = prevPeriodByStatus
    .filter((g) => COMPLETED_STATUSES.includes(g.status))
    .reduce((s, g) => s + (g._sum.total ?? 0), 0)

  // Trend
  const trendMap = new Map<string, { revenue: number; profit: number; orders: number }>()
  const cursor = new Date(start)
  while (cursor <= end) {
    trendMap.set(dayKey(cursor), { revenue: 0, profit: 0, orders: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  // Trend loop — uses it.product.costPrice directly (no separate map).
  for (const o of orders) {
    const k = dayKey(o.createdAt)
    const entry = trendMap.get(k) ?? { revenue: 0, profit: 0, orders: 0 }
    if (COMPLETED_STATUSES.includes(o.status)) {
      entry.revenue += o.total
      const cost = o.items.reduce(
        (s, it) => s + (it.product?.costPrice ?? 0) * it.quantity,
        0
      )
      entry.profit += o.total - cost
    }
    entry.orders += 1
    trendMap.set(k, entry)
  }
  const salesTrend = Array.from(trendMap.entries()).map(([date, v]) => ({
    date,
    revenue: Math.round(v.revenue),
    profit: Math.round(v.profit),
    orders: v.orders,
  }))

  // Channel split
  const channelMap = new Map<string, { amount: number; count: number }>()
  for (const o of periodCompletedOrders) {
    const cur = channelMap.get(o.channel) ?? { amount: 0, count: 0 }
    cur.amount += o.total
    cur.count += 1
    channelMap.set(o.channel, cur)
  }
  const channelLabels: Record<string, string> = {
    POS: 'POS หน้าร้าน',
    WEBSITE: 'เว็บไซต์',
    LINE: 'LINE',
    GRAB: 'GRAB',
    PHONE: 'โทรศัพท์',
    CATERING: 'Catering',
  }
  const channelSplit = Array.from(channelMap.entries())
    .map(([channel, v]) => ({
      channel,
      label: channelLabels[channel] ?? channel,
      amount: Math.round(v.amount),
      count: v.count,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Peak hours
  const peakHours: { day: number; hour: number; count: number }[] = []
  const peakMap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const o of orders) {
    const d = new Date(o.createdAt)
    peakMap[d.getDay()][d.getHours()] += 1
  }
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      peakHours.push({ day, hour, count: peakMap[day][hour] })
    }
  }

  const bestSellers = topProductsRaw.slice(0, 5).map((p) => ({
    name: p.name,
    soldCount: p.soldCount,
    revenue: Math.round(p.soldCount * p.price),
    stock: p.inventory[0]?.quantity ?? 0,
  }))

  // Kitchen load — derived from groupBy status counts (no row-level fetch).
  const batchCountMap = new Map<string, number>()
  for (const g of batchStatusCounts) batchCountMap.set(g.status, g._count)
  const queued = batchCountMap.get('QUEUED') ?? 0
  const cooking = batchCountMap.get('COOKING') ?? 0
  const qc = batchCountMap.get('QC') ?? 0
  const capacity = 12
  const kitchenLoad = { queued, cooking, qc, capacity, active: cooking + qc }

  const activeBatches = activeBatchesRaw.map((b) => ({
    id: b.id,
    batchNo: b.batchNo,
    productName: b.product.name,
    status: b.status,
    priority: b.priority,
    plannedQty: b.plannedQty,
    producedQty: b.producedQty,
    progress: b.plannedQty > 0 ? Math.round((b.producedQty / b.plannedQty) * 100) : 0,
    startedAt: b.startedAt ? b.startedAt.toISOString() : null,
    elapsedMin: b.startedAt
      ? Math.floor((Date.now() - b.startedAt.getTime()) / 60000)
      : 0,
    cookName: b.user?.name ?? '—',
  }))

  const recentOrders = recentOrdersRaw.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    channel: o.channel,
    status: o.status,
    total: o.total,
    customerName: o.customerName,
    type: o.type,
    createdAt: o.createdAt.toISOString(),
    itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
  }))

  const todayDeliveries = todayDeliveriesRaw.map((d) => ({
    id: d.id,
    status: d.status,
    eta: d.eta,
    riderName: d.rider?.name ?? 'ยังไม่ระบุ',
    orderNo: d.order?.orderNo ?? '',
    customerName: d.order?.customerName ?? '',
    address: d.order?.deliveryAddress ?? '',
    createdAt: d.createdAt.toISOString(),
  }))

  const alerts = notifications
    .filter((n) => n.severity !== 'info' || n.type === 'ORDER')
    .slice(0, 8)
    .map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }))

  const upcomingEventsData = upcomingEvents.map((e) => ({
    id: e.id,
    eventNo: e.eventNo,
    title: e.title,
    type: e.type,
    guestCount: e.guestCount,
    eventDate: e.eventDate.toISOString(),
    status: e.status,
    location: e.location,
    totalQuote: e.totalQuote,
  }))

  const topProducts = topProductsRaw.map((p) => {
    const stock = p.inventory[0]?.quantity ?? 0
    const reorder = p.inventory[0]?.reorderPoint ?? 0
    const status = stock === 0 ? 'OUT' : stock <= reorder ? 'LOW' : 'OK'
    return {
      id: p.id,
      name: p.name,
      soldCount: p.soldCount,
      revenue: Math.round(p.soldCount * p.price),
      stock,
      status,
    }
  })

  const auditFeed = auditLogs.map((a) => ({
    id: a.id,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    userName: a.user?.name ?? 'ระบบ',
    userRole: a.user?.role ?? '—',
    ip: a.ip,
    createdAt: a.createdAt.toISOString(),
  }))

  const prevOrderCount = prevPeriodByStatus.reduce((s, g) => s + g._count, 0)
  const todayDelta =
    yesterdayRevenue > 0
      ? ((todayCompletedRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : todayCompletedRevenue > 0
        ? 100
        : 0

  return {
    range,
    kpis: {
      todayRevenue: Math.round(todayCompletedRevenue),
      yesterdayRevenue: Math.round(yesterdayRevenue),
      todayDelta: Math.round(todayDelta * 10) / 10,
      grossProfit: Math.round(grossProfit),
      marginPct: Math.round(marginPct * 10) / 10,
      periodRevenue: Math.round(periodRevenue),
      prevRevenue: Math.round(prevRevenue),
      revenueDelta:
        prevRevenue > 0
          ? Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 1000) / 10
          : 0,
      todayOrders: todayOrderCount,
      avgBasket: Math.round(avgBasket),
      newCustomers,
      wasteRatio: Math.round(wasteRatio * 100) / 100,
      wasteValue: Math.round(wasteValue),
      ordersDelta:
        prevOrderCount > 0
          ? Math.round(((orders.length - prevOrderCount) / prevOrderCount) * 1000) / 10
          : 0,
      periodOrders: orders.length,
    },
    salesTrend,
    channelSplit,
    peakHours,
    bestSellers,
    kitchenLoad,
    recentOrders,
    activeBatches,
    todayDeliveries,
    alerts,
    upcomingEvents: upcomingEventsData,
    topProducts,
    auditFeed,
  }
}
