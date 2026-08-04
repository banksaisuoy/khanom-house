'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Ticket, Plus, Download, Pencil, Trash2, Percent, BadgeDollarSign,
  Sparkles, TrendingUp, Clock, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminPageHeader, AdminKpiStrip, AdminMiniStat, AdminEmptyState } from '@/components/admin/admin-page-utils'
import { PromotionFormDialog, type PromotionFormValues } from './promotion-form-dialog'
import { promoTypeConfig, toCsv, downloadCsv } from '@/lib/admin-ui'
import { formatBaht, formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type PromotionRow = {
  id: string
  code: string
  name: string
  type: string
  value: number
  minSpend: number
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  startsAt: string
  endsAt: string
  isActive: boolean
  createdAt: string
  products: { productId: string; name: string; sku: string }[]
}

export function PromotionsClient({ initialPromotions }: { initialPromotions: PromotionRow[] }) {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Partial<PromotionFormValues> & { id?: string } | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = React.useState<PromotionRow | null>(null)

  const { data, isLoading } = useQuery<{ promotions: PromotionRow[] }>({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const r = await fetch('/api/admin/promotions')
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { promotions: initialPromotions },
  })

  const promos = data?.promotions ?? []
  const now = new Date()

  const kpis = React.useMemo(() => {
    const active = promos.filter((p) => p.isActive && new Date(p.endsAt) >= now).length
    const redeemedThisMonth = promos.reduce((s, p) => s + p.usedCount, 0)
    // estimate discount given (mock based on type/value)
    const discountGiven = promos.reduce((s, p) => {
      const est = p.type === 'PERCENT' ? p.value * 50 * p.usedCount
        : p.type === 'FIXED' ? p.value * p.usedCount
        : 200 * p.usedCount
      return s + est
    }, 0)
    return { all: promos.length, active, redeemedThisMonth, discountGiven }
  }, [promos])

  const openCreate = () => { setEditTarget(undefined); setFormOpen(true) }
  const openEdit = (p: PromotionRow) => {
    setEditTarget({
      id: p.id, code: p.code, name: p.name, type: p.type, value: p.value,
      minSpend: p.minSpend, maxDiscount: p.maxDiscount, usageLimit: p.usageLimit,
      startsAt: p.startsAt, endsAt: p.endsAt, isActive: p.isActive,
      productIds: p.products.map((pp) => pp.productId),
    })
    setFormOpen(true)
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-promotions'] })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const r = await fetch(`/api/admin/promotions/${deleteTarget.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('ลบไม่สำเร็จ')
      toast.success('ลบโปรเรียบร้อย')
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const exportCsv = () => {
    const rows = promos.map((p) => ({
      code: p.code,
      name: p.name,
      type: p.type,
      value: p.value,
      minSpend: p.minSpend,
      used: p.usedCount,
      limit: p.usageLimit ?? '',
      startsAt: formatThaiDate(new Date(p.startsAt), { short: true }),
      endsAt: formatThaiDate(new Date(p.endsAt), { short: true }),
      isActive: p.isActive ? 'เปิด' : 'ปิด',
    }))
    const csv = toCsv(rows, [
      { key: 'code', label: 'รหัส' },
      { key: 'name', label: 'ชื่อ' },
      { key: 'type', label: 'ประเภท' },
      { key: 'value', label: 'มูลค่า' },
      { key: 'minSpend', label: 'ขั้นต่ำ' },
      { key: 'used', label: 'ใช้แล้ว' },
      { key: 'limit', label: 'จำกัด' },
      { key: 'startsAt', label: 'เริ่ม' },
      { key: 'endsAt', label: 'สิ้นสุด' },
      { key: 'isActive', label: 'สถานะ' },
    ])
    downloadCsv(`promotions-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="โปรโมชั่น & คูปอง"
        subtitle="จัดการคูปองส่วนลด โปรโมชั่น และเงื่อนไขการใช้งาน"
        icon={Ticket}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]">
              <Plus className="h-4 w-4" /> สร้างโปร
            </Button>
          </>
        }
      />

      <AdminKpiStrip>
        <AdminMiniStat label="โปรทั้งหมด" value={toThaiNumerals(kpis.all)} icon={Ticket} accent="gold" />
        <AdminMiniStat label="กำลังใช้งาน" value={toThaiNumerals(kpis.active)} icon={CheckCircle2} accent="forest" />
        <AdminMiniStat label="ใช้แล้วเดือนนี้" value={toThaiNumerals(kpis.redeemedThisMonth)} icon={TrendingUp} accent="teal" />
        <AdminMiniStat label="ส่วนลดที่ให้ (ประมาณ)" value={formatBaht(kpis.discountGiven)} icon={BadgeDollarSign} accent="amber" />
      </AdminKpiStrip>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : promos.length === 0 ? (
        <AdminEmptyState
          icon={Ticket}
          title="ยังไม่มีโปรโมชั่น"
          description="คลิก 'สร้างโปร' เพื่อเพิ่มคูปองส่วนลด"
          action={<Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> สร้างโปร</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">รหัส / ชื่อ</th>
                  <th className="px-3 py-2.5 text-left font-medium">ประเภท</th>
                  <th className="px-3 py-2.5 text-right font-medium">มูลค่า</th>
                  <th className="px-3 py-2.5 text-center font-medium">การใช้งาน</th>
                  <th className="px-3 py-2.5 text-left font-medium">ระยะเวลา</th>
                  <th className="px-3 py-2.5 text-center font-medium">สถานะ</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p, i) => {
                  const cfg = promoTypeConfig(p.type)
                  const expired = new Date(p.endsAt) < now
                  const upcoming = new Date(p.startsAt) > now
                  const usagePct = p.usageLimit ? (p.usedCount / p.usageLimit) * 100 : 0
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="border-t hover:bg-muted/30"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)]">
                            {p.type === 'PERCENT' ? <Percent className="h-3.5 w-3.5" /> : <Ticket className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold">{p.code}</p>
                            <p className="truncate text-xs text-muted-foreground">{p.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn('text-[9px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-semibold">
                          {p.type === 'PERCENT' ? `${toThaiNumerals(p.value)}%` : formatBaht(p.value)}
                        </span>
                        {p.minSpend > 0 && (
                          <p className="text-[10px] text-muted-foreground">ขั้นต่ำ {formatBaht(p.minSpend)}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-center">
                          <p className="text-xs font-semibold">{toThaiNumerals(p.usedCount)}</p>
                          {p.usageLimit ? (
                            <>
                              <p className="text-[10px] text-muted-foreground">/ {toThaiNumerals(p.usageLimit)}</p>
                              <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-[var(--gold)]" style={{ width: `${Math.min(100, usagePct)}%` }} />
                              </div>
                            </>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">ไม่จำกัด</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <p>{formatThaiDate(new Date(p.startsAt), { short: true })}</p>
                        <p className="text-muted-foreground">ถึง {formatThaiDate(new Date(p.endsAt), { short: true })}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {expired ? (
                          <Badge variant="outline" className="gap-1 text-[9px]">
                            <Clock className="h-2.5 w-2.5" /> หมดเขตแล้ว
                          </Badge>
                        ) : upcoming ? (
                          <Badge variant="outline" className="gap-1 text-[9px]">
                            <Sparkles className="h-2.5 w-2.5" /> จะเริ่ม
                          </Badge>
                        ) : p.isActive ? (
                          <Badge className="gap-1 text-[9px] ring-1 ring-inset bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5" /> ใช้งาน
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px]">ปิดอยู่</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PromotionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        onSaved={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบโปรโมชั่น {deleteTarget?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบนี้ไม่สามารถยกเลิกได้ โปรโมชั่น "{deleteTarget?.name}" จะถูกลบออกจากระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
