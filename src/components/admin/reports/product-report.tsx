'use client'

import * as React from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Award, TrendingDown, Boxes, PieChart as PieIcon } from 'lucide-react'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { CHART_PALETTE } from '@/lib/admin-ui'

export type ProductReportData = {
  bestSellers: { productId: string; name: string; qty: number; revenue: number; cost: number; profit: number }[]
  worstSellers: { productId: string; name: string; qty: number; revenue: number; cost: number; profit: number }[]
  byCategory: { name: string; revenue: number; qty: number; count: number }[]
  stockMovement: { productId: string; name: string; sku: string; soldCount: number; stock: number; price: number }[]
}

export function ProductReport({ data, isLoading }: { data: ProductReportData | null; isLoading: boolean }) {
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

  return (
    <div className="space-y-4">
      {/* Best sellers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-[var(--gold)]" /> สินค้าขายดี (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.bestSellers} layout="vertical" margin={{ left: 20 }}>
              <defs>
                <linearGradient id="best-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#C5A572" />
                  <stop offset="100%" stopColor="#E8A33D" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => formatBaht(v).replace('฿', '')}
              />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={120}
                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
              />
              <Tooltip
                formatter={(v: number, n: string) => [formatBaht(v), n === 'revenue' ? 'ยอดขาย' : n === 'profit' ? 'กำไร' : 'จำนวน']}
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="url(#best-grad)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Best sellers table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-[var(--gold)]" /> ตารางสินค้าขายดี
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">สินค้า</TableHead>
                  <TableHead className="text-right text-xs">จำนวน</TableHead>
                  <TableHead className="text-right text-xs">ยอดขาย</TableHead>
                  <TableHead className="text-right text-xs">กำไร</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bestSellers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">ไม่มีข้อมูล</TableCell></TableRow>
                ) : data.bestSellers.slice(0, 8).map((p, i) => (
                  <TableRow key={p.productId}>
                    <TableCell className="text-xs">
                      <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[9px] font-bold text-[var(--gold)]">{i + 1}</span>
                      {p.name}
                    </TableCell>
                    <TableCell className="text-right text-xs">{toThaiNumerals(p.qty)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatBaht(p.revenue)}</TableCell>
                    <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400">{formatBaht(p.profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Category pie */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieIcon className="h-4 w-4 text-[var(--forest)] dark:text-emerald-400" /> สัดส่วนยอดขายตามหมวด
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.byCategory}
                  dataKey="revenue" nameKey="name"
                  innerRadius={50} outerRadius={90} paddingAngle={2}
                  label={({ name, percent }: { name: string; percent?: number }) =>
                    `${name.length > 10 ? name.slice(0, 10) + '…' : name} ${(((percent ?? 0)) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.byCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatBaht(v), 'ยอดขาย']}
                  contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Worst sellers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-red-500" /> สินค้าไม่ขาย (รอ 30 วัน)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.worstSellers.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">ทุกสินค้ามียอดขายในช่วงเวลานี้</p>
            ) : (
              <ul className="space-y-1">
                {data.worstSellers.slice(0, 8).map((p, i) => (
                  <li key={p.productId} className="flex items-center gap-2 rounded-lg border p-2 text-xs">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-bold text-red-500">{i + 1}</span>
                    <span className="truncate">{p.name}</span>
                    <Badge variant="outline" className="ml-auto text-[9px] text-red-500">ไม่มียอด</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Stock movement */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Boxes className="h-4 w-4 text-amber-500" /> สินค้าที่ขายออกตลอดกาล (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">สินค้า</TableHead>
                  <TableHead className="text-right text-xs">ขายแล้ว</TableHead>
                  <TableHead className="text-right text-xs">สต็อก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.stockMovement.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">ไม่มีข้อมูล</TableCell></TableRow>
                ) : data.stockMovement.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="text-xs">{p.name}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{toThaiNumerals(p.soldCount)}</TableCell>
                    <TableCell className="text-right text-xs">
                      <span className={p.stock < 10 ? 'text-red-500 font-semibold' : ''}>{toThaiNumerals(p.stock)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
