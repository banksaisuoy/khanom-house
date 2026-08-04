'use client'

import * as React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Users, Repeat, TrendingUp, Crown, UserPlus, UserCheck } from 'lucide-react'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { tierConfig } from '@/lib/admin-ui'
import { cn } from '@/lib/utils'

export type CustomerReportData = {
  totals: {
    totalCustomers: number
    activeCustomers: number
    newCustomers: number
    returningCustomers: number
    repeatRate: number
    retention: number
  }
  newVsReturning: { date: string; new: number; returning: number }[]
  topCustomers: { id: string; name: string; tier: string; totalSpent: number; visitCount: number; points: number }[]
  tierDist: { tier: string; count: number }[]
}

export function CustomerReport({ data, isLoading }: { data: CustomerReportData | null; isLoading: boolean }) {
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

  const t = data.totals
  const tierChart = data.tierDist.map((td) => ({
    ...td,
    label: tierConfig(td.tier).label,
    cls: tierConfig(td.tier).cls,
  }))

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Mini icon={Users} label="ลูกค้ารวม" value={toThaiNumerals(t.totalCustomers)} accent="gold" />
        <Mini icon={UserCheck} label="ลูกค้าใช้งาน" value={toThaiNumerals(t.activeCustomers)} accent="forest" />
        <Mini icon={UserPlus} label="ลูกค้าใหม่" value={toThaiNumerals(t.newCustomers)} accent="teal" />
        <Mini icon={Repeat} label="กลับมาซื้อ" value={toThaiNumerals(t.returningCustomers)} accent="amber" />
        <Mini icon={TrendingUp} label="อัตราซื้อซ้ำ" value={`${toThaiNumerals(t.repeatRate.toFixed(0))}%`} accent="gold" />
        <Mini icon={Crown} label="Retention" value={`${toThaiNumerals(t.retention.toFixed(0))}%`} accent="forest" />
      </div>

      {/* New vs Returning */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">ลูกค้าใหม่ vs กลับมาซื้อ (Stacked)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.newVsReturning}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                tickFormatter={(d: string) => {
                  const parts = d.split('-')
                  return parts.length === 3 ? `${Number(parts[2])}/${Number(parts[1])}` : d
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                formatter={(v: number, n: string) => [`${toThaiNumerals(v)} คน`, n === 'new' ? 'ลูกค้าใหม่' : 'กลับมาซื้อ']}
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => v === 'new' ? 'ลูกค้าใหม่' : 'กลับมาซื้อ'} />
              <Bar dataKey="new" stackId="a" fill="#C5A572" radius={[0, 0, 0, 0]} />
              <Bar dataKey="returning" stackId="a" fill="#1B3A2F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Top customers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-[var(--gold)]" /> Top 10 ลูกค้ายอดสูงสุด
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ลูกค้า</TableHead>
                  <TableHead className="text-xs">Tier</TableHead>
                  <TableHead className="text-right text-xs">ยอดซื้อ</TableHead>
                  <TableHead className="text-right text-xs">เข้ามา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topCustomers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">ไม่มีข้อมูล</TableCell></TableRow>
                ) : data.topCustomers.map((c, i) => {
                  const tc = tierConfig(c.tier)
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">
                        <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[9px] font-bold text-[var(--gold)]">{i + 1}</span>
                        {c.name}
                      </TableCell>
                      <TableCell><Badge className={cn('text-[9px] ring-1 ring-inset', tc.cls)}>{tc.label}</Badge></TableCell>
                      <TableCell className="text-right text-xs font-semibold text-[var(--gold)]">{formatBaht(c.totalSpent)}</TableCell>
                      <TableCell className="text-right text-xs">{toThaiNumerals(c.visitCount)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tier distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">การกระจายตาม Tier</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {tierChart.map((t) => {
                const total = tierChart.reduce((s, x) => s + x.count, 0) || 1
                const pct = (t.count / total) * 100
                const colors: Record<string, string> = {
                  BRONZE: '#92400E',
                  SILVER: '#64748B',
                  GOLD: '#C5A572',
                  VIP: '#1B3A2F',
                }
                return (
                  <div key={t.tier}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-muted-foreground">{toThaiNumerals(t.count)} ({toThaiNumerals(pct.toFixed(0))}%)</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: colors[t.tier] ?? '#C5A572' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs">
              <p className="font-medium">อัตราซื้อซ้ำ</p>
              <p className="mt-1 text-muted-foreground">
                จากลูกค้าที่เคยซื้อ {toThaiNumerals(t.activeCustomers)} ราย มี {toThaiNumerals(t.returningCustomers)} รายที่กลับมาซื้อซ้ำในช่วงนี้ ({toThaiNumerals(t.repeatRate.toFixed(0))}%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Mini({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  const accents: Record<string, string> = {
    gold: 'text-[var(--gold)] bg-[var(--gold)]/10',
    forest: 'text-[var(--forest)] dark:text-emerald-400 bg-[var(--forest)]/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10',
  }
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accents[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1.5 text-lg font-bold">{value}</p>
    </div>
  )
}
