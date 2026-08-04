'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { thaiDayShort, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type PeakHour = { day: number; hour: number; count: number }

// Business hours: 8am – 8pm (12 hours)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)
const DAYS = [0, 1, 2, 3, 4, 5, 6] // Sun..Sat

export function PeakHoursHeatmap({ data }: { data: PeakHour[] }) {
  // Build lookup: countMap[day][hour] = count
  const lookup = new Map<string, number>()
  for (const p of data) lookup.set(`${p.day}-${p.hour}`, p.count)

  const max = Math.max(1, ...data.map((d) => d.count))

  // Find peak cell
  let peakDay = 0
  let peakHour = 8
  let peakCount = 0
  for (const d of DAYS) {
    for (const h of HOURS) {
      const c = lookup.get(`${d}-${h}`) ?? 0
      if (c > peakCount) {
        peakCount = c
        peakDay = d
        peakHour = h
      }
    }
  }

  function heatColor(count: number): string {
    if (count === 0) return 'var(--muted)'
    const ratio = count / max
    // gold intensity scale
    if (ratio > 0.75) return 'var(--gold)'
    if (ratio > 0.5) return 'color-mix(in oklch, var(--gold) 75%, var(--muted))'
    if (ratio > 0.25) return 'color-mix(in oklch, var(--gold) 45%, var(--muted))'
    return 'color-mix(in oklch, var(--gold) 20%, var(--muted))'
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">เวลาที่ขายดีที่สุด</CardTitle>
        <CardDescription className="text-xs">
          พีคไฮเอสต์: วัน{thaiDayShort(peakDay) === 'อา.' ? 'อาทิตย์' : thaiDayShort(peakDay) === 'จ.' ? 'จันทร์' : thaiDayShort(peakDay) === 'อ.' ? 'อังคาร' : thaiDayShort(peakDay) === 'พ.' ? 'พุธ' : thaiDayShort(peakDay) === 'พฤ.' ? 'พฤหัส' : thaiDayShort(peakDay) === 'ศ.' ? 'ศุกร์' : 'เสาร์'} เวลา {toThaiNumerals(peakHour)}:{toThaiNumerals('00')} น. ({toThaiNumerals(peakCount)} ออเดอร์)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            {/* Hour labels */}
            <div className="mb-1 flex pl-8">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-[9px] font-medium text-muted-foreground"
                >
                  {toThaiNumerals(h)}
                </div>
              ))}
            </div>
            {/* Rows */}
            <div className="space-y-1">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center gap-1">
                  <div className="w-7 shrink-0 text-right text-[10px] font-medium text-muted-foreground">
                    {thaiDayShort(day)}
                  </div>
                  <div className="flex flex-1 gap-1">
                    {HOURS.map((h) => {
                      const c = lookup.get(`${day}-${h}`) ?? 0
                      return (
                        <div
                          key={h}
                          title={`${thaiDayShort(day)} ${toThaiNumerals(h)}:00 — ${toThaiNumerals(c)} ออเดอร์`}
                          className={cn(
                            'h-6 flex-1 rounded-sm transition-transform hover:scale-110',
                            c === 0 && 'opacity-40'
                          )}
                          style={{ background: heatColor(c) }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
              <span>น้อย</span>
              {[0.2, 0.45, 0.7, 1].map((r) => (
                <span
                  key={r}
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{
                    background:
                      r === 1
                        ? 'var(--gold)'
                        : `color-mix(in oklch, var(--gold) ${r * 100}%, var(--muted))`,
                  }}
                />
              ))}
              <span>มาก</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
