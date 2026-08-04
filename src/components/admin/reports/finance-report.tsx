'use client'

import * as React from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp, TrendingDown, Wallet, Percent, Receipt, Coins,
  ArrowRight, ArrowDown,
} from 'lucide-react'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { CHART_PALETTE } from '@/lib/admin-ui'
import { cn } from '@/lib/utils'

export type FinanceReportData = {
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  expenses: { label: string; key: string; value: number }[]
  totalExpenses: number
  netProfit: number
  netMargin: number
  vat: { output: number; input: number; net: number }
  wasteValue: number
  marginTrend: { date: string; revenue: number; cogs: number; profit: number; waste: number; margin: number }[]
}

export function FinanceReport({ data, isLoading }: { data: FinanceReportData | null; isLoading: boolean }) {
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

  const expenseForChart = data.expenses.filter((e) => e.value > 0)
  const netPositive = data.netProfit >= 0

  return (
    <div className="space-y-4">
      {/* P&L card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">งบกำไรขาดทุน (P&L)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-5">
            {/* Revenue */}
            <div className="rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Wallet className="h-3 w-3" /> รายได้
              </div>
              <p className="mt-1 text-lg font-bold text-[var(--gold)]">{formatBaht(data.revenue)}</p>
            </div>
            {/* COGS */}
            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ArrowDown className="h-3 w-3" /> ต้นทุนสินค้า
              </div>
              <p className="mt-1 text-lg font-bold text-red-500">{formatBaht(data.cogs)}</p>
            </div>
            {/* Gross */}
            <div className="rounded-xl border border-[var(--forest)]/30 bg-[var(--forest)]/5 p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ArrowRight className="h-3 w-3" /> กำไรขั้นต้น
              </div>
              <p className="mt-1 text-lg font-bold text-[var(--forest)] dark:text-emerald-400">{formatBaht(data.grossProfit)}</p>
              <p className="text-[9px] text-muted-foreground">Margin {toThaiNumerals(data.grossMargin)}%</p>
            </div>
            {/* Expenses */}
            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ArrowDown className="h-3 w-3" /> ค่าใช้จ่ายอื่น
              </div>
              <p className="mt-1 text-lg font-bold text-amber-500">{formatBaht(data.totalExpenses)}</p>
            </div>
            {/* Net */}
            <div className={cn(
              'rounded-xl border p-3',
              netPositive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
            )}>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Coins className="h-3 w-3" /> กำไรสุทธิ
              </div>
              <p className={cn('mt-1 text-lg font-bold', netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                {formatBaht(data.netProfit)}
              </p>
              <p className="text-[9px] text-muted-foreground">Net {toThaiNumerals(data.netMargin)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Margin trend + Expense pie */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-[var(--gold)]" /> แนวโน้มกำไร & ของเสีย
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.marginTrend}>
                <defs>
                  <linearGradient id="profit-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B3A2F" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#1B3A2F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="waste-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E76F51" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#E76F51" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                  tickFormatter={(d: string) => { const p = d.split('-'); return p.length === 3 ? `${Number(p[2])}/${Number(p[1])}` : d }}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={60}
                  tickFormatter={(v: number) => formatBaht(v).replace('฿', '')}
                />
                <Tooltip
                  formatter={(v: number, n: string) => [formatBaht(v), n === 'profit' ? 'กำไร' : n === 'waste' ? 'ของเสีย' : n]}
                  contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => v === 'profit' ? 'กำไร' : v === 'waste' ? 'ของเสีย' : v} />
                <Area type="monotone" dataKey="profit" stroke="#1B3A2F" strokeWidth={2} fill="url(#profit-area)" />
                <Area type="monotone" dataKey="waste" stroke="#E76F51" strokeWidth={2} fill="url(#waste-area)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Percent className="h-4 w-4 text-[var(--forest)] dark:text-emerald-400" /> สัดส่วนค่าใช้จ่าย
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expenseForChart} dataKey="value" nameKey="label"
                  innerRadius={45} outerRadius={85} paddingAngle={2}>
                  {expenseForChart.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatBaht(v), '']}
                  contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* VAT summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="h-4 w-4 text-[var(--gold)]" /> สรุปภาษีมูลค่าเพิ่ม (VAT 7%)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-3">
              <p className="text-[10px] text-muted-foreground">VAT ขา output</p>
              <p className="mt-1 text-lg font-bold text-[var(--gold)]">{formatBaht(data.vat.output)}</p>
              <p className="text-[9px] text-muted-foreground">ภาษีขาย (7% ของรายได้)</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-[10px] text-muted-foreground">VAT ขา input</p>
              <p className="mt-1 text-lg font-bold text-amber-500">{formatBaht(data.vat.input)}</p>
              <p className="text-[9px] text-muted-foreground">ภาษีซื้อ (7% ของค่าใช้จ่าย)</p>
            </div>
            <div className="rounded-xl border border-[var(--forest)]/30 bg-[var(--forest)]/5 p-3">
              <p className="text-[10px] text-muted-foreground">VAT สุทธิต้องชำระ</p>
              <p className="mt-1 text-lg font-bold text-[var(--forest)] dark:text-emerald-400">{formatBaht(data.vat.net)}</p>
              <p className="text-[9px] text-muted-foreground">output − input</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-xs text-muted-foreground">มูลค่าของเสียรวม (ต้นทุนที่สูญเสีย)</span>
            <Badge variant="outline" className="text-red-500">{formatBaht(data.wasteValue)}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
