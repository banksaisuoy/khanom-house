'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Package, Truck, MapPin, Clock, CheckCircle2, XCircle,
  CreditCard, ShoppingBag, Phone, AlertCircle, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ORDER_FLOW,
  STATUS_CONFIG,
  PAYMENT_METHOD_CONFIG,
  ORDER_TYPE_CONFIG,
  type OrderStatus,
} from '@/lib/order-status'
import { formatThaiDate, formatThaiDateTime, formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

// ----- types -----
type TrackingItem = {
  id: string
  name: string
  price: number
  quantity: number
  total: number
  productSlug?: string | null
}

type TrackingOrder = {
  id: string
  orderNo: string
  status: OrderStatus
  paymentStatus: string
  paymentMethod?: string | null
  type: string
  channel: string
  subtotal: number
  discount: number
  shipping: number
  total: number
  notes?: string | null
  deliveryAddress?: string | null
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  createdAt: string
  updatedAt: string
  wantAt?: string | null
  items: TrackingItem[]
  delivery?: {
    status: string
    riderName?: string | null
    eta?: number | null
    pickupAt?: string | null
    deliveredAt?: string | null
    notes?: string | null
  } | null
}

interface Props {
  initialOrderNo: string | null
  initialOrder: TrackingOrder | null
}

// ----- helpers -----
function statusReachedIndex(status: OrderStatus): number {
  if (status === 'CANCELLED' || status === 'REFUNDED') return -1
  return ORDER_FLOW.indexOf(status)
}

function fallbackTimestampForStep(
  stepIdx: number,
  order: TrackingOrder
): string | null {
  // We don't have per-step timestamps stored on the Order model; use
  // sensible approximations from createdAt / updatedAt.
  const created = new Date(order.createdAt)
  const updated = new Date(order.updatedAt)
  if (stepIdx === 0) return order.createdAt
  if (stepIdx === ORDER_FLOW.indexOf(order.status)) return order.updatedAt
  if (stepIdx < ORDER_FLOW.indexOf(order.status)) {
    // Already past — distribute evenly between createdAt and updatedAt
    return created.toISOString()
  }
  return null
}

// ----- component -----
export function OrderTracking({ initialOrderNo, initialOrder }: Props) {
  const [query, setQuery] = React.useState(initialOrderNo ?? '')
  const [order, setOrder] = React.useState<TrackingOrder | null>(initialOrder)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [searched, setSearched] = React.useState(!!initialOrderNo)

  // If we were given an order number but SSR couldn't find the order
  // (or it was a phone lookup that needs the API), trigger a client-side
  // lookup so the not-found UI renders correctly.
  React.useEffect(() => {
    if (initialOrderNo && !initialOrder) {
      lookup(initialOrderNo)
    }
  }, [initialOrderNo, initialOrder])

  const lookup = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const r = await fetch(
        `/api/tracking?q=${encodeURIComponent(trimmed)}`,
        { cache: 'no-store' }
      )
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'ไม่พบออเดอร์')
      setOrder(data.order as TrackingOrder)
    } catch (e) {
      setOrder(null)
      setError((e as Error).message || 'ไม่พบออเดอร์')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    lookup(query)
  }

  return (
    <div className="space-y-6">
      {/* Search form */}
      <Card className="border-[var(--gold)]/30">
        <CardContent className="p-4 md:p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="หมายเลขออเดอร์ (KH00001) หรือเบอร์โทร (0812345678)"
              className="h-12 flex-1 text-base"
              aria-label="ค้นหาออเดอร์"
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]"
            >
              <Search className="h-4 w-4" /> ติดตาม
            </Button>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            💡 หมายเลขออเดอร์จะอยู่ในอีเมลยืนยันการสั่งซื้อ หรือข้อความ LINE จากร้าน
          </p>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {/* Error / Not found */}
      <AnimatePresence>
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold">ไม่พบออเดอร์</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ตรวจสอบหมายเลขออเดอร์และลองอีกครั้ง — หากยังไม่พบ โทร 02-123-4567
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => lookup(query)}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> ลองอีกครั้ง
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {!loading && !error && order && <OrderResult order={order} />}

      {/* Empty hint */}
      {!loading && !error && !order && !searched && (
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
            <Search className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            กรอกหมายเลขออเดอร์ด้านบนเพื่อเริ่มติดตาม
          </p>
        </div>
      )}
    </div>
  )
}

