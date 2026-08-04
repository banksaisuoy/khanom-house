'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TruckIcon, Plus, Search, Pencil, Trash2, ShoppingCart, Star, Phone, Building2,
  Package, Clock, CheckCircle2, AlertTriangle, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatBaht, formatNumber, formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import { SupplierFormDialog, type SupplierFormValues, type SupplierRow } from './supplier-form-dialog'
import { PoFormDialog, type PoFormValues } from './po-form-dialog'
import { PoDetailSheet, type PoListRow } from './po-detail-sheet'

type Branch = { id: string; name: string; code: string; isMain: boolean }

// ---------- PO status config ----------
type PoStatusCfg = { label: string; cls: string }
const PO_STATUS_CONFIG: Record<string, PoStatusCfg> = {
  DRAFT: { label: 'ร่าง', cls: 'bg-muted text-muted-foreground ring-border' },
  SENT: { label: 'ส่งแล้ว', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  PARTIAL: { label: 'รับบางส่วน', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  RECEIVED: { label: 'รับครบ', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  CANCELLED: { label: 'ยกเลิก', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
}
export function poStatusConfig(s: string): PoStatusCfg {
  return PO_STATUS_CONFIG[s] ?? { label: s, cls: 'bg-muted text-muted-foreground ring-border' }
}

type Props = {
  initialSuppliers: SupplierRow[]
  branches: Branch[]
  poStats: { total: number; sumTotal: number }
}

export function SuppliersClient({ initialSuppliers, branches, poStats }: Props) {
  const qc = useQueryClient()
  const [tab, setTab] = React.useState<'suppliers' | 'pos'>('suppliers')

  // ---- Supplier state ----
  const [supplierSearch, setSupplierSearch] = React.useState('')
  const [creatingSupplier, setCreatingSupplier] = React.useState(false)
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierRow | null>(null)
  const [deletingSupplier, setDeletingSupplier] = React.useState<SupplierRow | null>(null)

  // ---- PO state ----
  const [poSearch, setPoSearch] = React.useState('')
  const [poStatusFilter, setPoStatusFilter] = React.useState<string>('all')
  const [creatingPo, setCreatingPo] = React.useState(false)
  const [detailPo, setDetailPo] = React.useState<PoListRow | null>(null)

  // Fetch suppliers
  const suppliersQuery = useQuery<{ suppliers: SupplierRow[] }>({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const r = await fetch('/api/admin/suppliers', { cache: 'no-store' })
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { suppliers: initialSuppliers },
  })
  const suppliers = suppliersQuery.data?.suppliers ?? []

  // Fetch POs
  const posQuery = useQuery<{ purchaseOrders: PoListRow[] }>({
    queryKey: ['admin-pos'],
    queryFn: async () => {
      const r = await fetch('/api/admin/purchase-orders', { cache: 'no-store' })
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
  })
  const pos = posQuery.data?.purchaseOrders ?? []

  // ---- Derived stats ----
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const posThisMonth = pos.filter((p) => new Date(p.createdAt) >= monthStart)
  const pendingPos = pos.filter((p) => p.status === 'SENT' || p.status === 'PARTIAL')
  const monthValue = posThisMonth.reduce((s, p) => s + p.total, 0)

  // ---- Filtered lists ----
  const filteredSuppliers = React.useMemo(() => {
    if (!supplierSearch) return suppliers
    const q = supplierSearch.toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.contactName ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').includes(q)
    )
  }, [suppliers, supplierSearch])

  const filteredPos = React.useMemo(() => {
    return pos.filter((p) => {
      if (poStatusFilter !== 'all' && p.status !== poStatusFilter) return false
      if (poSearch) {
        const q = poSearch.toLowerCase()
        return p.poNo.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)
      }
      return true
    })
  }, [pos, poSearch, poStatusFilter])

  const refreshSuppliers = () => qc.invalidateQueries({ queryKey: ['admin-suppliers'] })
  const refreshPos = () => qc.invalidateQueries({ queryKey: ['admin-pos'] })

  // ---- Handlers ----
  async function handleSupplierSubmit(values: SupplierFormValues, id?: string) {
    try {
      const url = id ? `/api/admin/suppliers/${id}` : '/api/admin/suppliers'
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
      toast.success(id ? `อัปเดต "${values.name}" แล้ว` : `เพิ่ม "${values.name}" แล้ว`)
      setEditingSupplier(null)
      setCreatingSupplier(false)
      refreshSuppliers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function handleSupplierDelete(s: SupplierRow) {
    try {
      const res = await fetch(`/api/admin/suppliers/${s.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'ลบไม่สำเร็จ')
      }
      toast.success(`ปิดการใช้งาน "${s.name}" แล้ว (soft delete)`)
      setDeletingSupplier(null)
      refreshSuppliers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    }
  }

  async function handlePoSubmit(values: PoFormValues) {
    try {
      const res = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'สร้าง PO ไม่สำเร็จ')
      }
      const data = await res.json()
      toast.success(`สร้างใบสั่งซื้อ ${data.po.poNo} แล้ว`)
      setCreatingPo(false)
      refreshPos()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'สร้าง PO ไม่สำเร็จ')
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
              <BreadcrumbPage>ซัพพลายเออร์ & ใบสั่งซื้อ</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
              <TruckIcon className="h-6 w-6 text-[var(--gold)]" />
              ซัพพลายเออร์ & ใบสั่งซื้อ
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              จัดการผู้จำหน่ายและใบสั่งซื้อวัตถุดิบ (Purchase Orders)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'suppliers' ? (
              <Button
                size="sm"
                className="bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
                onClick={() => setCreatingSupplier(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                เพิ่มซัพพลายเออร์
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
                onClick={() => setCreatingPo(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                สร้างใบสั่งซื้อ
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="ซัพพลายเออร์ทั้งหมด" value={formatNumber(suppliers.filter((s) => s.isActive).length)} icon={TruckIcon} accent="gold" loading={suppliersQuery.isLoading} />
        <StatCard label="PO รอรับของ" value={formatNumber(pendingPos.length)} icon={AlertTriangle} accent="terracotta" loading={posQuery.isLoading} />
        <StatCard label="PO ครบเดือนนี้" value={formatNumber(posThisMonth.length)} icon={Clock} accent="cream" loading={posQuery.isLoading} />
        <StatCard label="มูลค่า PO เดือนนี้" value={formatBaht(monthValue)} icon={ShoppingCart} accent="forest" loading={posQuery.isLoading} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'suppliers' | 'pos')}>
        <TabsList>
          <TabsTrigger value="suppliers">ซัพพลายเออร์</TabsTrigger>
          <TabsTrigger value="pos">ใบสั่งซื้อ</TabsTrigger>
        </TabsList>

        {/* ============ SUPPLIERS TAB ============ */}
        <TabsContent value="suppliers" className="mt-4 space-y-4">
          {/* Filter bar */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วยชื่อ / รหัส / ผู้ติดต่อ / เบอร์..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="pl-9"
                />
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
                      <TableHead className="w-[60px]">รหัส</TableHead>
                      <TableHead>ซัพพลายเออร์</TableHead>
                      <TableHead className="hidden md:table-cell">ผู้ติดต่อ</TableHead>
                      <TableHead className="hidden lg:table-cell">เบอร์โทร</TableHead>
                      <TableHead className="text-center">คะแนน</TableHead>
                      <TableHead className="text-center">PO</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliersQuery.isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="mx-auto h-5 w-12" /></TableCell>
                          <TableCell><Skeleton className="mx-auto h-5 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredSuppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-48 text-center">
                          <EmptyState emoji="🚚" title="ยังไม่มีซัพพลายเออร์" desc="เพิ่มซัพพลายเออร์เพื่อเริ่มสร้างใบสั่งซื้อ" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSuppliers.map((s, idx) => (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.02, 0.15) }}
                          className="hover:bg-muted/40"
                        >
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium leading-tight">{s.name}</p>
                                {s.paymentTerms && (
                                  <p className="truncate text-[10px] text-muted-foreground">{s.paymentTerms}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {s.contactName ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {s.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {s.phone}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
                              <span className="text-xs font-semibold">{toThaiNumerals(s.rating)}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm tabular-nums">{toThaiNumerals(s.poCount)}</TableCell>
                          <TableCell>
                            {s.isActive ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">ใช้งาน</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-muted-foreground">ปิดอยู่</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSupplier(s)} title="แก้ไข">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                                onClick={() => setDeletingSupplier(s)}
                                title="ปิดการใช้งาน"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ POS TAB ============ */}
        <TabsContent value="pos" className="mt-4 space-y-4">
          {/* Filter bar */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาด้วยเลข PO / ชื่อซัพพลายเออร์..."
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'].map((st) => (
                    <Button
                      key={st}
                      size="sm"
                      variant={poStatusFilter === st ? 'default' : 'outline'}
                      className={poStatusFilter === st ? 'h-7 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90' : 'h-7 text-xs'}
                      onClick={() => setPoStatusFilter(st)}
                    >
                      {st === 'all' ? 'ทั้งหมด' : poStatusConfig(st).label}
                    </Button>
                  ))}
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
                      <TableHead>เลข PO</TableHead>
                      <TableHead>ซัพพลายเออร์</TableHead>
                      <TableHead className="hidden md:table-cell">สาขา</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="hidden lg:table-cell">คาดรับ</TableHead>
                      <TableHead className="text-right">ยอดรวม</TableHead>
                      <TableHead className="hidden xl:table-cell text-right">รับแล้ว</TableHead>
                      <TableHead className="text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posQuery.isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                          <TableCell className="hidden xl:table-cell"><Skeleton className="ml-auto h-5 w-14" /></TableCell>
                          <TableCell><Skeleton className="ml-auto h-5 w-12" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredPos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-48 text-center">
                          <EmptyState emoji="🧾" title="ยังไม่มีใบสั่งซื้อ" desc="สร้างใบสั่งซื้อใหม่เพื่อเริ่มรับเข้าวัตถุดิบ" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPos.map((p, idx) => {
                        const cfg = poStatusConfig(p.status)
                        const isClosed = p.status === 'CANCELLED' || p.status === 'RECEIVED'
                        return (
                          <motion.tr
                            key={p.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx * 0.02, 0.15) }}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => setDetailPo(p)}
                            tabIndex={0}
                            role="button"
                            aria-label={`ดูรายละเอียด PO ${p.poNo}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setDetailPo(p)
                              }
                            }}
                          >
                            <TableCell>
                              <span className="font-mono text-sm font-semibold text-[var(--gold)]">{p.poNo}</span>
                              <span className="ml-1.5 text-[10px] text-muted-foreground">
                                ({toThaiNumerals(p.itemCount)} รายการ)
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium leading-tight">{p.supplierName}</span>
                                <span className="text-[10px] text-muted-foreground">{p.supplierCode}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {p.branchName ?? '—'}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ring-1 ring-inset ${cfg.cls}`}>{cfg.label}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs">
                              {p.expectedAt ? formatThaiDate(new Date(p.expectedAt), { short: true }) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{formatBaht(p.total)}</TableCell>
                            <TableCell className="hidden xl:table-cell text-right text-xs tabular-nums">
                              {isClosed ? (
                                <span className={p.status === 'RECEIVED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                                  {formatBaht(p.receivedTotal)}
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">{formatBaht(p.receivedTotal)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); setDetailPo(p) }}
                                title="ดูรายละเอียด"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {(creatingSupplier || editingSupplier) && (
        <SupplierFormDialog
          open
          onOpenChange={(o) => { if (!o) { setCreatingSupplier(false); setEditingSupplier(null) } }}
          supplier={editingSupplier ?? undefined}
          onSubmit={handleSupplierSubmit}
        />
      )}

      {creatingPo && (
        <PoFormDialog
          open
          onOpenChange={(o) => { if (!o) setCreatingPo(false) }}
          suppliers={suppliers}
          branches={branches}
          onSubmit={handlePoSubmit}
        />
      )}

      {detailPo && (
        <PoDetailSheet
          po={detailPo}
          open
          onOpenChange={(o) => { if (!o) setDetailPo(null) }}
          onUpdated={refreshPos}
        />
      )}

      <AlertDialog open={!!deletingSupplier} onOpenChange={(o) => { if (!o) setDeletingSupplier(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ปิดการใช้งานซัพพลายเออร์นี้?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingSupplier?.name}&quot; จะถูกปิดการใช้งาน (soft delete) — ยังคงเก็บประวัติ PO ไว้
              และสามารถเปิดใช้ใหม่ได้ภายหลัง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deletingSupplier && handleSupplierDelete(deletingSupplier)}
            >
              ปิดการใช้งาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------- Sub-components ----------------

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'gold' | 'forest' | 'cream' | 'terracotta'
  loading: boolean
}) {
  const accentClass = {
    gold: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30',
    forest: 'bg-[var(--forest)]/10 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/20',
    cream: 'bg-amber-700/10 text-amber-700 dark:text-amber-300 ring-amber-700/20',
    terracotta: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20',
  }[accent]
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="mt-1 text-xl font-bold md:text-2xl">{value}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
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

// Keep imports referenced
void Package
void CheckCircle2
