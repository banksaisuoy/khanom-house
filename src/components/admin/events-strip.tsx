import Link from 'next/link'
import { CalendarDays, MapPin, Users, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type EventItem = {
  id: string
  eventNo: string
  title: string
  type: string
  guestCount: number
  eventDate: string
  status: string
  location: string
  totalQuote: number
}

const TYPE_LABEL: Record<string, string> = {
  BREAK: 'จัดเบรค',
  SEMINAR: 'สัมมนา',
  WEDDING: 'งานแต่ง',
  MERIT: 'งานบุญ',
  CORPORATE: 'องค์กร',
  PARTY: 'ปาร์ตี้',
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'ร่าง', cls: 'bg-muted text-muted-foreground' },
  QUOTED: { label: 'เสนอราคา', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  CONFIRMED: { label: 'ยืนยันแล้ว', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  PREPARING: { label: 'กำลังเตรียม', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  DELIVERED: { label: 'จัดส่งแล้ว', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  COMPLETED: { label: 'เสร็จสิ้น', cls: 'bg-[var(--gold)]/15 text-[var(--gold)]' },
  CANCELLED: { label: 'ยกเลิก', cls: 'bg-red-500/10 text-red-700 dark:text-red-300' },
}

const THAI_DAY = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function EventsStrip({ events }: { events: EventItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--forest)] dark:text-[var(--gold)]" />
          <CardTitle className="text-base">Catering & งานที่กำลังจะมาถึง</CardTitle>
        </div>
        <Link
          href="/admin/catering"
          className="flex items-center gap-1 text-xs font-medium text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
        >
          ปฏิทินทั้งหมด <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-2">
        {events.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
            ไม่มีงานที่กำลังจะมาถึงใน 7 วันนี้
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {events.map((e) => {
              const d = new Date(e.eventDate)
              const cfg = STATUS_CONFIG[e.status] ?? { label: e.status, cls: '' }
              const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000)
              return (
                <Link
                  key={e.id}
                  href="/admin/catering"
                  className="group flex min-w-[240px] max-w-[240px] shrink-0 flex-col gap-2 rounded-xl border bg-card p-3 transition-all hover:border-[var(--gold)]/50 hover:shadow-md"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-[var(--forest)] to-[var(--forest)]/80 text-cream dark:from-[var(--gold)] dark:to-[#a8854f]">
                      <span className="text-[9px] font-medium leading-none">
                        {THAI_DAY[d.getDay()]}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {toThaiNumerals(d.getDate())}
                      </span>
                      <span className="text-[8px] leading-none opacity-80">
                        {THAI_MONTH_SHORT[d.getMonth()]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-semibold leading-tight">
                        {e.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {TYPE_LABEL[e.type] ?? e.type} · {e.eventNo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {toThaiNumerals(e.guestCount)} ท่าน
                    </span>
                    {daysUntil >= 0 ? (
                      <span className="font-medium text-[var(--gold)]" suppressHydrationWarning>
                        อีก {toThaiNumerals(daysUntil)} วัน
                      </span>
                    ) : (
                      <span className="font-medium text-red-500" suppressHydrationWarning>เลยกำหนด</span>
                    )}
                  </div>

                  {e.location && (
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">{e.location}</span>
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-[var(--gold)]">
                      {formatBaht(e.totalQuote)}
                    </span>
                    <Badge variant="secondary" className={cn('h-5 px-1.5 text-[9px] font-medium', cfg.cls)}>
                      {cfg.label}
                    </Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
