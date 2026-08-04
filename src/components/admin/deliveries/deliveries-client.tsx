'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Truck, Bike, Clock, MapPin, Package, CheckCircle2, AlertTriangle,
  Navigation, Image as ImageIcon, PenTool, MoreVertical, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminPageHeader, AdminKpiStrip, AdminMiniStat, AdminEmptyState } from '@/components/admin/admin-page-utils'
import { AssignRiderDialog } from './assign-rider-dialog'
import { deliveryStatusConfig, avatarInitials } from '@/lib/admin-ui'
import { formatBaht, formatThaiDateTime, formatThaiTime, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type DeliveryRow = {
  id: string
  orderId: string
  status: string
  pickupAt: string | null
  deliveredAt: string | null
  podSignature: string | null
  podPhotoUrl: string | null
  eta: number | null
  notes: string | null
  createdAt: string
  rider: { id: string; name: string; role: string; avatarUrl: string | null; phone: string | null } | null
  order: {
    id: string; orderNo: string; customerName: string; customerPhone: string
    deliveryAddress: string | null; total: number; status: string
    createdAt: string; wantAt: string | null
    branch: { name: string; address: string | null } | null
  } | null
}

const COLUMNS: { key: string; label: string }[] = [
  { key: 'ASSIGNED', label: 'รอจัดส่ง' },
  { key: 'PICKED_UP', label: 'รับสินค้าแล้ว' },
  { key: 'ON_THE_WAY', label: 'กำลังส่ง' },
  { key: 'DELIVERED', label: 'ส่งสำเร็จ' },
  { key: 'FAILED', label: 'ส่งไม่สำเร็จ' },
]

const NEXT_STATUS: Record<string, string | null> = {
  ASSIGNED: 'PICKED_UP',
  PICKED_UP: 'ON_THE_WAY',
  ON_THE_WAY: 'DELIVERED',
  DELIVERED: null,
  FAILED: null,
}

export function DeliveriesClient({
  initialDeliveries,
  branches = [],
}: {
  initialDeliveries: DeliveryRow[]
  branches?: { id: string; name: string; code: string; address: string | null }[]
}) {
  const qc = useQueryClient()
  const [assignTarget, setAssignTarget] = React.useState<string | null>(null)
  const [view, setView] = React.useState<'kanban' | 'list'>('kanban')
  const [branchId, setBranchId] = React.useState(branches[0]?.id ?? 'all')

  const { data, isLoading } = useQuery<{ deliveries: DeliveryRow[] }>({
    queryKey: ['admin-deliveries'],
    queryFn: async () => {
      const r = await fetch('/api/admin/deliveries')
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { deliveries: initialDeliveries },
  })

  const allDeliveries = data?.deliveries ?? []
  const deliveries = React.useMemo(() => {
    if (branchId === 'all') return allDeliveries
    return allDeliveries.filter((d) => d.order?.branch?.name === branchId)
  }, [allDeliveries, branchId])

  const kpis = React.useMemo(() => {
    const now = new Date()
    const pending = deliveries.filter((d) => ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(d.status)).length
    const active = deliveries.filter((d) => ['PICKED_UP', 'ON_THE_WAY'].includes(d.status)).length
    const deliveredToday = deliveries.filter((d) => {
      if (d.status !== 'DELIVERED' || !d.deliveredAt) return false
      const dd = new Date(d.deliveredAt)
      return dd.toDateString() === now.toDateString()
    }).length
    const late = deliveries.filter((d) => {
      if (['DELIVERED', 'FAILED'].includes(d.status)) return false
      if (!d.order?.wantAt) return false
      return new Date(d.order.wantAt) < now
    }).length
    // avg delivery time
    const completed = deliveries.filter((d) => d.status === 'DELIVERED' && d.pickupAt && d.deliveredAt)
    const avgMin = completed.length > 0
      ? completed.reduce((s, d) => s + (new Date(d.deliveredAt!).getTime() - new Date(d.pickupAt!).getTime()) / 60000, 0) / completed.length
      : 0
    return { pending, active, deliveredToday, late, avgMin }
  }, [deliveries])

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-deliveries'] })

  const changeStatus = async (id: string, status: string) => {
    try {
      const r = await fetch(`/api/admin/deliveries/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!r.ok) throw new Error('อัปเดตไม่สำเร็จ')
      toast.success(`เปลี่ยนสถานะเป็น ${deliveryStatusConfig(status).label}`)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const openMap = (d: DeliveryRow) => {
    if (!d.order?.deliveryAddress) {
      toast.error('ไม่มีที่อยู่จัดส่ง')
      return
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.order.deliveryAddress)}`
    window.open(url, '_blank')
  }

  const grouped: Record<string, DeliveryRow[]> = React.useMemo(() => {
    const m: Record<string, DeliveryRow[]> = { ASSIGNED: [], PICKED_UP: [], ON_THE_WAY: [], DELIVERED: [], FAILED: [] }
    for (const d of deliveries) {
      if (m[d.status]) m[d.status].push(d)
    }
    return m
  }, [deliveries])

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="จัดการการจัดส่ง"
        subtitle="ติดตามและมอบหมายงานจัดส่งให้ rider พร้อม POD"
        icon={Truck}
        actions={
          <>
            {branches.length > 0 && (
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสาขา</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="inline-flex rounded-lg border p-0.5">
              <Button
                size="sm" variant={view === 'kanban' ? 'default' : 'ghost'}
                className={cn('h-7 text-xs', view === 'kanban' && 'bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]')}
                onClick={() => setView('kanban')}
              >
                Kanban
              </Button>
              <Button
                size="sm" variant={view === 'list' ? 'default' : 'ghost'}
                className={cn('h-7 text-xs', view === 'list' && 'bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]')}
                onClick={() => setView('list')}
              >
                รายการ
              </Button>
            </div>
          </>
        }
      />

      <AdminKpiStrip>
        <AdminMiniStat label="รอจัดส่ง" value={toThaiNumerals(kpis.pending)} icon={Clock} accent="amber" />
        <AdminMiniStat label="กำลังส่ง" value={toThaiNumerals(kpis.active)} icon={Truck} accent="teal" />
        <AdminMiniStat label="ส่งสำเร็จวันนี้" value={toThaiNumerals(kpis.deliveredToday)} icon={CheckCircle2} accent="forest" />
        <AdminMiniStat label="ล่าช้า" value={toThaiNumerals(kpis.late)} icon={AlertTriangle} accent="red" />
        <AdminMiniStat label="เฉลี่ยเวลาส่ง" value={`${toThaiNumerals(Math.round(kpis.avgMin))} นาที`} icon={Clock} accent="gold" />
        <AdminMiniStat label="ทั้งหมด" value={toThaiNumerals(deliveries.length)} icon={Package} accent="gold" />
      </AdminKpiStrip>

      {deliveries.length === 0 && !isLoading ? (
        <AdminEmptyState
          icon={Truck}
          title="ยังไม่มีงานจัดส่งในระบบ"
          description="เมื่อมีออเดอร์ที่ต้องจัดส่ง รายการจะปรากฏที่นี่"
        />
      ) : isLoading ? (
        <div className="grid gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
        </div>
      ) : view === 'kanban' ? (
        <div className="grid gap-3 lg:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = grouped[col.key] ?? []
            return (
              <div key={col.key} className="flex flex-col gap-2">
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 backdrop-blur">
                  <span className="text-xs font-semibold">{col.label}</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{toThaiNumerals(items.length)}</Badge>
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-3 text-center text-[10px] text-muted-foreground">ไม่มีรายการ</div>
                  ) : items.map((d, i) => (
                    <DeliveryCard
                      key={d.id}
                      d={d}
                      index={i}
                      onAssign={() => setAssignTarget(d.id)}
                      onStatus={(s) => changeStatus(d.id, s)}
                      onMap={() => openMap(d)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">ออเดอร์ / ลูกค้า</th>
                  <th className="px-3 py-2.5 text-left font-medium">ที่อยู่</th>
                  <th className="px-3 py-2.5 text-left font-medium">Rider</th>
                  <th className="px-3 py-2.5 text-center font-medium">ETA</th>
                  <th className="px-3 py-2.5 text-center font-medium">สถานะ</th>
                  <th className="px-3 py-2.5 text-right font-medium">ยอด</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const cfg = deliveryStatusConfig(d.status)
                  return (
                    <tr key={d.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-xs font-semibold">{d.order?.orderNo ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{d.order?.customerName ?? '—'}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="max-w-[200px] truncate text-xs">{d.order?.deliveryAddress ?? '—'}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        {d.rider ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-[var(--gold)]/15 text-[9px] font-bold text-[var(--gold)]">
                                {avatarInitials(d.rider.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{d.rider.name}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">ยังไม่มอบหมาย</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs">
                        {d.eta ? `${toThaiNumerals(d.eta)} นาที` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge className={cn('text-[9px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">{d.order ? formatBaht(d.order.total) : '—'}</td>
                      <td className="px-3 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">การจัดการ</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setAssignTarget(d.id)}>มอบหมาย Rider</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openMap(d)}>เปิดแผนที่</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">เปลี่ยนสถานะ</DropdownMenuLabel>
                            {NEXT_STATUS[d.status] && (
                              <DropdownMenuItem onClick={() => changeStatus(d.id, NEXT_STATUS[d.status]!)}>
                                ไปสถานะถัดไป ({deliveryStatusConfig(NEXT_STATUS[d.status]!).label})
                              </DropdownMenuItem>
                            )}
                            {d.status !== 'DELIVERED' && (
                              <DropdownMenuItem onClick={() => changeStatus(d.id, 'DELIVERED')}>
                                ส่งสำเร็จ
                              </DropdownMenuItem>
                            )}
                            {d.status !== 'FAILED' && (
                              <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => changeStatus(d.id, 'FAILED')}>
                                ส่งไม่สำเร็จ
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AssignRiderDialog
        open={!!assignTarget}
        onOpenChange={(v) => !v && setAssignTarget(null)}
        deliveryId={assignTarget}
        onSaved={refresh}
      />
    </div>
  )
}

function DeliveryCard({
  d, index, onAssign, onStatus, onMap,
}: {
  d: DeliveryRow
  index: number
  onAssign: () => void
  onStatus: (s: string) => void
  onMap: () => void
}) {
  const cfg = deliveryStatusConfig(d.status)
  const next = NEXT_STATUS[d.status]
  const isLate = !['DELIVERED', 'FAILED'].includes(d.status) && d.order?.wantAt && new Date(d.order.wantAt) < new Date()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm',
        isLate && 'border-red-500/40 bg-red-500/[0.03]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold">{d.order?.orderNo ?? '—'}</p>
          <p className="truncate text-xs">{d.order?.customerName ?? '—'}</p>
          {d.order?.customerPhone && (
            <p className="truncate text-[10px] text-muted-foreground">📞 {d.order.customerPhone}</p>
          )}
        </div>
        <Badge className={cn('text-[9px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
      </div>

      {d.order?.deliveryAddress ? (
        <p className="mt-2 line-clamp-2 text-[10px] text-muted-foreground">
          <MapPin className="mr-1 inline h-2.5 w-2.5" />
          {d.order.deliveryAddress}
        </p>
      ) : (
        <p className="mt-2 line-clamp-1 text-[10px] italic text-muted-foreground">
          <MapPin className="mr-1 inline h-2.5 w-2.5" />
          ไม่ระบุที่อยู่ (ใช้โทรแจ้งลูกค้า)
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {d.rider ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-[var(--gold)]/15 text-[9px] font-bold text-[var(--gold)]">
                {avatarInitials(d.rider.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px]">{d.rider.name}</span>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="h-6 gap-1 text-[10px]" onClick={onAssign}>
            <Plus className="h-2.5 w-2.5" /> มอบหมาย
          </Button>
        )}
        {d.eta && (
          <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" /> {toThaiNumerals(d.eta)}น.
          </span>
        )}
      </div>

      {d.status === 'DELIVERED' && (
        <div className="mt-2 flex gap-1">
          <div className="flex items-center gap-0.5 rounded bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
            <ImageIcon className="h-2.5 w-2.5" /> {d.podPhotoUrl ? 'รูป POD' : 'ไม่มีรูป'}
          </div>
          <div className="flex items-center gap-0.5 rounded bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
            <PenTool className="h-2.5 w-2.5" /> {d.podSignature ? 'ลายเซ็น' : 'ไม่มีลายเซ็น'}
          </div>
          {d.deliveredAt && (
            <div className="ml-auto rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
              {formatThaiTime(new Date(d.deliveredAt))}
            </div>
          )}
        </div>
      )}

      {isLate && (
        <p className="mt-1 text-[10px] font-medium text-red-500">
          ⚠ เลยเวลาที่นัดหมาย
        </p>
      )}

      <div className="mt-2 flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-6 flex-1 gap-1 text-[10px]" onClick={onMap}>
          <Navigation className="h-2.5 w-2.5" /> แผนที่
        </Button>
        {next && (
          <Button
            size="sm" variant="outline"
            className="h-6 gap-1 text-[10px]"
            onClick={() => onStatus(next)}
          >
            ถัดไป
          </Button>
        )}
        {d.status === 'ON_THE_WAY' && (
          <Button
            size="sm" variant="outline"
            className="h-6 gap-1 text-[10px] text-emerald-600 dark:text-emerald-400"
            onClick={() => onStatus('DELIVERED')}
          >
            ส่งสำเร็จ
          </Button>
        )}
        {!['DELIVERED', 'FAILED'].includes(d.status) && (
          <Button
            size="sm" variant="outline"
            className="h-6 gap-1 text-[10px] text-red-600 dark:text-red-400"
            onClick={() => onStatus('FAILED')}
          >
            ไม่สำเร็จ
          </Button>
        )}
      </div>
    </motion.div>
  )
}
