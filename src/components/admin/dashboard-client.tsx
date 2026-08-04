'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  UserPlus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/admin/kpi-card'
import { PeakHoursHeatmap } from '@/components/admin/peak-hours-heatmap'
import { LiveOrdersPanel } from '@/components/admin/live-orders-panel'
import { ActiveBatchesPanel } from '@/components/admin/active-batches-panel'
import { DeliveriesPanel } from '@/components/admin/deliveries-panel'
import { AlertsPanel } from '@/components/admin/alerts-panel'
import { QuickActions } from '@/components/admin/quick-actions'
import { EventsStrip } from '@/components/admin/events-strip'
import { AuditFeed } from '@/components/admin/audit-feed'
import { TopProductsTable } from '@/components/admin/top-products-table'
import { formatBaht, formatNumber, formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import type { DashboardData, RangeKey } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

// Lazy-load the recharts-based chart components. They each pull in a large
// slice of the recharts library, and the dashboard's first paint (header +
// KPI cards) doesn't need them. A lightweight skeleton is shown until the
// chunk loads.
const SalesTrendChart = dynamic(
  () => import('@/components/admin/sales-trend-chart').then((m) => m.SalesTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> }
)
const ChannelDonut = dynamic(
  () => import('@/components/admin/channel-donut').then((m) => m.ChannelDonut),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> }
)
const BestSellersChart = dynamic(
  () => import('@/components/admin/best-sellers-chart').then((m) => m.BestSellersChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> }
)
const KitchenLoadGauge = dynamic(
  () => import('@/components/admin/kitchen-load-gauge').then((m) => m.KitchenLoadGauge),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> }
)

type RangeOption = { key: RangeKey; label: string }
const RANGES: RangeOption[] = [
  { key: 'today', label: 'วันนี้' },
  { key: '7d', label: '7 วัน' },
  { key: '30d', label: '30 วัน' },
  { key: 'month', label: 'เดือนนี้' },
]

function greeting(h: number): string {
  if (h < 12) return 'สวัสดีตอนเช้า'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [range, setRange] = React.useState<RangeKey>('30d')
  const [data, setData] = React.useState<DashboardData>(initialData)
  const [loading, setLoading] = React.useState(false)

  // Hydration-safe greeting + date. Server renders a neutral placeholder;
  // the actual time-based values are computed after mount.
  const [mounted, setMounted] = React.useState(false)
  const [greetingText, setGreetingText] = React.useState<string>('สวัสดีครับ/ค่ะ')
  const [dateText, setDateText] = React.useState<string>('')

  React.useEffect(() => {
    const now = new Date()
    setGreetingText(greeting(now.getHours()))
    setDateText(formatThaiDate(now, { withDay: true }))
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (range === initialData.range) {
      setData(initialData)
      return
    }
    let active = true
    setLoading(true)
    fetch(`/api/admin/dashboard?range=${range}`)
      .then((r) => r.json())
      .then((d: DashboardData) => {
        if (active) setData(d)
      })
      .catch((e) => console.error('dashboard fetch', e))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [range, initialData])

  const k = data.kpis
  const trendSpark = data.salesTrend.slice(-7).map((d) => ({ value: d.revenue }))
  const orderSpark = data.salesTrend.slice(-7).map((d) => ({ value: d.orders }))
  const profitSpark = data.salesTrend.slice(-7).map((d) => ({ value: d.profit }))

  return (
    <div className="space-y-4 md:space-y-5">
      {/* A. Welcome header + range filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👋</span>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              {greetingText}, ผู้ดูแลระบบ
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>
            {mounted ? `วันนี้ ${dateText} · สาขาหลัก สีลม` : 'สาขาหลัก สีลม'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? 'default' : 'ghost'}
              className={cn(
                'h-8 px-3 text-xs font-medium',
                range === r.key
                  ? 'bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]'
                  : 'text-muted-foreground'
              )}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* B. KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
          ))
        ) : (
          <>
            <KpiCard
              label="ยอดขายวันนี้"
              value={formatBaht(k.todayRevenue)}
              delta={k.todayDelta}
              deltaLabel={`เมื่อวาน ${formatBaht(k.yesterdayRevenue)}`}
              icon={DollarSign}
              accent="gold"
              spark={trendSpark}
            />
            <KpiCard
              label="กำไรขั้นต้น"
              value={formatBaht(k.grossProfit)}
              unit={`(${toThaiNumerals(k.marginPct.toFixed(1))}%)`}
              delta={k.revenueDelta}
              deltaLabel={`รายได้ช่วง ${formatBaht(k.periodRevenue)}`}
              icon={TrendingUp}
              accent="forest"
              spark={profitSpark}
            />
            <KpiCard
              label="ออเดอร์วันนี้"
              value={formatNumber(k.todayOrders)}
              unit="รายการ"
              delta={k.ordersDelta}
              deltaLabel={`เฉลี่ยตะกร้า ${formatBaht(k.avgBasket)}`}
              icon={ShoppingCart}
              accent="cream"
              spark={orderSpark}
            />
            <KpiCard
              label="สมาชิกใหม่"
              value={formatNumber(k.newCustomers)}
              unit="ราย"
              deltaLabel={`ช่วงนี้รวม ${formatNumber(k.periodOrders)} ออเดอร์`}
              icon={UserPlus}
              accent="terracotta"
            />
            <KpiCard
              label="อัตราของเสีย"
              value={toThaiNumerals(k.wasteRatio.toFixed(2))}
              unit="%"
              deltaLabel={`มูลค่า ${formatBaht(k.wasteValue)}`}
              icon={Trash2}
              accent="terracotta"
              invertDelta
              critical={k.wasteRatio > 3}
            />
          </>
        )}
      </div>

      {/* C. Charts row: sales trend (2/3) + channel donut (1/3) */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : <SalesTrendChart data={data.salesTrend} />}
        </div>
        <div>
          {loading ? <Skeleton className="h-[340px] w-full rounded-xl" /> : <ChannelDonut data={data.channelSplit} />}
        </div>
      </div>

      {/* D. Second charts row: peak hours + best sellers + kitchen load */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <PeakHoursHeatmap data={data.peakHours} />
        <BestSellersChart data={data.bestSellers} />
        <KitchenLoadGauge load={data.kitchenLoad} />
      </div>

      {/* E. Live operations row */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <LiveOrdersPanel orders={data.recentOrders} />
        <ActiveBatchesPanel batches={data.activeBatches} />
        <DeliveriesPanel deliveries={data.todayDeliveries} />
      </div>

      {/* F. Alerts + Quick actions */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlertsPanel alerts={data.alerts} />
        </div>
        <QuickActions />
      </div>

      {/* G. Catering events strip */}
      <EventsStrip events={data.upcomingEvents} />

      {/* H. Top products table + audit feed */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopProductsTable products={data.topProducts} />
        </div>
        <AuditFeed entries={data.auditFeed} />
      </div>

      {/* Footer caption */}
      <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-muted-foreground">
        <span className="text-[var(--gold)]">❀</span>
        <span>Khanom House ERP — ขับเคลื่อนโดยขนมไทยโบราณดั้งเดิม</span>
        <span className="text-[var(--gold)]">❀</span>
      </div>
    </div>
  )
}
