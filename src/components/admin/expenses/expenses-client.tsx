'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Receipt, Plus, Search, Pencil, Trash2, Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatBaht, formatNumber, formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import { ExpenseFormDialog, type ExpenseFormValues, type ExpenseRow } from './expense-form-dialog'

type Branch = { id: string; name: string; code: string; isMain: boolean }

// ---------- Category config ----------
type CatCfg = { label: string; emoji: string; cls: string; color: string }
const CATEGORY_CONFIG: Record<string, CatCfg> = {
  INGREDIENT: { label: 'วัตถุดิบ', emoji: '🌾', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30', color: '#C5A572' },
  UTILITY: { label: 'น้ำ/ไฟ/อินเทอร์เน็ต', emoji: '💡', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30', color: '#E8A33D' },
  MARKETING: { label: 'การตลาด', emoji: '📣', cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/30', color: '#E76F51' },
  SALARY: { label: 'เงินเดือน', emoji: '👥', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/30', color: '#1B3A2F' },
  RENT: { label: 'ค่าเช่า', emoji: '🏢', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30', color: '#7C9885' },
  OTHER: { label: 'อื่น ๆ', emoji: '📦', cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30', color: '#A0522D' },
}
function catConfig(c: string): CatCfg {
  return CATEGORY_CONFIG[c] ?? { label: c, emoji: '❓', cls: 'bg-muted text-muted-foreground ring-border', color: '#888' }
}

type Props = {
  branches: Branch[]
}

type TrendPoint = { date: string; label: string; amount: number }
type CategoryDatum = { category: string; label: string; amount: number; count: number; color: string }

type TooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: CategoryDatum | TrendPoint; value?: number }>
  label?: string
}

function DonutTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as CategoryDatum | undefined
  if (!d) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{d.label}</p>
      <p className="mt-0.5 font-bold text-[var(--gold)]">{formatBaht(d.amount)}</p>
      <p className="text-muted-foreground">{toThaiNumerals(d.count)} รายการ</p>
    </div>
  )
}

function BarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || label == null) return null
  const val = payload[0].value
  if (val == null) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="font-bold text-[var(--gold)]">{formatBaht(val)}</p>
    </div>
  )
}

