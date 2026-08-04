'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatBaht, formatNumber, toThaiNumerals } from '@/lib/thai-date'

type TrendPoint = { date: string; revenue: number; profit: number; orders: number }
type Metric = 'revenue' | 'profit' | 'orders'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  metric: Metric
}

const METRIC_LABEL: Record<Metric, string> = {
  revenue: 'ยอดขาย',
  profit: 'กำไร',
  orders: 'จำนวนออเดอร์',
}

function formatTooltipDate(iso: string): string {
  const d = new Date(iso)
  return `${toThaiNumerals(d.getDate())}/${toThaiNumerals(d.getMonth() + 1)}`
}

function CustomTooltip({ active, payload, label, metric }: TooltipProps) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  if (val == null || label == null) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-muted-foreground">{formatTooltipDate(label)}</p>
      <p className="font-bold">
        {METRIC_LABEL[metric]}:{' '}
        {metric === 'orders' ? formatNumber(val) + ' รายการ' : formatBaht(val)}
      </p>
    </div>
  )
}

export function SalesTrendChart({ data }: { data: TrendPoint[] }) {
  const [metric, setMetric] = React.useState<Metric>('revenue')

  const chartData = React.useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        value: d[metric],
      })),
    [data, metric]
  )

  const total = chartData.reduce((s, d) => s + d.value, 0)
  const peak = chartData.length ? Math.max(...chartData.map((d) => d.value)) : 0

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">แนวโน้มยอดขาย</CardTitle>
            <CardDescription className="text-xs">
              รวม {metric === 'orders' ? `${formatNumber(total)} รายการ` : formatBaht(total)} •
              สูงสุด {metric === 'orders' ? `${formatNumber(peak)}` : formatBaht(peak)}
            </CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={metric}
            onValueChange={(v) => v && setMetric(v as Metric)}
            className="rounded-lg border bg-muted/40 p-0.5"
            size="sm"
          >
            <ToggleGroupItem value="revenue" className="h-7 px-3 text-xs">
              ยอดขาย
            </ToggleGroupItem>
            <ToggleGroupItem value="profit" className="h-7 px-3 text-xs">
              กำไร
            </ToggleGroupItem>
            <ToggleGroupItem value="orders" className="h-7 px-3 text-xs">
              ออเดอร์
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="sales-trend-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return `${toThaiNumerals(d.getDate())}/${toThaiNumerals(d.getMonth() + 1)}`
                }}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) =>
                  metric === 'orders' ? formatNumber(v) : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : formatNumber(v)
                }
              />
              <Tooltip
                content={<CustomTooltip metric={metric} />}
                cursor={{ stroke: 'var(--gold)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--gold)"
                strokeWidth={2}
                fill="url(#sales-trend-grad)"
                activeDot={{ r: 4, fill: 'var(--gold)', stroke: 'var(--background)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
