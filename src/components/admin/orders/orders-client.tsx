'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Download,
  Search,
  LayoutGrid,
  Table2,
  X,
  CalendarDays,
  Filter,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ORDER_FLOW,
  STATUS_CONFIG,
  CHANNEL_CONFIG,
  PAYMENT_STATUS_CONFIG,
  type OrderStatus,
  type OrderChannel,
  type PaymentStatus,
  type OrderType,
} from '@/lib/order-status'
import {
  formatBaht,
  formatThaiDate,
  timeAgoThai,
  toThaiNumerals,
} from '@/lib/thai-date'
import { cn } from '@/lib/utils'
import { OrderDetailSheet } from './order-detail-sheet'
import { CreateOrderDialog } from './create-order-dialog'

export interface OrderListDTO {
  id: string
  orderNo: string
  channel: string
  customerName: string
  customerPhone: string
  type: string
  status: string
  paymentStatus: string
  paymentMethod: string | null
  subtotal: number
  discount: number
  shipping: number
  total: number
  itemCount: number
  createdAt: string
  wantAt: string | null
}

type Kpis = {
  todayCount: number
  todayRevenue: number
  pending: number
  preparing: number
  cooking: number
  outForDelivery: number
  completed: number
  cancelled: number
}

interface Props {
  initialOrders: OrderListDTO[]
}

const PAGE_SIZE = 50

