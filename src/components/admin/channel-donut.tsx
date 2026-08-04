'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBaht } from '@/lib/thai-date'

type ChannelDatum = { channel: string; label: string; amount: number; count: number }

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload?: ChannelDatum }>
}

const CHANNEL_COLORS: Record<string, string> = {
  POS: 'var(--chart-1)', // gold
  WEBSITE: 'var(--chart-2)', // forest
  LINE: 'var(--chart-3)', // cream-brown
  GRAB: 'var(--chart-4)', // terracotta
  PHONE: 'var(--chart-5)', // deep green
  CATERING: '#9c6b3f',
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (!d) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{d.label}</p>
      <p className="mt-0.5 font-bold text-[var(--gold)]">{formatBaht(d.amount)}</p>
      <p className="text-muted-foreground">{d.count} ออเดอร์</p>
    </div>
  )
}

export function ChannelDonut({ data }: { data: ChannelDatum[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0)
  const safeData = data.length > 0 ? data : [{ channel: 'NONE', label: 'ไม่มีข้อมูล', amount: 1, count: 0 }]

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ยอดขายตามช่องทาง</CardTitle>
        <CardDescription className="text-xs">
          รวม {formatBaht(total)} • {data.reduce((s, d) => s + d.count, 0)} ออเดอร์
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="relative mx-auto h-[180px] w-full max-w-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={safeData}
                dataKey="amount"
                nameKey="label"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                stroke="var(--background)"
                strokeWidth={2}
              >
                {safeData.map((d) => (
                  <Cell key={d.channel} fill={CHANNEL_COLORS[d.channel] ?? 'var(--muted-foreground)'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-muted-foreground">รวม</span>
            <span className="text-sm font-bold">{formatBaht(total).replace('฿', '฿')}</span>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {data.map((d) => {
            const pct = total > 0 ? (d.amount / total) * 100 : 0
            return (
              <li key={d.channel} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: CHANNEL_COLORS[d.channel] ?? 'var(--muted-foreground)' }}
                />
                <span className="flex-1 truncate">{d.label}</span>
                <span className="font-semibold tabular-nums">{formatBaht(d.amount)}</span>
                <span className="w-10 text-right text-muted-foreground tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
