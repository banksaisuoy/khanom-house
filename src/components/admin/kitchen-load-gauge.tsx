'use client'

import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { Flame, Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatNumber, toThaiNumerals } from '@/lib/thai-date'

type KitchenLoad = {
  queued: number
  cooking: number
  qc: number
  capacity: number
  active: number
}

export function KitchenLoadGauge({ load }: { load: KitchenLoad }) {
  const used = load.active
  const pct = load.capacity > 0 ? Math.min(100, (used / load.capacity) * 100) : 0
  const data = [{ name: 'load', value: pct, fill: 'var(--gold)' }]

  const statusLabel =
    pct >= 90 ? 'เต็มกำลังการ' : pct >= 60 ? 'โหลดสูง' : pct >= 30 ? 'ปานกลาง' : 'ว่าง'
  const statusColor =
    pct >= 90
      ? 'text-red-600 dark:text-red-400'
      : pct >= 60
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400'

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ภาระครัว / กำลังผลิต</CardTitle>
        <CardDescription className="text-xs">
          กำลังผลิต {formatNumber(used)} / {formatNumber(load.capacity)} คิว
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center gap-4">
          <div className="relative h-[140px] w-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={data}
                startAngle={220}
                endAngle={-40}
                innerRadius="72%"
                outerRadius="100%"
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  background={{ fill: 'var(--muted)' }}
                  dataKey="value"
                  cornerRadius={12}
                  fill="var(--gold)"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-[var(--forest)] dark:text-[var(--gold)]">
                {toThaiNumerals(Math.round(pct))}%
              </span>
              <span className={`text-[10px] font-medium ${statusColor}`}>{statusLabel}</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium">รอคิว</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{toThaiNumerals(load.queued)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-medium">กำลังทำ</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{toThaiNumerals(load.cooking)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium">QC</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{toThaiNumerals(load.qc)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
