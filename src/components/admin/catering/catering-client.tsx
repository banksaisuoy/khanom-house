'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CalendarDays, Plus, List, LayoutGrid, Calendar, Users, Clock,
  CheckCircle2, Wallet, PiggyBank, Filter, Search, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminPageHeader, AdminKpiStrip, AdminMiniStat, AdminEmptyState } from '@/components/admin/admin-page-utils'
import { EventCalendar, type CalEvent } from './event-calendar'
import { EventFormDialog, type EventFormValues } from './event-form-dialog'
import { EventDetailSheet, type CateringEventDetail } from './event-detail-sheet'
import { eventTypeConfig, eventStatusConfig, countdownLabel, googleMapsUrl, daysFromNow } from '@/lib/admin-ui'
import { formatBaht, formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type RawEvent = CateringEventDetail

const TYPES = [
  { value: 'all', label: 'ทุกประเภท' },
  { value: 'BREAK', label: 'จัดเบรค' },
  { value: 'SEMINAR', label: 'สัมมนา' },
  { value: 'WEDDING', label: 'แต่งงาน' },
  { value: 'MERIT', label: 'งานบุญ' },
  { value: 'CORPORATE', label: 'องค์กร' },
  { value: 'PARTY', label: 'ปาร์ตี้' },
]
const STATUSES = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'DRAFT', label: 'ร่าง' },
  { value: 'QUOTED', label: 'ส่งใบเสนอราคา' },
  { value: 'CONFIRMED', label: 'ยืนยันแล้ว' },
  { value: 'PREPARING', label: 'กำลังเตรียม' },
  { value: 'DELIVERED', label: 'จัดส่งแล้ว' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

export function CateringClient({ initialEvents }: { initialEvents: RawEvent[] }) {
  const qc = useQueryClient()
  const [view, setView] = React.useState<'list' | 'calendar'>('list')
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [q, setQ] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Partial<EventFormValues> & { id?: string } | undefined>(undefined)
  const [detailEvent, setDetailEvent] = React.useState<RawEvent | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  const queryKey = React.useMemo(
    () => ['admin-catering', typeFilter, statusFilter, from, to, q],
    [typeFilter, statusFilter, from, to, q]
  )

  const { data, isLoading, isFetching } = useQuery<{ events: RawEvent[] }>({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (typeFilter !== 'all') sp.set('type', typeFilter)
      if (statusFilter !== 'all') sp.set('status', statusFilter)
      if (from) sp.set('from', from)
      if (to) sp.set('to', to)
      if (q) sp.set('q', q)
      const r = await fetch(`/api/admin/catering?${sp.toString()}`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { events: initialEvents },
  })

  const events = data?.events ?? []

  // KPIs
  const kpis = React.useMemo(() => {
    const all = events
    const pending = all.filter((e) => ['DRAFT', 'QUOTED'].includes(e.status)).length
    const confirmed = all.filter((e) => ['CONFIRMED', 'PREPARING'].includes(e.status)).length
    const now = new Date()
    const weekEnd = new Date(now.getTime() + 7 * 86400000)
    const thisWeek = all.filter((e) => {
      const d = new Date(e.eventDate)
      return d >= now && d <= weekEnd && !['CANCELLED', 'COMPLETED'].includes(e.status)
    }).length
    const totalValue = all.reduce((s, e) => s + e.totalQuote, 0)
    const totalDeposit = all.reduce((s, e) => s + e.deposit, 0)
    return { all: all.length, pending, confirmed, thisWeek, totalValue, totalDeposit }
  }, [events])

  const openCreate = () => {
    setEditTarget(undefined)
    setFormOpen(true)
  }
  const openEdit = (e: RawEvent) => {
    setEditTarget({
      id: e.id,
      title: e.title, type: e.type, customerName: e.customerName,
      customerPhone: e.customerPhone, customerEmail: e.customerEmail ?? '',
      guestCount: e.guestCount, eventDate: e.eventDate, setupTime: e.setupTime ?? '',
      location: e.location, mapUrl: e.mapUrl ?? '', theme: e.theme ?? '',
      packagingType: e.packagingType ?? '', budget: e.budget, totalQuote: e.totalQuote,
      deposit: e.deposit, status: e.status, assignedUserId: e.assignedUserId ?? '',
      vehicle: e.vehicle ?? '', notes: e.notes ?? '',
      items: e.items, checklist: e.checklist,
    })
    setDetailOpen(false)
    setFormOpen(true)
  }
  const openDetail = (e: RawEvent) => {
    setDetailEvent(e)
    setDetailOpen(true)
  }

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-catering'] })
  }

  const calEvents: CalEvent[] = events.map((e) => ({
    id: e.id, eventNo: e.eventNo, title: e.title, type: e.type, status: e.status,
    eventDate: e.eventDate, location: e.location, guestCount: e.guestCount,
  }))

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="จัดงาน & รับเบรค"
        subtitle="จัดการงาน Catering จัดเบรค งานมงคล และอีเวนต์ของร้าน"
        icon={CalendarDays}
        actions={
          <>
            <div className="inline-flex rounded-lg border p-0.5">
              <Button
                size="sm" variant={view === 'list' ? 'default' : 'ghost'}
                className={cn('h-7 gap-1 text-xs', view === 'list' && 'bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]')}
                onClick={() => setView('list')}
              >
                <List className="h-3.5 w-3.5" /> รายการ
              </Button>
              <Button
                size="sm" variant={view === 'calendar' ? 'default' : 'ghost'}
                className={cn('h-7 gap-1 text-xs', view === 'calendar' && 'bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]')}
                onClick={() => setView('calendar')}
              >
                <Calendar className="h-3.5 w-3.5" /> ปฏิทิน
              </Button>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]">
              <Plus className="h-4 w-4" /> สร้างงานใหม่
            </Button>
          </>
        }
      />

      {/* KPI strip */}
      <AdminKpiStrip>
        <AdminMiniStat label="งานทั้งหมด" value={toThaiNumerals(kpis.all)} icon={CalendarDays} accent="gold" />
        <AdminMiniStat label="รอยืนยัน" value={toThaiNumerals(kpis.pending)} icon={Clock} accent="amber" />
        <AdminMiniStat label="ยืนยันแล้ว" value={toThaiNumerals(kpis.confirmed)} icon={CheckCircle2} accent="forest" />
        <AdminMiniStat label="สัปดาห์นี้" value={toThaiNumerals(kpis.thisWeek)} icon={Users} accent="teal" />
        <AdminMiniStat label="มูลค่ารวม" value={formatBaht(kpis.totalValue)} icon={Wallet} accent="gold" />
        <AdminMiniStat label="มัดจำรวม" value={formatBaht(kpis.totalDeposit)} icon={PiggyBank} accent="forest" />
      </AdminKpiStrip>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> ตัวกรอง
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">จาก</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">ถึง</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[140px] text-xs" />
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่องาน, ลูกค้า, เบอร์, สถานที่"
            className="h-8 w-[220px] pl-7 text-xs"
          />
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="rounded-xl border bg-card p-4">
          <EventCalendar events={calEvents} onSelectEvent={(e) => {
            const full = events.find((x) => x.id === e.id)
            if (full) openDetail(full)
          }} />
        </div>
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <AdminEmptyState
          icon={CalendarDays}
          title="ยังไม่มีงานในระบบ"
          description="คลิก 'สร้างงานใหม่' เพื่อเพิ่มงาน Catering / จัดเบรค"
          action={<Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> สร้างงานใหม่</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((e, i) => {
            const tCfg = eventTypeConfig(e.type)
            const sCfg = eventStatusConfig(e.status)
            return (
              <motion.button
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => openDetail(e)}
                className="group rounded-xl border bg-card p-4 text-left transition-all hover:border-[var(--gold)]/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className={cn('ring-1 ring-inset', tCfg.cls)}>{tCfg.label}</Badge>
                      <Badge className={cn('ring-1 ring-inset', sCfg.cls)}>{sCfg.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">{e.eventNo}</span>
                    </div>
                    <h3 className="mt-1.5 truncate font-semibold">{e.title}</h3>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-[var(--gold)]">{formatBaht(e.totalQuote)}</p>
                    <p className="text-[10px] text-muted-foreground">มัดจำ {formatBaht(e.deposit)}</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatThaiDate(new Date(e.eventDate), { short: true })}
                    {(() => {
                      const days = daysFromNow(e.eventDate)
                      const overdue = days < 0 && !['CANCELLED', 'COMPLETED'].includes(e.status)
                      if (overdue) {
                        return (
                          <span className="font-semibold text-red-600 dark:text-red-400">· เลยกำหนด</span>
                        )
                      }
                      return (
                        <span className={cn('text-[var(--gold)]', days === 0 && 'font-semibold text-amber-600 dark:text-amber-400')}>
                          · {countdownLabel(e.eventDate)}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {toThaiNumerals(e.guestCount)} ท่าน
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{e.location}</span>
                    <a
                      href={e.mapUrl || googleMapsUrl(e.location)}
                      target="_blank" rel="noreferrer"
                      onClick={(ev) => ev.stopPropagation()}
                      className="ml-auto shrink-0 text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
                    >
                      แผนที่
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]">รับผิดชอบ:</span>
                    <span className="truncate">{e.assignedUser?.name ?? '—'}</span>
                  </div>
                  {e.vehicle && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">รถ:</span>
                      <span className="truncate">{e.vehicle}</span>
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {isFetching && !isLoading && (
        <p className="text-center text-[10px] text-muted-foreground">กำลังอัปเดต...</p>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        onSaved={refresh}
      />
      <EventDetailSheet
        event={detailEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onChanged={async () => {
          // refetch detail then refresh list
          if (detailEvent) {
            const r = await fetch(`/api/admin/catering/${detailEvent.id}`)
            if (r.ok) {
              const j = await r.json()
              setDetailEvent(j)
            }
          }
          refresh()
        }}
      />
    </div>
  )
}