// ----- Order result (timeline + summary) -----
function OrderResult({ order }: { order: TrackingOrder }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
  const isErrorState = order.status === 'CANCELLED' || order.status === 'REFUNDED'
  const reachedIdx = statusReachedIndex(order.status)

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Timeline (left, larger) */}
      <Card className="lg:col-span-3">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-[var(--gold)]" />
              สถานะออเดอร์
            </CardTitle>
            <Badge
              className={cn(
                'gap-1 ring-1 ring-inset',
                isErrorState ? 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30'
              )}
            >
              <span>{cfg.icon}</span>
              {cfg.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            ออเดอร์ <span className="font-mono font-semibold">{order.orderNo}</span> · อัปเดตล่าสุด{' '}
            {formatThaiDateTime(new Date(order.updatedAt))}
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {isErrorState ? (
            <ErrorState status={order.status} updatedAt={order.updatedAt} notes={order.notes} />
          ) : (
            <Timeline reachedIdx={reachedIdx} order={order} />
          )}
        </CardContent>
      </Card>

      {/* Summary (right) */}
      <div className="space-y-4 lg:col-span-2">
        {/* Items */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4 text-[var(--gold)]" />
              รายการสินค้า
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="space-y-2">
              {order.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{it.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {toThaiNumerals(it.quantity)} × {formatBaht(it.price)}
                    </p>
                  </div>
                  <span className="font-semibold">{formatBaht(it.total)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 space-y-1 border-t border-border/60 pt-3 text-sm">
              <Row label="ยอดสินค้า" value={formatBaht(order.subtotal)} />
              {order.discount > 0 && (
                <Row label="ส่วนลด" value={`- ${formatBaht(order.discount)}`} accent="gold" />
              )}
              {order.shipping > 0 && <Row label="ค่าจัดส่ง" value={formatBaht(order.shipping)} />}
              <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                <span className="font-semibold">รวมทั้งหมด</span>
                <span className="text-lg font-bold text-[var(--forest)] dark:text-[var(--gold)]">
                  {formatBaht(order.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment + delivery */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">การชำระ & จัดส่ง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-3 text-sm">
            <InfoRow
              icon={<CreditCard className="h-3.5 w-3.5" />}
              label="การชำระเงิน"
              value={
                order.paymentMethod
                  ? `${PAYMENT_METHOD_CONFIG[order.paymentMethod as keyof typeof PAYMENT_METHOD_CONFIG]?.label ?? order.paymentMethod} · ${order.paymentStatus === 'PAID' ? 'ชำระแล้ว' : order.paymentStatus === 'UNPAID' ? 'ยังไม่ชำระ' : order.paymentStatus}`
                  : order.paymentStatus
              }
            />
            <InfoRow
              icon={<Package className="h-3.5 w-3.5" />}
              label="ประเภทออเดอร์"
              value={ORDER_TYPE_CONFIG[order.type as keyof typeof ORDER_TYPE_CONFIG]?.label ?? order.type}
            />
            {order.deliveryAddress && (
              <InfoRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="ที่อยู่จัดส่ง"
                value={order.deliveryAddress}
                stack
              />
            )}
            {order.wantAt && (
              <InfoRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="กำหนดรับ/ส่ง"
                value={formatThaiDate(new Date(order.wantAt), { withDay: true })}
              />
            )}
            {order.delivery?.riderName && (
              <InfoRow
                icon={<Truck className="h-3.5 w-3.5" />}
                label="พนักงานจัดส่ง"
                value={order.delivery.riderName}
              />
            )}
            {order.delivery?.eta && (
              <InfoRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="ETA"
                value={`ประมาณ ${toThaiNumerals(order.delivery.eta)} นาที`}
              />
            )}
            {order.notes && (
              <InfoRow
                icon={<AlertCircle className="h-3.5 w-3.5" />}
                label="หมายเหตุ"
                value={order.notes}
                stack
              />
            )}
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">ลูกค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-3 text-sm">
            <InfoRow icon={<ShoppingBag className="h-3.5 w-3.5" />} label="ชื่อ" value={order.customerName} />
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="เบอร์" value={order.customerPhone} />
            {order.customerEmail && (
              <InfoRow icon={<AlertCircle className="h-3.5 w-3.5" />} label="อีเมล" value={order.customerEmail} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ----- Timeline -----
function Timeline({ reachedIdx, order }: { reachedIdx: number; order: TrackingOrder }) {
  return (
    <ol className="relative space-y-5">
      {/* vertical line */}
      <span
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border"
      />
      {ORDER_FLOW.map((s, idx) => {
        const cfg = STATUS_CONFIG[s]
        const done = idx <= reachedIdx
        const current = idx === reachedIdx
        const ts = fallbackTimestampForStep(idx, order)
        const StepIcon = STEP_ICONS[s] ?? CheckCircle2
        return (
          <motion.li
            key={s}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx * 0.05, 0.4) }}
            className="relative flex items-start gap-3"
          >
            {/* dot */}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 transition-colors',
                done
                  ? 'bg-[var(--gold)] text-[var(--forest)] ring-[var(--gold)]'
                  : 'bg-background text-muted-foreground ring-border',
                current && 'ring-[var(--gold)] ring-offset-2 ring-offset-background'
              )}
            >
              <StepIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    done ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {cfg.label}
                </p>
                {ts && done && (
                  <span className="text-[11px] text-muted-foreground">
                    {formatThaiDateTime(new Date(ts))}
                  </span>
                )}
              </div>
              {current && (
                <p className="mt-0.5 text-[11px] text-[var(--gold)]">
                  ● สถานะปัจจุบัน
                </p>
              )}
              {!done && idx === reachedIdx + 1 && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  ขั้นตอนถัดไป
                </p>
              )}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}

// ----- Error state (CANCELLED / REFUNDED) -----
function ErrorState({
  status,
  updatedAt,
  notes,
}: {
  status: OrderStatus
  updatedAt: string
  notes?: string | null
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-center"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
        <XCircle className="h-6 w-6" />
      </div>
      <p className="font-bold text-red-700 dark:text-red-300">
        {cfg.label} · {cfg.icon}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        ออเดอร์นี้ถูก{status === 'CANCELLED' ? 'ยกเลิก' : 'คืนเงิน'} เมื่อ{' '}
        {formatThaiDateTime(new Date(updatedAt))}
      </p>
      {notes && (
        <p className="mt-3 rounded-md bg-background/60 p-2 text-sm">
          📝 {notes}
        </p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        หากมีข้อสงสัย โทร 02-123-4567 หรือ LINE @khanomhouse
      </p>
    </motion.div>
  )
}

// ----- small helpers -----
const STEP_ICONS: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  PENDING: Clock,
  PAID: CreditCard,
  PREPARING: ShoppingBag,
  COOKING: Package,
  PACKING: Package,
  OUT_FOR_DELIVERY: Truck,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  REFUNDED: RotateCcw,
}

function Row({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'gold'
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', accent === 'gold' && 'text-[var(--gold)]')}>
        {value}
      </span>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  stack,
}: {
  icon: React.ReactNode
  label: string
  value: string
  stack?: boolean
}) {
  if (stack) {
    return (
      <div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {icon} {label}
        </p>
        <p className="mt-0.5 pl-5 text-sm">{value}</p>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
