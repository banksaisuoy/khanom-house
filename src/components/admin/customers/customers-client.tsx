'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, Plus, Crown, Star, UserPlus, Wallet, Repeat, Cake, Search,
  Download, Filter, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminPageHeader, AdminKpiStrip, AdminMiniStat, AdminEmptyState } from '@/components/admin/admin-page-utils'
import { CustomerFormDialog } from './customer-form-dialog'
import { CustomerDetailSheet, type CustomerListItem } from './customer-detail-sheet'
import { tierConfig, avatarInitials, toCsv, downloadCsv, TIER_RULES } from '@/lib/admin-ui'
import { formatBaht, formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

const TIERS = [
  { value: 'all', label: 'ทุกระดับ' },
  { value: 'BRONZE', label: 'Bronze' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'VIP', label: 'VIP' },
]

export function CustomersClient({ initialCustomers }: { initialCustomers: CustomerListItem[] }) {
  const qc = useQueryClient()
  const [tierFilter, setTierFilter] = React.useState('all')
  const [q, setQ] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Partial<{ id: string; name: string; phone: string; email: string; tier: string; points: number; birthday: string; notes: string }> | undefined>(undefined)
  const [detail, setDetail] = React.useState<CustomerListItem | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  const { data, isLoading } = useQuery<{ customers: CustomerListItem[] }>({
    queryKey: ['admin-customers', tierFilter, q],
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (tierFilter !== 'all') sp.set('tier', tierFilter)
      if (q) sp.set('q', q)
      const r = await fetch(`/api/admin/customers?${sp.toString()}`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { customers: initialCustomers },
  })

  const customers = data?.customers ?? []

  // KPIs
  const kpis = React.useMemo(() => {
    const all = customers
    const vip = all.filter((c) => c.tier === 'VIP').length
    const gold = all.filter((c) => c.tier === 'GOLD').length
    const now = new Date()
    const newThisMonth = all.filter((c) => {
      const d = new Date(c.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const avgSpend = all.length > 0 ? all.reduce((s, c) => s + c.totalSpent, 0) / all.length : 0
    const repeat = all.filter((c) => c.visitCount > 1).length
    const repeatRate = all.length > 0 ? (repeat / all.length) * 100 : 0
    return { all: all.length, vip, gold, newThisMonth, avgSpend, repeatRate }
  }, [customers])

  // Tier distribution
  const tierDist = React.useMemo(() => {
    const dist = { BRONZE: 0, SILVER: 0, GOLD: 0, VIP: 0 }
    for (const c of customers) {
      if (dist[c.tier as keyof typeof dist] !== undefined) dist[c.tier as keyof typeof dist]++
    }
    return dist
  }, [customers])

  // Birthday this month
  const birthdayThisMonth = React.useMemo(() => {
    const m = new Date().getMonth()
    return customers
      .filter((c) => c.birthday && new Date(c.birthday).getMonth() === m)
      .sort((a, b) => {
        const da = new Date(a.birthday!).getDate()
        const db = new Date(b.birthday!).getDate()
        return da - db
      })
  }, [customers])

  const openCreate = () => { setEditTarget(undefined); setFormOpen(true) }
  const openEdit = (c: CustomerListItem) => {
    setEditTarget({
      id: c.id, name: c.name, phone: c.phone, email: c.email ?? '',
      tier: c.tier, points: c.points, birthday: c.birthday ?? '', notes: c.notes ?? '',
    })
    setFormOpen(true)
  }
  const openDetail = (c: CustomerListItem) => {
    setDetail(c)
    setDetailOpen(true)
  }
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-customers'] })

  const exportCsv = () => {
    const rows = customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email ?? '',
      tier: c.tier,
      points: c.points,
      totalSpent: c.totalSpent,
      visitCount: c.visitCount,
      birthday: c.birthday ? formatThaiDate(new Date(c.birthday), { short: true }) : '',
      createdAt: formatThaiDate(new Date(c.createdAt), { short: true }),
    }))
    const csv = toCsv(rows, [
      { key: 'name', label: 'ชื่อ' },
      { key: 'phone', label: 'เบอร์' },
      { key: 'email', label: 'อีเมล' },
      { key: 'tier', label: 'Tier' },
      { key: 'points', label: 'แต้ม' },
      { key: 'totalSpent', label: 'ยอดซื้อรวม' },
      { key: 'visitCount', label: 'จำนวนครั้ง' },
      { key: 'birthday', label: 'วันเกิด' },
      { key: 'createdAt', label: 'สมัครเมื่อ' },
    ])
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  const total = customers.length || 1
  const segWidth = (n: number) => `${(n / total) * 100}%`

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="ลูกค้า & สมาชิก"
        subtitle="CRM และระบบสะสมแต้ม Loyalty แบบ 4 Tier"
        icon={Users}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]">
              <Plus className="h-4 w-4" /> เพิ่มลูกค้า
            </Button>
          </>
        }
      />

      <AdminKpiStrip>
        <AdminMiniStat label="ลูกค้าทั้งหมด" value={toThaiNumerals(kpis.all)} icon={Users} accent="gold" />
        <AdminMiniStat label="VIP" value={toThaiNumerals(kpis.vip)} icon={Crown} accent="forest" />
        <AdminMiniStat label="GOLD" value={toThaiNumerals(kpis.gold)} icon={Star} accent="amber" />
        <AdminMiniStat label="สมาชิกใหม่เดือนนี้" value={toThaiNumerals(kpis.newThisMonth)} icon={UserPlus} accent="teal" />
        <AdminMiniStat label="มูลค่าเฉลี่ย/ลูกค้า" value={formatBaht(kpis.avgSpend)} icon={Wallet} accent="gold" />
        <AdminMiniStat label="อัตรากลับมาซื้อซ้ำ" value={`${toThaiNumerals(kpis.repeatRate.toFixed(0))}%`} icon={Repeat} accent="forest" />
      </AdminKpiStrip>

      {/* Tier distribution + rules */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">การกระจาย Tier</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex h-9 overflow-hidden rounded-lg">
              {(['BRONZE', 'SILVER', 'GOLD', 'VIP'] as const).map((t) => {
                const cfg = tierConfig(t)
                const count = tierDist[t]
                if (count === 0) return null
                return (
                  <div
                    key={t}
                    className={cn('flex items-center justify-center text-xs font-semibold text-white', cfg.cls.split(' ')[0])}
                    style={{ width: segWidth(count), backgroundColor: t === 'BRONZE' ? '#92400e' : t === 'SILVER' ? '#64748b' : t === 'GOLD' ? '#C5A572' : '#1B3A2F' }}
                    title={`${cfg.label}: ${count}`}
                  >
                    {count > 0 && toThaiNumerals(count)}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['BRONZE', 'SILVER', 'GOLD', 'VIP'] as const).map((t) => {
                const cfg = tierConfig(t)
                const rule = TIER_RULES.find((r) => r.tier === t)!
                return (
                  <div key={t} className="rounded-lg border p-2">
                    <div className="flex items-center gap-1.5">
                      {t === 'VIP' && <Crown className="h-3 w-3 text-[var(--forest)] dark:text-emerald-400" />}
                      <Badge className={cn('text-[9px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">แต้ม ≥ {toThaiNumerals(rule.min)}</p>
                    <p className="mt-0.5 text-[10px]">{rule.perk}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Birthday this month */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Cake className="h-4 w-4 text-rose-500" /> วันเกิดเดือนนี้
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {birthdayThisMonth.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">ไม่มีวันเกิดเดือนนี้</p>
            ) : (
              <ul className="space-y-1.5">
                {birthdayThisMonth.slice(0, 5).map((c) => (
                  <li
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors hover:bg-muted/40"
                  >
                    <Avatar className="h-7 w-7 border border-rose-500/30">
                      <AvatarFallback className="bg-rose-500/10 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        {avatarInitials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                    </div>
                    <span className="shrink-0 text-xs text-rose-600 dark:text-rose-400">
                      {toThaiNumerals(new Date(c.birthday!).getDate())}
                    </span>
                  </li>
                ))}
                {birthdayThisMonth.length > 5 && (
                  <li className="text-center text-[10px] text-muted-foreground">
                    และอีก {toThaiNumerals(birthdayThisMonth.length - 5)} ราย
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> ตัวกรอง
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ, เบอร์, อีเมล"
            className="h-8 w-[220px] pl-7 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : customers.length === 0 ? (
        <AdminEmptyState
          icon={Users}
          title="ยังไม่มีลูกค้า"
          description="คลิก 'เพิ่มลูกค้า' เพื่อเพิ่มลูกค้าใหม่ในระบบ"
          action={<Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> เพิ่มลูกค้า</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">ลูกค้า</th>
                  <th className="px-3 py-2.5 text-left font-medium">Tier</th>
                  <th className="px-3 py-2.5 text-right font-medium">แต้ม</th>
                  <th className="px-3 py-2.5 text-right font-medium">ยอดซื้อรวม</th>
                  <th className="px-3 py-2.5 text-right font-medium">เข้ามา</th>
                  <th className="px-3 py-2.5 text-left font-medium">วันเกิด</th>
                  <th className="px-3 py-2.5 text-left font-medium">ออเดอร์ล่าสุด</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const tier = tierConfig(c.tier)
                  const bdThisMonth = c.birthday && new Date(c.birthday).getMonth() === new Date().getMonth()
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="cursor-pointer border-t hover:bg-muted/30"
                      onClick={() => openDetail(c)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className={cn('text-[10px] font-bold', tier.cls)}>
                              {avatarInitials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                            {c.email && (
                              <p className="truncate text-[10px] text-muted-foreground">{c.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn('gap-0.5 text-[9px] ring-1 ring-inset', tier.cls)}>
                          {c.tier === 'VIP' && <Crown className="h-2.5 w-2.5" />}
                          {tier.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold">{toThaiNumerals(c.points)}</td>
                      <td className="px-3 py-2.5 text-right">{formatBaht(c.totalSpent)}</td>
                      <td className="px-3 py-2.5 text-right">{toThaiNumerals(c.visitCount)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {c.birthday ? (
                          <span className={cn(bdThisMonth && 'font-semibold text-rose-600 dark:text-rose-400')}>
                            {formatThaiDate(new Date(c.birthday), { short: true })}
                            {bdThisMonth && ' 🎂'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {c.lastOrder ? (
                          <div>
                            <p className="font-mono">{c.lastOrder.orderNo}</p>
                            <p>{formatThaiDate(new Date(c.lastOrder.createdAt), { short: true })}</p>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        onSaved={refresh}
      />
      <CustomerDetailSheet
        customer={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={refresh}
      />
    </div>
  )
}