export function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = React.useState<OrderListDTO[]>(initialOrders)
  const [kpis, setKpis] = React.useState<Kpis | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [view, setView] = React.useState<'kanban' | 'table'>('kanban')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detailId, setDetailId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  // Filters
  const [q, setQ] = React.useState('')
  const [channels, setChannels] = React.useState<OrderChannel[]>([])
  const [statuses, setStatuses] = React.useState<OrderStatus[]>([])
  const [paymentStatuses, setPaymentStatuses] = React.useState<PaymentStatus[]>([])
  const [types, setTypes] = React.useState<OrderType[]>([])
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )
  const [dragId, setDragId] = React.useState<string | null>(null)

  const fetchList = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '1', pageSize: String(PAGE_SIZE) })
      if (q) params.set('q', q)
      if (channels.length) params.set('channel', channels.join(','))
      if (statuses.length) params.set('status', statuses.join(','))
      if (paymentStatuses.length) params.set('paymentStatus', paymentStatuses.join(','))
      if (types.length) params.set('type', types.join(','))
      if (from) params.set('from', new Date(from).toISOString())
      if (to) params.set('to', new Date(to + 'T23:59:59').toISOString())
      const res = await fetch(`/api/admin/orders?${params.toString()}`, { signal })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOrders(data.items)
      setKpis(data.kpis)
    } catch (e: unknown) {
      // Ignore abort errors — they fire on every debounced re-fetch.
      if ((e as Error).name === 'AbortError') return
      toast.error('ดึงรายการไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      // Only clear loading if this wasn't aborted (avoid clobbering the
      // in-flight request that replaced it).
      if (!signal?.aborted) setLoading(false)
    }
  }, [q, channels, statuses, paymentStatuses, types, from, to])

  React.useEffect(() => {
    const ac = new AbortController()
    const t = setTimeout(() => fetchList(ac.signal), 300)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [fetchList])

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  const handleDragStart = (e: DragStartEvent) => {
    setDragId(String(e.active.id))
  }
  const handleDragEnd = async (e: DragEndEvent) => {
    setDragId(null)
    const { active, over } = e
    if (!over) return
    const orderId = String(active.id)
    const newStatus = String(over.id) as OrderStatus
    const order = orders.find((o) => o.id === orderId)
    if (!order || order.status === newStatus) return

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${order.orderNo} → ${STATUS_CONFIG[newStatus].label}`)
    } catch (err: unknown) {
      toast.error('ย้ายสถานะไม่สำเร็จ', { description: (err as Error).message })
      // revert
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: order.status } : o))
      )
    }
  }

  const exportCsv = () => {
    const rows = [
      ['orderNo', 'channel', 'customerName', 'customerPhone', 'type', 'status', 'paymentStatus', 'paymentMethod', 'itemCount', 'subtotal', 'discount', 'shipping', 'total', 'createdAt'],
      ...orders.map((o) => [
        o.orderNo,
        o.channel,
        o.customerName,
        o.customerPhone,
        o.type,
        o.status,
        o.paymentStatus,
        o.paymentMethod ?? '',
        String(o.itemCount),
        String(o.subtotal),
        String(o.discount),
        String(o.shipping),
        String(o.total),
        new Date(o.createdAt).toISOString(),
      ]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`ส่งออก ${toThaiNumerals(orders.length)} รายการ`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            🛒 คำสั่งซื้อ
          </h1>
          <p className="text-sm text-muted-foreground">
            จัดการคำสั่งซื้อจากทุกช่องทาง — POS, เว็บ, LINE, Grab, โทร, Catering
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchList()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            รีเฟรช
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> สร้างออเดอร์
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <KpiCard
          label="ออเดอร์วันนี้"
          value={kpis ? toThaiNumerals(kpis.todayCount) : '—'}
          sub={kpis ? formatBaht(kpis.todayRevenue) : ''}
          tone="gold"
          onClick={() => {
            setStatuses([])
            setQ('')
          }}
        />
        <KpiCard
          label="รอยืนยัน"
          value={kpis ? toThaiNumerals(kpis.pending) : '—'}
          tone="amber"
          onClick={() => setStatuses(['PENDING'])}
        />
        <KpiCard
          label="กำลังเตรียม"
          value={kpis ? toThaiNumerals(kpis.preparing + kpis.cooking) : '—'}
          tone="violet"
          onClick={() => setStatuses(['PAID', 'PREPARING', 'COOKING', 'PACKING'])}
        />
        <KpiCard
          label="รอจัดส่ง"
          value={kpis ? toThaiNumerals(kpis.outForDelivery) : '—'}
          tone="cyan"
          onClick={() => setStatuses(['OUT_FOR_DELIVERY'])}
        />
        <KpiCard
          label="ส่งแล้ว"
          value={kpis ? toThaiNumerals(kpis.completed) : '—'}
          tone="emerald"
          onClick={() => setStatuses(['COMPLETED'])}
        />
        <KpiCard
          label="ยกเลิก"
          value={kpis ? toThaiNumerals(kpis.cancelled) : '—'}
          tone="red"
          onClick={() => setStatuses(['CANCELLED'])}
        />
        <KpiCard
          label="ทั้งหมดในหน้า"
          value={toThaiNumerals(orders.length)}
          sub={`แสดง ${toThaiNumerals(PAGE_SIZE)} ล่าสุด`}
          tone="neutral"
        />
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหา (เลขออเดอร์, ชื่อ, เบอร์)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <MultiSelect
            label="ช่องทาง"
            options={Object.entries(CHANNEL_CONFIG).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))}
            selected={channels}
            onChange={(v) => setChannels(v as OrderChannel[])}
          />
          <MultiSelect
            label="สถานะ"
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))}
            selected={statuses}
            onChange={(v) => setStatuses(v as OrderStatus[])}
          />
          <MultiSelect
            label="การชำระ"
            options={Object.entries(PAYMENT_STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
            selected={paymentStatuses}
            onChange={(v) => setPaymentStatuses(v as PaymentStatus[])}
          />
          <MultiSelect
            label="ประเภท"
            options={[
              { value: 'WALK_IN', label: 'รับหน้าร้าน' },
              { value: 'DELIVERY', label: 'จัดส่ง' },
              { value: 'PICKUP', label: 'มารับเอง' },
              { value: 'CATERING', label: 'จัดเลี้ยง' },
              { value: 'PREORDER', label: 'สั่งล่วงหน้า' },
            ]}
            selected={types}
            onChange={(v) => setTypes(v as OrderType[])}
          />
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-36"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-36"
            />
          </div>
          {(q || channels.length || statuses.length || paymentStatuses.length || types.length || from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ('')
                setChannels([])
                setStatuses([])
                setPaymentStatuses([])
                setTypes([])
                setFrom('')
                setTo('')
              }}
            >
              <X className="h-4 w-4" /> ล้าง
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
            <Button
              size="sm"
              variant={view === 'kanban' ? 'default' : 'ghost'}
              className="h-8"
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="h-4 w-4" /> คอลัมน์
            </Button>
            <Button
              size="sm"
              variant={view === 'table' ? 'default' : 'ghost'}
              className="h-8"
              onClick={() => setView('table')}
            >
              <Table2 className="h-4 w-4" /> ตาราง
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      {loading && orders.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="text-5xl">📭</div>
            <p className="font-medium">ไม่พบคำสั่งซื้อตามเงื่อนไข</p>
            <p className="text-sm text-muted-foreground">ลองปรับตัวกรองหรือสร้างออเดอร์ใหม่</p>
            <Button size="sm" className="mt-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> สร้างออเดอร์
            </Button>
          </CardContent>
        </Card>
      ) : view === 'kanban' ? (
        <KanbanView
          orders={orders}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          dragId={dragId}
          onOpen={openDetail}
        />
      ) : (
        <TableView orders={orders} onOpen={openDetail} />
      )}

      {/* Detail sheet */}
      <OrderDetailSheet
        orderId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onMutated={fetchList}
      />

      {/* Create dialog */}
      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => fetchList()}
      />
    </div>
  )
}

// ============================================================
// KPI card
// ============================================================
const TONES: Record<string, string> = {
  gold: 'border-[var(--gold)]/30 bg-[var(--gold)]/5 text-[var(--gold)] dark:text-[var(--gold)]',
  amber: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  violet: 'border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300',
  cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-700 dark:text-cyan-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  red: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
  neutral: 'border-border bg-card',
}
function KpiCard({
  label,
  value,
  sub,
  tone = 'neutral',
  onClick,
}: {
  label: string
  value: string
  sub?: string
  tone?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border p-3 text-left transition-all hover:shadow-md',
        TONES[tone],
        onClick && 'cursor-pointer hover:scale-[1.02]'
      )}
    >
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </button>
  )
}

// ============================================================
// Multi-select dropdown
// ============================================================
function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v))
    else onChange([...selected, v])
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1">
          <Filter className="h-3.5 w-3.5" />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1 text-[10px]">{toThaiNumerals(selected.length)}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52" align="start">
        <div className="space-y-1">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
              />
              <span className="flex-1">{o.label}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => onChange([])}
            >
              ล้างทั้งหมด
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Kanban View
// ============================================================
const KANBAN_COLUMNS: OrderStatus[] = [...ORDER_FLOW, 'CANCELLED' as OrderStatus]

function KanbanView({
  orders,
  sensors,
  onDragStart,
  onDragEnd,
  dragId,
  onOpen,
}: {
  orders: OrderListDTO[]
  sensors: ReturnType<typeof useSensors>
  onDragStart: (e: DragStartEvent) => void
  onDragEnd: (e: DragEndEvent) => void
  dragId: string | null
  onOpen: (id: string) => void
}) {
  // Group orders by status once per render instead of re-filtering the full
  // list for every column. With ~200 orders × 8 columns this avoids ~1600
  // unnecessary comparisons on each render.
  const grouped = React.useMemo(() => {
    const map = new Map<OrderStatus, OrderListDTO[]>()
    for (const col of KANBAN_COLUMNS) map.set(col, [])
    for (const o of orders) {
      const arr = map.get(o.status as OrderStatus)
      if (arr) arr.push(o)
    }
    return map
  }, [orders])
  const draggedOrder = orders.find((o) => o.id === dragId)

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((col) => {
          const items = grouped.get(col) ?? []
          const cfg = STATUS_CONFIG[col]
          return (
            <KanbanColumn key={col} status={col} count={items.length}>
              <ScrollArea className="max-h-[calc(100vh-280px)]">
                <div className="space-y-2 p-1">
                  <AnimatePresence>
                    {items.map((o) => (
                      <KanbanCard key={o.id} order={o} onClick={() => onOpen(o.id)} />
                    ))}
                  </AnimatePresence>
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                      ลากการ์ดมาวางที่นี่
                    </div>
                  )}
                </div>
              </ScrollArea>
            </KanbanColumn>
          )
        })}
      </div>
      <DragOverlay>
        {draggedOrder ? (
          <div className="w-72 rotate-2 opacity-90">
            <KanbanCard order={draggedOrder} onClick={() => {}} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  status,
  count,
  children,
}: {
  status: OrderStatus
  count: number
  children: React.ReactNode
}) {
  const cfg = STATUS_CONFIG[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors',
        isOver && 'border-[var(--gold)] bg-[var(--gold)]/5'
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
          <span className="text-sm font-semibold">{cfg.label}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">{toThaiNumerals(count)}</Badge>
      </div>
      <div className="flex-1 p-1">{children}</div>
    </div>
  )
}

function KanbanCard({
  order,
  onClick,
  dragging,
}: {
  order: OrderListDTO
  onClick: () => void
  dragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined
  const cfg = STATUS_CONFIG[order.status as OrderStatus]
  const channelCfg = CHANNEL_CONFIG[order.channel as OrderChannel] ?? { icon: '📦', label: order.channel }
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`เปิดรายละเอียดออเดอร์ ${order.orderNo}`}
      className={cn(
        'group relative cursor-pointer rounded-lg border bg-card p-2.5 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]',
        dragging && 'shadow-lg'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{channelCfg.icon}</span>
          <div>
            <div className="text-xs font-bold leading-tight">{order.orderNo}</div>
            <div className="text-[10px] text-muted-foreground">{channelCfg.label}</div>
          </div>
        </div>
        <Badge variant="outline" className={cn('h-4 px-1 text-[9px]', PAYMENT_STATUS_CONFIG[order.paymentStatus as PaymentStatus]?.cls)}>
          {PAYMENT_STATUS_CONFIG[order.paymentStatus as PaymentStatus]?.label}
        </Badge>
      </div>
      <div className="mt-2 truncate text-sm font-medium">{order.customerName}</div>
      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{toThaiNumerals(order.itemCount)} ชิ้น</span>
        <span>·</span>
        <span suppressHydrationWarning>{timeAgoThai(new Date(order.createdAt))}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--gold)]">{formatBaht(order.total)}</span>
        <span className={cn('flex h-2 w-2 rounded-full', cfg.dot)} />
      </div>
    </motion.div>
  )
}

// ============================================================
// Table View
// ============================================================
function TableView({
  orders,
  onOpen,
}: {
  orders: OrderListDTO[]
  onOpen: (id: string) => void
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">ออเดอร์</th>
                <th className="px-3 py-2 text-left font-medium">ช่องทาง</th>
                <th className="px-3 py-2 text-left font-medium">ลูกค้า</th>
                <th className="px-3 py-2 text-left font-medium">ประเภท</th>
                <th className="px-3 py-2 text-center font-medium">สถานะ</th>
                <th className="px-3 py-2 text-center font-medium">ชำระ</th>
                <th className="px-3 py-2 text-right font-medium">ชิ้น</th>
                <th className="px-3 py-2 text-right font-medium">ยอด</th>
                <th className="px-3 py-2 text-left font-medium">วันที่</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const cfg = STATUS_CONFIG[o.status as OrderStatus]
                const channelCfg = CHANNEL_CONFIG[o.channel as OrderChannel] ?? { icon: '📦', label: o.channel }
                return (
                  <tr
                    key={o.id}
                    onClick={() => onOpen(o.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`เปิดรายละเอียดออเดอร์ ${o.orderNo}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onOpen(o.id)
                      }
                    }}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--gold)]"
                  >
                    <td className="px-3 py-2 font-medium">{o.orderNo}</td>
                    <td className="px-3 py-2">
                      <span className="text-base">{channelCfg.icon}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{channelCfg.label}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{o.customerName}</div>
                      <div className="text-[11px] text-muted-foreground">{o.customerPhone}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{o.type}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className={cn('text-[10px]', cfg.cls)}>
                        {cfg.short}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className={cn('text-[10px]', PAYMENT_STATUS_CONFIG[o.paymentStatus as PaymentStatus]?.cls)}>
                        {PAYMENT_STATUS_CONFIG[o.paymentStatus as PaymentStatus]?.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{toThaiNumerals(o.itemCount)}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-[var(--gold)]">{formatBaht(o.total)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatThaiDate(new Date(o.createdAt), { short: true })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
