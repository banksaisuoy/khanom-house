'use client'

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBaht, formatNumber, toThaiNumerals } from '@/lib/thai-date'

type BestSeller = { name: string; soldCount: number; revenue: number; stock: number }

// Recharts passes `active`, `payload`, and `label` to tooltip content props.
// We type them loosely here (recharts' own TooltipProps is generic over the
// data shape) and narrow `payload[0].payload` to our BestSeller type below.
interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload?: BestSeller }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (!d) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{d.name}</p>
      <p className="mt-0.5">ขายแล้ว {formatNumber(d.soldCount)} ชิ้น</p>
      <p className="font-bold text-[var(--gold)]">{formatBaht(d.revenue)}</p>
    </div>
  )
}

export function BestSellersChart({ data }: { data: BestSeller[] }) {
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.name.length > 12 ? d.name.slice(0, 10) + '…' : d.name,
  }))
  const max = Math.max(1, ...data.map((d) => d.soldCount))

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">สินค้าขายดี Top 5</CardTitle>
        <CardDescription className="text-xs">เรียงตามจำนวนที่ขาย</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              barCategoryGap={12}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatNumber(v)}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                tick={{ fontSize: 11, fill: 'var(--foreground)' }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
              <Bar dataKey="soldCount" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {chartData.map((d, i) => {
                  const ratio = d.soldCount / max
                  return (
                    <Cell
                      key={d.name}
                      fill={
                        ratio > 0.75
                          ? 'var(--gold)'
                          : ratio > 0.5
                            ? 'color-mix(in oklch, var(--gold) 75%, var(--muted))'
                            : ratio > 0.25
                              ? 'color-mix(in oklch, var(--gold) 45%, var(--muted))'
                              : 'color-mix(in oklch, var(--gold) 25%, var(--muted))'
                      }
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
