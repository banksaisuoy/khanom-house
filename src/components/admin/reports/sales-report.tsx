'use client'

import * as React from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, ShoppingBag, Wallet, Percent } from 'lucide-react'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'

const CHANNEL_TH: Record<string, string> = {
  POS: 'POS หน้าร้าน', WEBSITE: 'เว็บไซต์', LINE: 'LINE', GRAB: 'GRAB', PHONE: 'โทร', CATERING: 'Catering',
}
const TYPE_TH: Record<string, string> = {
  WALK_IN: 'เข้าร้าน', DELIVERY: 'จัดส่ง', PICKUP: 'รับเอง', CATERING: 'Catering', PREORDER: 'สั่งล่วงหน้า',
}

const COMPLETED = ['COMPLETED', 'DELIVERED', 'PAID']

export function SalesReport({ data, isLoading }: {
  data: {
    totalRevenue: number
    totalOrders: number
    avgBasket: number
    trend: { date: string; revenue: number; orders: number; profit: number }[]
    byChannel: { channel: string; revenue: number; count: number }[]
    byType: { type: string; revenue: number; count: number }[]
    peakHours: { day: number; hour: number; count: number }[]
  } | null
  isLoading: boolean
}) {
  if (isLoading || !data) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const conversion = data.totalOrders > 0 ? 65 + (data.totalRevenue % 10) : 0 // mock

  const peakArr = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const p of data.peakHours) peakArr[p.day][p.hour] = p.count
  const maxCount = Math.max(1, ...peakArr.flat())

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Wallet} label="ยอดขายรวม" value={formatBaht(data.totalRevenue)} accent="gold" />
        <Kpi icon={ShoppingBag} label="จำนวนออเดอร์" value={toThaiNumerals(data.totalOrders)} accent="forest" />
        <Kpi icon={TrendingUp} label="ยอดเฉลี่ย/ออเดอร์" value={formatBaht(data.avgBasket)} accent="teal" />
        <Kpi icon={Percent} label="Conversion (mock)" value={`${toThaiNumerals(conversion.toFixed(0))}%`} accent="amber" />
      </div>

      {/* Revenue trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">แนวโน้มยอดขาย</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C5A572" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#C5A572" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profit-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1B3A2F" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#1B3A2F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                axisLine={false} tickLine={false}
                tickFormatter={(d: string) => {
                  const parts = d.split('-')
                  if (parts.length === 3) return `${Number(parts[2])}/${Number(parts[1])}`
                  if (parts.length === 2) return `${Number(parts[1])}/${parts[0].slice(2)}`
                  return d
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={60}
                tickFormatter={(v: number) => formatBaht(v).replace('฿', '')}
              />
              <Tooltip
                formatter={(v: number, n: string) => [formatBaht(v), n === 'revenue' ? 'ยอดขาย' : n === 'profit' ? 'กำไร' : 'ออเดอร์']}
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#C5A572" strokeWidth={2} fill="url(#rev-grad)" />
              <Area type="monotone" dataKey="profit" stroke="#1B3A2F" strokeWidth={2} fill="url(#profit-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* By channel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">ยอดขายตามช่องทาง</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byChannel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => formatBaht(v).replace('฿', '')}
                />
                <YAxis type="category" dataKey="channel" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={70}
                  tickFormatter={(v: string) => CHANNEL_TH[v] ?? v}
                />
                <Tooltip
                  formatter={(v: number) => [formatBaht(v), 'ยอดขาย']}
                  labelFormatter={(l: string) => CHANNEL_TH[l] ?? l}
                  contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#C5A572" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak hours heatmap */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">พีกชั่วโมงขาย (Heatmap)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <div className="grid" style={{ gridTemplateColumns: '24px repeat(24, 1fr)' }}>
                  <div></div>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="text-center text-[8px] text-muted-foreground">{h}</div>
                  ))}
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, di) => (
                    <React.Fragment key={di}>
                      <div className="text-right pr-1 text-[10px] text-muted-foreground">{day}</div>
                      {peakArr[di].map((count, hi) => {
                        const intensity = count / maxCount
                        const bg = count === 0 ? 'var(--muted)' : `rgba(197, 165, 114, ${0.15 + intensity * 0.85})`
                        return (
                          <div
                            key={hi}
                            title={`${day} ${hi}:00 — ${count} ออเดอร์`}
                            className="aspect-square rounded-sm"
                            style={{ background: bg }}
                          />
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
              น้อย
              <div className="h-2 w-8 rounded-sm" style={{ background: 'linear-gradient(to right, rgba(197,165,114,0.15), rgba(197,165,114,1))' }} />
              มาก
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By order type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">ยอดขายตามประเภทออเดอร์</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {data.byType.length === 0 ? (
              <p className="col-span-5 py-6 text-center text-xs text-muted-foreground">ไม่มีข้อมูล</p>
            ) : data.byType.map((t) => (
              <div key={t.type} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{TYPE_TH[t.type] ?? t.type}</p>
                <p className="mt-1 text-base font-bold text-[var(--gold)]">{formatBaht(t.revenue)}</p>
                <p className="text-[10px] text-muted-foreground">{toThaiNumerals(t.count)} ออเดอร์</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  const accents: Record<string, string> = {
    gold: 'text-[var(--gold)] bg-[var(--gold)]/10',
    forest: 'text-[var(--forest)] dark:text-emerald-400 bg-[var(--forest)]/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10',
  }
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accents[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1.5 text-lg font-bold">{value}</p>
    </div>
  )
}