export function ExpensesClient({ branches }: Props) {
  const qc = useQueryClient()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = React.useState(monthStart.toISOString().slice(0, 10))
  const [to, setTo] = React.useState(today.toISOString().slice(0, 10))
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [branchFilter, setBranchFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')

  const [creating, setCreating] = React.useState(false)
  const [editing, setEditing] = React.useState<ExpenseRow | null>(null)
  const [deleting, setDeleting] = React.useState<ExpenseRow | null>(null)

  const queryKey = React.useMemo(
    () => ['admin-expenses', from, to, categoryFilter, branchFilter, search],
    [from, to, categoryFilter, branchFilter, search]
  )

  const { data, isLoading } = useQuery<{
    expenses: ExpenseRow[]
    byCategory: { category: string; amount: number; count: number }[]
  }>({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (from) sp.set('from', from)
      if (to) sp.set('to', to)
      if (categoryFilter !== 'all') sp.set('category', categoryFilter)
      if (branchFilter !== 'all') sp.set('branchId', branchFilter)
      if (search) sp.set('search', search)
      const r = await fetch(`/api/admin/expenses?${sp.toString()}`, { cache: 'no-store' })
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
  })

  const expenses = data?.expenses ?? []
  const byCategory = data?.byCategory ?? []

  // ---- Derived stats ----
  const totalMonth = expenses.reduce((s, e) => s + e.amount, 0)
  const totalThisMonthCount = expenses.length

  const donutData: CategoryDatum[] = React.useMemo(() => {
    return byCategory.map((c) => {
      const cfg = catConfig(c.category)
      return { category: c.category, label: `${cfg.emoji} ${cfg.label}`, amount: c.amount, count: c.count, color: cfg.color }
    }).sort((a, b) => b.amount - a.amount)
  }, [byCategory])

  const trendData: TrendPoint[] = React.useMemo(() => {
    // last 14 days (from `to` going back)
    const days: TrendPoint[] = []
    const endTs = to ? new Date(to + 'T00:00:00').getTime() : Date.now()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(endTs - i * 86400000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const label = `${toThaiNumerals(d.getDate())}/${toThaiNumerals(d.getMonth() + 1)}`
      days.push({ date: key, label, amount: 0 })
    }
    const map = new Map(days.map((d) => [d.date, d]))
    for (const e of expenses) {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const row = map.get(key)
      if (row) row.amount += e.amount
    }
    return days
  }, [expenses, to])

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-expenses'] })

  // ---- Handlers ----
  async function handleSubmit(values: ExpenseFormValues, id?: string) {
    try {
      const url = id ? `/api/admin/expenses/${id}` : '/api/admin/expenses'
      const method = id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'บันทึกไม่สำเร็จ')
      }
      toast.success(id ? `อัปเดตค่าใช้จ่ายแล้ว` : `บันทึกค่าใช้จ่าย ${formatBaht(values.amount)} แล้ว`)
      setEditing(null)
      setCreating(false)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function handleDelete(e: ExpenseRow) {
    try {
      const res = await fetch(`/api/admin/expenses/${e.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'ลบไม่สำเร็จ')
      }
      toast.success(`ลบค่าใช้จ่าย "${e.description}" แล้ว`)
      setDeleting(null)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Breadcrumb + header */}
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">แดชบอร์ด</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>ค่าใช้จ่าย</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
              <Receipt className="h-6 w-6 text-[var(--gold)]" />
              ค่าใช้จ่าย
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              บันทึกและติดตามค่าใช้จ่ายของร้านตามหมวดหมู่
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
            onClick={() => setCreating(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            บันทึกค่าใช้จ่าย
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="รวมเดือนนี้" value={formatBaht(totalMonth)} loading={isLoading} accent="gold" />
        <KpiCard label="รายการเดือนนี้" value={formatNumber(totalThisMonthCount)} loading={isLoading} accent="cream" />
        <KpiCard label="หมวดทั้งหมด" value={formatNumber(byCategory.length)} loading={isLoading} accent="forest" />
        <KpiCard
          label="เฉลี่ย/รายการ"
          value={totalThisMonthCount > 0 ? formatBaht(totalMonth / totalThisMonthCount) : '฿0'}
          loading={isLoading}
          accent="terracotta"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-[var(--gold)]" />
              แยกตามหมวดหมู่
            </CardTitle>
            <CardDescription className="text-xs">
              รวม {formatBaht(donutData.reduce((s, d) => s + d.amount, 0))} • {toThaiNumerals(donutData.reduce((s, d) => s + d.count, 0))} รายการ
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : donutData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูลในช่วงที่เลือก
              </div>
            ) : (
              <>
                <div className="relative mx-auto h-[180px] w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius="62%"
                        outerRadius="92%"
                        paddingAngle={2}
                        stroke="var(--background)"
                        strokeWidth={2}
                      >
                        {donutData.map((d) => (
                          <Cell key={d.category} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">รวม</span>
                    <span className="text-sm font-bold">{formatBaht(totalMonth)}</span>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {donutData.map((d) => {
                    const pct = totalMonth > 0 ? (d.amount / totalMonth) * 100 : 0
                    return (
                      <li key={d.category} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
                        <span className="flex-1 truncate">{d.label}</span>
                        <span className="font-semibold tabular-nums">{formatBaht(d.amount)}</span>
                        <span className="w-10 text-right text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">แนวโน้ม 14 วันล่าสุด</CardTitle>
            <CardDescription className="text-xs">
              รวม {formatBaht(trendData.reduce((s, d) => s + d.amount, 0))} • สูงสุด {formatBaht(trendData.length ? Math.max(...trendData.map((d) => d.amount)) : 0)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : formatNumber(v))}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--gold)', fillOpacity: 0.1 }} />
                    <Bar dataKey="amount" fill="var(--gold)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหารายละเอียดค่าใช้จ่าย..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="lg:w-[150px]" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="lg:w-[150px]" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="หมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([k, c]) => (
                    <SelectItem key={k} value={k}>
                      {c.emoji} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="สาขา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสาขา</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[110px]">วันที่</TableHead>
                  <TableHead className="w-[150px]">หมวดหมู่</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead className="hidden md:table-cell">สาขา</TableHead>
                  <TableHead className="hidden lg:table-cell">ผู้บันทึก</TableHead>
                  <TableHead className="text-right">จำนวนเงิน</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <EmptyState emoji="🧾" title="ยังไม่มีค่าใช้จ่ายในช่วงที่เลือก" desc="ลองปรับช่วงวันที่หรือเพิ่มค่าใช้จ่ายใหม่" />
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((e, idx) => {
                    const cfg = catConfig(e.category)
                    return (
                      <motion.tr
                        key={e.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.015, 0.15) }}
                        className="hover:bg-muted/40"
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {formatThaiDate(new Date(e.date), { short: true })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ring-1 ring-inset ${cfg.cls}`}>
                            {cfg.emoji} {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{e.description}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {e.branchName ?? '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {e.userName ?? '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-[var(--gold)]">
                          {formatBaht(e.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(e)} title="แก้ไข">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                              onClick={() => setDeleting(e)}
                              title="ลบ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {expenses.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">
                แสดง {toThaiNumerals(expenses.length)} รายการ • รวม {formatBaht(totalMonth)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {(creating || editing) && (
        <ExpenseFormDialog
          open
          onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}
          expense={editing ?? undefined}
          branches={branches}
          onSubmit={handleSubmit}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบรายการค่าใช้จ่ายนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.description}&quot; ({deleting ? formatBaht(deleting.amount) : ''}) จะถูกลบถาวร — ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleting && handleDelete(deleting)}
            >
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------- Sub-components ----------------

function KpiCard({
  label, value, loading, accent,
}: {
  label: string
  value: string
  loading: boolean
  accent: 'gold' | 'forest' | 'cream' | 'terracotta'
}) {
  const accentClass = {
    gold: 'text-[var(--gold)]',
    forest: 'text-[var(--forest)] dark:text-emerald-400',
    cream: 'text-amber-700 dark:text-amber-300',
    terracotta: 'text-orange-600 dark:text-orange-400',
  }[accent]
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-20" />
        ) : (
          <p className={`mt-1 text-xl font-bold tabular-nums md:text-2xl ${accentClass}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold)]/10 text-4xl">
        {emoji}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  )
}

// Note: dynamic import not strictly needed here (recharts is loaded eagerly),
// but kept for future code-splitting compatibility.
void dynamic
