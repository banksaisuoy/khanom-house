'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClock, Plus, ChevronLeft, ChevronRight, Sun, Moon, UserX, Trash2,
  LogIn, LogOut, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatThaiDate, formatThaiTime, toThaiNumerals } from '@/lib/thai-date'
import { avatarInitials } from '@/lib/admin-ui'
import { ScheduleFormDialog, type ScheduleFormValues, type UserLite } from './schedule-form-dialog'

type Branch = { id: string; name: string; code: string; isMain: boolean }

type ScheduleRow = {
  id: string
  userId: string
  userName: string
  userRole: string
  userAvatarUrl: string | null
  branchId: string | null
  branchName: string | null
  date: string
  shiftStart: string
  shiftEnd: string
  role: string
  status: string
  checkInAt: string | null
  checkOutAt: string | null
  notes: string | null
  createdAt: string
}

// ---------- Status config ----------
type StatusCfg = { label: string; cls: string }
const STATUS_CONFIG: Record<string, StatusCfg> = {
  SCHEDULED: { label: 'รอเช็คอิน', cls: 'bg-muted text-muted-foreground ring-border' },
  CHECKED_IN: { label: 'กำลังทำงาน', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  CHECKED_OUT: { label: 'เช็คเอาท์', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  ABSENT: { label: 'ขาดงาน', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
}
function statusConfig(s: string): StatusCfg {
  return STATUS_CONFIG[s] ?? { label: s, cls: 'bg-muted text-muted-foreground ring-border' }
}

const ROLE_LABEL: Record<string, string> = {
  CASHIER: 'แคชเชียร์',
  KITCHEN: 'ครัว',
  RIDER: 'คนส่ง',
  MANAGER: 'ผู้จัดการ',
  STAFF: 'พนักงาน',
}

type Props = {
  users: UserLite[]
  branches: Branch[]
}

const HOURS_AM_START = 12 // shifts ending before 12:00 = morning

function isMorningShift(shiftStart: string): boolean {
  return new Date(shiftStart).getHours() < HOURS_AM_START
}

export function StaffClient({ users, branches }: Props) {
  const qc = useQueryClient()
  const [view, setView] = React.useState<'day' | 'week'>('day')
  const todayStr = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = React.useState(todayStr)
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [creating, setCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState<ScheduleRow | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)

  // Compute week range (Mon-Sun) from selectedDate + weekOffset
  const weekRange = React.useMemo(() => {
    const base = new Date(selectedDate)
    base.setDate(base.getDate() + weekOffset * 7)
    const day = base.getDay() // 0=Sun, 1=Mon
    const offsetToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(base)
    monday.setDate(base.getDate() + offsetToMonday)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }
    return { monday, sunday, days }
  }, [selectedDate, weekOffset])

  // API range
  const apiFrom = view === 'day' ? selectedDate : weekRange.monday.toISOString().slice(0, 10)
  const apiTo = view === 'day' ? selectedDate : weekRange.sunday.toISOString().slice(0, 10)

  const { data, isLoading } = useQuery<{ schedules: ScheduleRow[] }>({
    queryKey: ['admin-staff-schedule', apiFrom, apiTo],
    queryFn: async () => {
      const sp = new URLSearchParams()
      sp.set('from', apiFrom)
      sp.set('to', apiTo)
      const r = await fetch(`/api/admin/staff/schedule?${sp.toString()}`, { cache: 'no-store' })
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
  })

  const schedules = data?.schedules ?? []

  // ---- Day view: list of today's schedules ----
  const daySchedules = React.useMemo(() => {
    return schedules
      .filter((s) => s.date.slice(0, 10) === selectedDate)
      .sort((a, b) => new Date(a.shiftStart).getTime() - new Date(b.shiftStart).getTime())
  }, [schedules, selectedDate])

  // ---- Week view: group by user, then by day ----
  const weekByUser = React.useMemo(() => {
    const byUser = new Map<string, ScheduleRow[]>()
    for (const s of schedules) {
      const arr = byUser.get(s.userId) ?? []
      arr.push(s)
      byUser.set(s.userId, arr)
    }
    // sort each user's schedules by day
    for (const arr of byUser.values()) {
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
    return byUser
  }, [schedules])

  // Stats for the selected day
  const todayStats = React.useMemo(() => {
    const present = daySchedules.filter((s) => s.status === 'CHECKED_IN' || s.status === 'CHECKED_OUT').length
    const morning = daySchedules.filter((s) => isMorningShift(s.shiftStart)).length
    const afternoon = daySchedules.length - morning
    const absent = daySchedules.filter((s) => s.status === 'ABSENT').length
    return { total: daySchedules.length, morning, afternoon, absent, present }
  }, [daySchedules])

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-staff-schedule'] })

  // ---- Handlers ----
  async function handleSubmit(values: ScheduleFormValues) {
    try {
      const res = await fetch('/api/admin/staff/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'บันทึกไม่สำเร็จ')
      }
      // Find user name
      const u = users.find((x) => x.id === values.userId)
      toast.success(`จัดกะให้ ${u?.name ?? 'พนักงาน'} แล้ว`)
      setCreating(false)
      // Jump to the scheduled date so user sees the new entry
      setSelectedDate(values.date.slice(0, 10))
      setWeekOffset(0)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function handleCheckIn(s: ScheduleRow) {
    setBusy(s.id)
    try {
      const res = await fetch(`/api/admin/staff/schedule/${s.id}/checkin`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'เช็คอินไม่สำเร็จ')
      }
      toast.success(`เช็คอิน ${s.userName} แล้ว`)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เช็คอินไม่สำเร็จ')
    } finally {
      setBusy(null)
    }
  }

  async function handleCheckOut(s: ScheduleRow) {
    setBusy(s.id)
    try {
      const res = await fetch(`/api/admin/staff/schedule/${s.id}/checkout`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'เช็คเอาท์ไม่สำเร็จ')
      }
      toast.success(`เช็คเอาท์ ${s.userName} แล้ว`)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เช็คเอาท์ไม่สำเร็จ')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(s: ScheduleRow) {
    try {
      const res = await fetch(`/api/admin/staff/schedule/${s.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'ลบไม่สำเร็จ')
      }
      toast.success(`ลบกะของ ${s.userName} แล้ว`)
      setDeleting(null)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Breadcrumb + header */}
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">แดชบอร์ด</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>พนักงาน & ตารางกะ</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
              <CalendarClock className="h-6 w-6 text-[var(--gold)]" />
              พนักงาน & ตารางกะ
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              จัดตารางกะพนักงานและบันทึกการเข้า-ออกงาน
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
            onClick={() => setCreating(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            จัดตารางกะ
          </Button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="พนักงานวันนี้" value={toThaiNumerals(todayStats.total)} icon={Users} accent="gold" loading={isLoading} />
        <StatCard label="กะเช้า" value={toThaiNumerals(todayStats.morning)} icon={Sun} accent="cream" loading={isLoading} />
        <StatCard label="กะบ่าย" value={toThaiNumerals(todayStats.afternoon)} icon={Moon} accent="forest" loading={isLoading} />
        <StatCard label="ขาดงาน" value={toThaiNumerals(todayStats.absent)} icon={UserX} accent="terracotta" loading={isLoading} />
      </div>

      {/* Date + view navigation */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week')}>
              <TabsList>
                <TabsTrigger value="day">รายวัน</TabsTrigger>
                <TabsTrigger value="week">รายสัปดาห์</TabsTrigger>
              </TabsList>
            </Tabs>

            {view === 'day' ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const d = new Date(selectedDate)
                    d.setDate(d.getDate() - 1)
                    setSelectedDate(d.toISOString().slice(0, 10))
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 w-[160px]"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const d = new Date(selectedDate)
                    d.setDate(d.getDate() + 1)
                    setSelectedDate(d.toISOString().slice(0, 10))
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => { setSelectedDate(todayStr); setWeekOffset(0) }}
                >
                  วันนี้
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setWeekOffset((o) => o - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[200px] text-center text-sm font-medium">
                  {formatThaiDate(weekRange.monday, { short: true })} — {formatThaiDate(weekRange.sunday, { short: true })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setWeekOffset((o) => o + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => { setSelectedDate(todayStr); setWeekOffset(0) }}
                >
                  สัปดาห์นี้
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {view === 'day' ? (
        <DayView
          schedules={daySchedules}
          loading={isLoading}
          selectedDate={selectedDate}
          busy={busy}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onDelete={(s) => setDeleting(s)}
        />
      ) : (
        <WeekView
          schedulesByUser={weekByUser}
          users={users}
          weekDays={weekRange.days}
          loading={isLoading}
          busy={busy}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
      )}

      {/* Dialogs */}
      {creating && (
        <ScheduleFormDialog
          open
          onOpenChange={(o) => { if (!o) setCreating(false) }}
          users={users}
          branches={branches}
          defaultDate={selectedDate}
          onSubmit={handleSubmit}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบกะการทำงานนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              กะของ <strong>{deleting?.userName}</strong> ในวัน{' '}
              {deleting ? formatThaiDate(new Date(deleting.date), { short: true }) : ''}{' '}
              จะถูกลบออกจากระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleting && handleDelete(deleting)}
            >
              ลบกะ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------- Day View ----------------

function DayView({
  schedules, loading, selectedDate, busy, onCheckIn, onCheckOut, onDelete,
}: {
  schedules: ScheduleRow[]
  loading: boolean
  selectedDate: string
  busy: string | null
  onCheckIn: (s: ScheduleRow) => void
  onCheckOut: (s: ScheduleRow) => void
  onDelete: (s: ScheduleRow) => void
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }
  if (schedules.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
        <CalendarClock className="h-10 w-10 text-muted-foreground/50" />
        <div>
          <p className="font-semibold">ยังไม่มีกะในวัน {formatThaiDate(new Date(selectedDate), { short: true })}</p>
          <p className="mt-1 text-sm text-muted-foreground">กดปุ่ม &quot;จัดตารางกะ&quot; เพื่อเพิ่มกะใหม่</p>
        </div>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence>
        {schedules.map((s, idx) => {
          const cfg = statusConfig(s.status)
          const morning = isMorningShift(s.shiftStart)
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.2) }}
            >
              <Card>
                <CardContent className="p-4">
                  {/* Header: avatar + name + role */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-10 w-10 border border-[var(--gold)]/40">
                        <AvatarFallback className="bg-[var(--gold)]/15 text-xs font-bold text-[var(--gold)]">
                          {avatarInitials(s.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold leading-tight">{s.userName}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className="text-[9px] font-normal">
                            {morning ? '🌅' : '🌙'} {ROLE_LABEL[s.role] ?? s.role}
                          </Badge>
                          {s.branchName && (
                            <Badge variant="outline" className="text-[9px] font-normal">{s.branchName}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={`text-[10px] ring-1 ring-inset ${cfg.cls}`}>{cfg.label}</Badge>
                  </div>

                  {/* Shift times */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-[10px] text-muted-foreground">เวลาเข้ากะ</p>
                      <p className="font-semibold tabular-nums">{formatThaiTime(new Date(s.shiftStart))}</p>
                      {s.checkInAt && (
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400">
                          จริง: {formatThaiTime(new Date(s.checkInAt))}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <p className="text-[10px] text-muted-foreground">เวลาออกกะ</p>
                      <p className="font-semibold tabular-nums">{formatThaiTime(new Date(s.shiftEnd))}</p>
                      {s.checkOutAt && (
                        <p className="text-[9px] text-[var(--gold)]">
                          จริง: {formatThaiTime(new Date(s.checkOutAt))}
                        </p>
                      )}
                    </div>
                  </div>

                  {s.notes && (
                    <p className="mt-2 text-[10px] text-muted-foreground">📝 {s.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    {s.status === 'SCHEDULED' && (
                      <Button
                        size="sm"
                        className="h-7 bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={busy === s.id}
                        onClick={() => onCheckIn(s)}
                      >
                        <LogIn className="mr-1 h-3 w-3" />
                        {busy === s.id ? '...' : 'เช็คอิน'}
                      </Button>
                    )}
                    {s.status === 'CHECKED_IN' && (
                      <Button
                        size="sm"
                        className="h-7 bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
                        disabled={busy === s.id}
                        onClick={() => onCheckOut(s)}
                      >
                        <LogOut className="mr-1 h-3 w-3" />
                        {busy === s.id ? '...' : 'เช็คเอาท์'}
                      </Button>
                    )}
                    {s.status !== 'CHECKED_OUT' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                        onClick={() => onDelete(s)}
                        title="ลบกะ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ---------------- Week View ----------------

function WeekView({
  schedulesByUser, users, weekDays, loading, busy, onCheckIn, onCheckOut,
}: {
  schedulesByUser: Map<string, ScheduleRow[]>
  users: UserLite[]
  weekDays: Date[]
  loading: boolean
  busy: string | null
  onCheckIn: (s: ScheduleRow) => void
  onCheckOut: (s: ScheduleRow) => void
}) {
  if (loading) {
    return <Skeleton className="h-64 w-full" />
  }
  const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-10 min-w-[140px] border-b bg-muted/40 px-3 py-2 text-left font-semibold text-muted-foreground">
                  พนักงาน
                </th>
                {weekDays.map((d) => {
                  const isToday = d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
                  return (
                    <th
                      key={d.toISOString()}
                      className={`min-w-[120px] border-b px-2 py-2 text-center font-semibold ${
                        isToday ? 'bg-[var(--gold)]/10 text-[var(--gold)]' : 'text-muted-foreground'
                      }`}
                    >
                      <div>{THAI_DAYS_SHORT[d.getDay()]}</div>
                      <div className="text-sm font-bold">{toThaiNumerals(d.getDate())}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const userSchedules = schedulesByUser.get(u.id) ?? []
                return (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-[var(--gold)]/15 text-[9px] font-bold text-[var(--gold)]">
                            {avatarInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium leading-tight">{u.name}</p>
                          <p className="text-[9px] text-muted-foreground">{ROLE_LABEL[u.role] ?? u.role}</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((d) => {
                      const dayKey = d.toISOString().slice(0, 10)
                      const daySched = userSchedules.filter((s) => s.date.slice(0, 10) === dayKey)
                      return (
                        <td key={dayKey} className="border-l px-1.5 py-1.5 align-top">
                          {daySched.length === 0 ? (
                            <div className="flex h-10 items-center justify-center text-[10px] text-muted-foreground/30">—</div>
                          ) : (
                            <div className="space-y-1">
                              {daySched.map((s) => {
                                const cfg = statusConfig(s.status)
                                const morning = isMorningShift(s.shiftStart)
                                return (
                                  <div
                                    key={s.id}
                                    className={`rounded-md border px-1.5 py-1 text-[10px] ${cfg.cls.replace('ring-', 'border-')}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">{morning ? '🌅' : '🌙'} {ROLE_LABEL[s.role] ?? s.role}</span>
                                    </div>
                                    <div className="tabular-nums">
                                      {formatThaiTime(new Date(s.shiftStart))} - {formatThaiTime(new Date(s.shiftEnd))}
                                    </div>
                                    <div className="mt-0.5 text-[9px] opacity-80">{cfg.label}</div>
                                    {s.status === 'SCHEDULED' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="mt-1 h-5 w-full bg-emerald-500/10 px-1 text-[9px] text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                                        disabled={busy === s.id}
                                        onClick={() => onCheckIn(s)}
                                      >
                                        เช็คอิน
                                      </Button>
                                    )}
                                    {s.status === 'CHECKED_IN' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="mt-1 h-5 w-full bg-[var(--gold)]/10 px-1 text-[9px] text-[var(--gold)] hover:bg-[var(--gold)]/20"
                                        disabled={busy === s.id}
                                        onClick={() => onCheckOut(s)}
                                      >
                                        เช็คเอาท์
                                      </Button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    ไม่พบพนักงานในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Sub-components ----------------

function StatCard({
  label, value, icon: Icon, accent, loading,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'gold' | 'forest' | 'cream' | 'terracotta'
  loading: boolean
}) {
  const accentClass = {
    gold: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30',
    forest: 'bg-[var(--forest)]/10 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/20',
    cream: 'bg-amber-700/10 text-amber-700 dark:text-amber-300 ring-amber-700/20',
    terracotta: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20',
  }[accent]
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-12" />
          ) : (
            <p className="mt-1 text-2xl font-bold">{value}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}
