'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { eventTypeConfig } from '@/lib/admin-ui'
import { toThaiNumerals, formatThaiDate } from '@/lib/thai-date'

export type CalEvent = {
  id: string
  eventNo: string
  title: string
  type: string
  status: string
  eventDate: string
  location?: string
  guestCount?: number
}

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export function EventCalendar({
  events,
  onSelectEvent,
}: {
  events: CalEvent[]
  onSelectEvent: (e: CalEvent) => void
}) {
  const today = React.useMemo(() => new Date(), [])
  const [cursor, setCursor] = React.useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Build 6×7 grid
  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  while (cells.length < 42) cells.push(null)

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const e of events) {
      const d = new Date(e.eventDate)
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const arr = map.get(k) ?? []
      arr.push(e)
      map.set(k, arr)
    }
    return map
  }, [events])

  const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()

  const goPrev = () => setCursor(new Date(year, month - 1, 1))
  const goNext = () => setCursor(new Date(year, month + 1, 1))
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(null)
  }

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} aria-label="เดือนก่อนหน้า">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} aria-label="เดือนถัดไป">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold">
            {THAI_MONTHS[month]} {toThaiNumerals(year + 543)}
          </h3>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToday}>
          วันนี้
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-1 py-2 text-center text-[11px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[80px] border-b border-r bg-muted/20 md:min-h-[100px]" />
            const k = dateKey(d)
            const evs = eventsByDate.get(k) ?? []
            const isSel = selectedDate === k
            const todayHighlight = isToday(d)
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(k)}
                className={cn(
                  'relative min-h-[80px] border-b border-r p-1.5 text-left align-top transition-colors hover:bg-[var(--gold)]/[0.04] md:min-h-[100px] md:p-2',
                  isSel && 'bg-[var(--gold)]/[0.08] ring-1 ring-inset ring-[var(--gold)]/40',
                  todayHighlight && 'bg-[var(--forest)]/[0.06]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium',
                      todayHighlight
                        ? 'bg-[var(--forest)] text-[var(--gold)]'
                        : 'text-muted-foreground'
                    )}
                  >
                    {toThaiNumerals(d.getDate())}
                  </span>
                  {evs.length > 0 && (
                    <span className="text-[9px] font-medium text-[var(--gold)]">
                      {toThaiNumerals(evs.length)}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {evs.slice(0, 2).map((e) => {
                    const cfg = eventTypeConfig(e.type)
                    return (
                      <div
                        key={e.id}
                        className={cn(
                          'truncate rounded px-1 py-0.5 text-[9px] font-medium ring-1 ring-inset md:text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]',
                          cfg.cls
                        )}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onSelectEvent(e)
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault()
                            ev.stopPropagation()
                            onSelectEvent(e)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`เปิดรายละเอียดงาน ${e.title}`}
                      >
                        {e.title}
                      </div>
                    )
                  })}
                  {evs.length > 2 && (
                    <div className="px-1 text-[9px] text-muted-foreground">
                      +{toThaiNumerals(evs.length - 2)} รายการ
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl border bg-card p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {(() => {
                const [y, m, d] = selectedDate.split('-').map(Number)
                return formatThaiDate(new Date(y, m, d), { withDay: true })
              })()}
            </p>
            <span className="text-xs text-muted-foreground">{toThaiNumerals(selectedEvents.length)} งาน</span>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">ไม่มีงานในวันนี้</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedEvents.map((e) => {
                const cfg = eventTypeConfig(e.type)
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(e)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                    >
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset', cfg.cls)}>
                        {cfg.label}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium">{e.title}</span>
                      <span className="text-[11px] text-muted-foreground">{e.eventNo}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </motion.div>
      )}
    </div>
  )
}
