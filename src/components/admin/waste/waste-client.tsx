'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import {
  Trash2, Plus, Download, AlertTriangle, Package, Percent, ListFilter,
  Search, User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageHeader, AdminKpiStrip, AdminMiniStat, AdminEmptyState } from '@/components/admin/admin-page-utils'
import { WasteFormDialog } from './waste-form-dialog'
import { wasteSourceConfig, CHART_PALETTE, toCsv, downloadCsv } from '@/lib/admin-ui'
import { formatBaht, formatThaiDate, formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type WasteLog = {
  id: string
  productId: string | null
  productName: string
  batchNo: string | null
  userId: string | null
  user: { name: string; role: string } | null
  source: string
  quantity: number
  unit: string
  value: number
  reason: string
  imageUrl: string | null
  createdAt: string
}

type WasteStats = {
  totalValue: number
  totalQty: number
  count: number
  wasteRatio: number
  monthRevenue: number
  topSource: string | null
  bySource: { source: string; value: number; count: number; qty: number }[]
  trend: { date: string; value: number; count: number }[]
  topProducts: { name: string; value: number; count: number; qty: number }[]
}

const SOURCES = [
  { value: 'all', label: 'ทุกแหล่งที่มา' },
  { value: 'PRODUCTION', label: 'การผลิต' },
  { value: 'EXPIRED', label: 'หมดอายุ' },
  { value: 'DAMAGED', label: 'ชำรุด' },
  { value: 'RETURNED', label: 'ถูกส่งคืน' },
  { value: 'TRANSPORT', label: 'ขนส่ง' },
]

const SOURCE_TH: Record<string, string> = {
  PRODUCTION: 'การผลิต',
  EXPIRED: 'หมดอายุ',
  DAMAGED: 'ชำรุด',
  RETURNED: 'ถูกส่งคืน',
  TRANSPORT: 'ขนส่ง',
}

export function WasteClient({ initialLogs }: { initialLogs: WasteLog[] }) {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = React.useState(false)
  const [sourceFilter, setSourceFilter] = React.useState('all')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [q, setQ] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<WasteLog | null>(null)

  const queryKey = React.useMemo(
    () => ['admin-waste', sourceFilter, from, to, q],
    [sourceFilter, from, to, q]
  )

  const { data, isLoading } = useQuery<{ logs: WasteLog[] }>({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (sourceFilter !== 'all') sp.set('source', sourceFilter)
      if (from) sp.set('from', from)
      if (to) sp.set('to', to)
      if (q) sp.set('q', q)
      const r = await fetch(`/api/admin/waste?${sp.toString()}`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { logs: initialLogs },
  })

  const { data: stats } = useQuery<WasteStats>({
    queryKey: ['admin-waste-stats'],
    queryFn: async () => {
      const r = await fetch('/api/admin/waste/stats?range=14')
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
  })

  const logs = data?.logs ?? []

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-waste'] })
    qc.invalidateQueries({ queryKey: ['admin-waste-stats'] })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const r = await fetch(`/api/admin/waste/${deleteTarget.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('ลบไม่สำเร็จ')
      toast.success('ลบบันทึกของเสียเรียบร้อย')
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const exportCsv = () => {
    const rows = logs.map((l) => ({
      date: formatThaiDate(new Date(l.createdAt), { short: true }),
      productName: l.productName,
      source: SOURCE_TH[l.source] ?? l.source,
      quantity: l.quantity,
      unit: l.unit,
      value: l.value,
      reason: l.reason,
      user: l.user?.name ?? '—',
    }))
    const csv = toCsv(rows, [
      { key: 'date', label: 'วันที่' },
      { key: 'productName', label: 'สินค้า' },
      { key: 'source', label: 'แหล่งที่มา' },
      { key: 'quantity', label: 'จำนวน' },
      { key: 'unit', label: 'หน่วย' },
      { key: 'value', label: 'มูลค่า' },
      { key: 'reason', label: 'เหตุผล' },
      { key: 'user', label: 'ผู้บันทึก' },
    ])
    downloadCsv(`waste-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="จัดการของเสีย"
        subtitle="บันทึก ติดตาม และวิเคราะห์ของเสียจากการผลิตและจัดส่ง"
        icon={Trash2}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]">
              <Plus className="h-4 w-4" /> บันทึกของเสีย
            </Button>
          </>
        }
      />

      <AdminKpiStrip>
        <AdminMiniStat label="มูลค่าเสียหายเดือนนี้" value={formatBaht(stats?.totalValue ?? 0)} icon={AlertTriangle} accent="red" />
        <AdminMiniStat label="อัตราของเสีย" value={`${toThaiNumerals((stats?.wasteRatio ?? 0).toFixed(1))}%`} sub={`ของยอดขาย ${formatBaht(stats?.monthRevenue ?? 0)}`} icon={Percent} accent="amber" />
        <AdminMiniStat label="รายการเดือนนี้" value={toThaiNumerals(stats?.count ?? 0)} icon={ListFilter} accent="gold" />
        <AdminMiniStat label="แหล่งที่มาหลัก" value={stats?.topSource ? SOURCE_TH[stats.topSource] ?? stats.topSource : '—'} icon={Package} accent="teal" />
        <AdminMiniStat label="จำนวนที่เสีย" value={`${toThaiNumerals(stats?.totalQty ?? 0)} หน่วย`} icon={Trash2} accent="forest" />
        <AdminMiniStat label="มูลค่า/รายการเฉลี่ย" value={formatBaht(stats && stats.count > 0 ? stats.totalValue / stats.count : 0)} icon={AlertTriangle} accent="gold" />
      </AdminKpiStrip>

      {/* Charts */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">ของเสียตามแหล่งที่มา (เดือนนี้)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {(stats?.bySource ?? []).length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">ไม่มีข้อมูล</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats?.bySource ?? []}
                      dataKey="value" nameKey="source"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                      paddingAngle={2}
                    >
                      {(stats?.bySource ?? []).map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, n: string) => [formatBaht(v), SOURCE_TH[n] ?? n]}
                      contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="flex-1 space-y-1.5 text-xs">
                  {(stats?.bySource ?? []).map((s, i) => (
                    <li key={s.source} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                      <span className="flex-1">{SOURCE_TH[s.source] ?? s.source}</span>
                      <span className="font-semibold">{formatBaht(s.value)}</span>
                      <span className="text-muted-foreground">({toThaiNumerals(s.count)})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">แนวโน้มของเสีย 14 วันล่าสุด</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => {
                    const parts = d.split('-')
                    return `${Number(parts[2])}/${Number(parts[1])}`
                  }}
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={50}
                  tickFormatter={(v: number) => formatBaht(v).replace('฿', '')}
                />
                <Tooltip
                  formatter={(v: number) => [formatBaht(v), 'มูลค่า']}
                  labelFormatter={(l: string) => formatThaiDate(new Date(l), { short: true })}
                  contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" fill="#C5A572" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top products wasted */}
      {stats && stats.topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">สินค้าที่เสียบ่อยที่สุด (เดือนนี้)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {stats.topProducts.map((p, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">{formatBaht(p.value)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {toThaiNumerals(p.qty)} หน่วย · {toThaiNumerals(p.count)} ครั้ง
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Search className="h-3.5 w-3.5" /> ตัวกรอง
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">จาก</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">ถึง</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[140px] text-xs" />
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาสินค้า, batch, เหตุผล"
            className="h-8 w-[220px] pl-7 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : logs.length === 0 ? (
        <AdminEmptyState
          icon={Trash2}
          title="ยังไม่มีบันทึกของเสีย"
          description="คลิก 'บันทึกของเสีย' เพื่อเริ่มบันทึก"
          action={<Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> บันทึกของเสีย</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">วันที่</th>
                  <th className="px-3 py-2.5 text-left font-medium">สินค้า</th>
                  <th className="px-3 py-2.5 text-left font-medium">แหล่งที่มา</th>
                  <th className="px-3 py-2.5 text-right font-medium">จำนวน</th>
                  <th className="px-3 py-2.5 text-right font-medium">มูลค่า</th>
                  <th className="px-3 py-2.5 text-left font-medium">เหตุผล</th>
                  <th className="px-3 py-2.5 text-left font-medium">ผู้บันทึก</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 100).map((l, i) => {
                  const cfg = wasteSourceConfig(l.source)
                  return (
                    <motion.tr
                      key={l.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.01, 0.2) }}
                      className="border-t hover:bg-muted/30"
                    >
                      <td className="px-3 py-2.5 text-xs">
                        <p>{formatThaiDate(new Date(l.createdAt), { short: true })}</p>
                        <p className="text-[10px] text-muted-foreground">{formatThaiDateTime(new Date(l.createdAt)).split(' ').slice(1).join(' ')}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{l.productName}</p>
                        {l.batchNo && <p className="font-mono text-[10px] text-muted-foreground">{l.batchNo}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn('text-[9px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {toThaiNumerals(l.quantity)} <span className="text-[10px] text-muted-foreground">{l.unit}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-red-600 dark:text-red-400">{formatBaht(l.value)}</td>
                      <td className="px-3 py-2.5">
                        <p className="max-w-[240px] truncate text-xs" title={l.reason}>{l.reason}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {l.user?.name ?? '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() => setDeleteTarget(l)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {logs.length > 100 && (
            <div className="border-t bg-muted/30 p-2 text-center text-[10px] text-muted-foreground">
              แสดง 100 จาก {toThaiNumerals(logs.length)} รายการ
            </div>
          )}
        </div>
      )}

      <WasteFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={refresh} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบบันทึกของเสีย?</AlertDialogTitle>
            <AlertDialogDescription>
              บันทึก "{deleteTarget?.productName}" ({formatBaht(deleteTarget?.value ?? 0)}) จะถูกลบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 text-white hover:bg-red-600">ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
