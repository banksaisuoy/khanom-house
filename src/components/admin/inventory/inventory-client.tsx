'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Warehouse,
  PackagePlus,
  ClipboardCheck,
  AlertTriangle,
  Flame,
  History,
  Boxes,
  Plus,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  classifyStock,
  inventoryTypeLabel,
  type InventoryDetailDTO,
} from '@/lib/admin-catalog'
import { formatNumber, formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'
import { getProductVisual } from '@/lib/product-emoji'
import { StockAdjustDialog } from './stock-adjust-dialog'
import { StockMovementDialog } from './stock-movement-dialog'
import { ReceiveGoodsDialog } from './receive-goods-dialog'

type Branch = { id: string; name: string; isMain: boolean }

type InventoryRow = {
  id: string
  branchId: string
  branchName: string
  type: string
  quantity: number
  unit: string
  reorderPoint: number
  safetyStock: number
  batchNo?: string | null
  expiryAt?: string | null
  location?: string | null
  updatedAt: string
  productId: string
  productName: string
  productSlug?: string | null
  productType?: string | null
  status: 'OUT' | 'LOW' | 'SAFETY' | 'OK'
}

type Stats = { total: number; low: number; out: number; expiring: number }

const TABS = [
  { value: 'FINISHED', label: 'สินค้าสำเร็จรูป', emoji: '🧁' },
  { value: 'RAW', label: 'วัตถุดิบ', emoji: '🌾' },
  { value: 'PACKAGING', label: 'บรรจุภัณฑ์', emoji: '📦' },
  { value: 'low', label: 'สต็อกต่ำ', emoji: '⚠️' },
  { value: 'expiring', label: 'ใกล้หมดอายุ', emoji: '🔥' },
] as const

type TabValue = (typeof TABS)[number]['value']

export function InventoryClient({ branches }: { branches: Branch[] }) {
  const sp = useSearchParams()
  const initialTab: TabValue = (sp.get('status') === 'low' ? 'low' : 'FINISHED') as TabValue
  const initialBranchId = branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? ''

  const [branchId, setBranchId] = React.useState(initialBranchId)
  const [tab, setTab] = React.useState<TabValue>(initialTab)
  const [search, setSearch] = React.useState('')
  const [rows, setRows] = React.useState<InventoryRow[] | null>(null)
  const [stats, setStats] = React.useState<Stats>({ total: 0, low: 0, out: 0, expiring: 0 })

  const [adjustTarget, setAdjustTarget] = React.useState<InventoryRow | null>(null)
  const [movementTarget, setMovementTarget] = React.useState<InventoryRow | null>(null)
  const [movementDetail, setMovementDetail] = React.useState<InventoryDetailDTO | null>(null)
  const [receiveOpen, setReceiveOpen] = React.useState(false)
  const [countOpen, setCountOpen] = React.useState(false)

  const fetchInventory = React.useCallback(async (signal?: AbortSignal) => {
    setRows(null)
    try {
      const p = new URLSearchParams()
      p.set('branchId', branchId)
      if (tab === 'low') p.set('status', 'low')
      else if (tab === 'expiring') p.set('status', 'expiring')
      else p.set('type', tab)
      if (search) p.set('search', search)
      const res = await fetch(`/api/admin/inventory?${p.toString()}`, {
        cache: 'no-store',
        signal,
      })
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setRows(data.inventory as InventoryRow[])
      setStats(data.stats as Stats)
    } catch (e) {
      // Ignore abort errors — they fire when the user changes filters
      // before the previous request has resolved.
      if ((e as Error).name === 'AbortError') return
      console.error(e)
      toast.error('ดึงข้อมูลสต็อกไม่สำเร็จ')
      setRows([])
    }
  }, [branchId, tab, search])

  React.useEffect(() => {
    const ac = new AbortController()
    fetchInventory(ac.signal)
    return () => ac.abort()
  }, [fetchInventory])

  // Keep the latest AbortController for the movements fetch so a new
  // openMovements() call can cancel the in-flight one.
  const abortMovementsRef = React.useRef<AbortController | null>(null)

  function openMovements(row: InventoryRow) {
    setMovementTarget(row)
    setMovementDetail(null)
    // Abort any in-flight movements request before starting a new one.
    abortMovementsRef.current?.abort()
    const ac = new AbortController()
    abortMovementsRef.current = ac
    fetch(`/api/admin/inventory/${row.id}/movements`, {
      cache: 'no-store',
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.inventory) setMovementDetail(d.inventory)
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') toast.error('ดึงประวัติไม่สำเร็จ')
      })
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
              <BreadcrumbPage>คลังสินค้า</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
              <Warehouse className="h-6 w-6 text-[var(--gold)]" />
              คลังสินค้า
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ติดตามสต็อก การเคลื่อนไหว และการหมดอายุ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.isMain ? '⭐ ' : ''}{b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setCountOpen(true)}>
              <ClipboardCheck className="mr-1 h-4 w-4" />
              ตรวจนับสต็อก
            </Button>
            <Button
              size="sm"
              className="bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
              onClick={() => setReceiveOpen(true)}
            >
              <PackagePlus className="mr-1 h-4 w-4" />
              รับเข้าสินค้า
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {stats.low > 0 && (
          <Link href="#" onClick={(e) => { e.preventDefault(); setTab('low') }}>
            <AlertBar
              tone="gold"
              icon={AlertTriangle}
              text={`${toThaiNumerals(stats.low)} รายการสต็อกต่ำกว่าจุดสั่งซื้อ — คลิกเพื่อดูรายการ`}
            />
          </Link>
        )}
        {stats.expiring > 0 && (
          <Link href="#" onClick={(e) => { e.preventDefault(); setTab('expiring') }}>
            <AlertBar
              tone="red"
              icon={Flame}
              text={`🔴 ${toThaiNumerals(stats.expiring)} รายการใกล้หมดอายุ (ภายใน 24 ชม.) — คลิกเพื่อดูรายการ`}
            />
          </Link>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1">
              <span>{t.emoji}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {t.value === 'low' && stats.low > 0 && (
                <Badge className="ml-1 h-4 px-1 text-[10px]">{toThaiNumerals(stats.low)}</Badge>
              )}
              {t.value === 'expiring' && stats.expiring > 0 && (
                <Badge className="ml-1 h-4 bg-red-500 px-1 text-[10px] text-white">{toThaiNumerals(stats.expiring)}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="space-y-3">
          {/* Search */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาสินค้า..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Boxes className="h-4 w-4" />
                {rows ? (
                  <span>{formatNumber(rows.length)} รายการ · ทั้งหมด {formatNumber(stats.total)} รายการในสาขา</span>
                ) : (
                  <Skeleton className="h-4 w-48" />
                )}
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
                      <TableHead className="w-[60px]">รูป</TableHead>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="hidden md:table-cell">ประเภท</TableHead>
                      <TableHead className="hidden lg:table-cell">คลัง</TableHead>
                      <TableHead className="text-right">คงเหลือ</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">สั่งซื้อ</TableHead>
                      <TableHead className="hidden md:table-cell">แบตช์</TableHead>
                      <TableHead className="hidden lg:table-cell">หมดอายุ</TableHead>
                      <TableHead className="hidden xl:table-cell">ที่ตั้ง</TableHead>
                      <TableHead className="text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows === null ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-10 w-10 rounded-lg" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                          <TableCell className="hidden sm:table-cell"><Skeleton className="ml-auto h-5 w-12" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="ml-auto h-5 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-48 text-center">
                          <EmptyState emoji="📦" title="ไม่มีรายการในแท็บนี้" desc="ลองเปลี่ยนแท็บหรือเพิ่มสต็อกใหม่" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r) => {
                        const visual = getProductVisual(r.productSlug ?? undefined, r.productName, r.productType ?? undefined)
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${visual.gradient} text-xl shadow-sm`}>
                                {visual.emoji}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium leading-tight">{r.productName}</span>
                                <span className="text-xs text-muted-foreground">{r.branchName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="font-normal">{inventoryTypeLabel(r.type)}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {r.branchName}
                            </TableCell>
                            <TableCell className="text-right">
                              <QtyCell qty={r.quantity} unit={r.unit} reorder={r.reorderPoint} safety={r.safetyStock} />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right text-sm text-muted-foreground">
                              {formatNumber(r.reorderPoint)}
                              <span className="ml-1 text-[10px]">({formatNumber(r.safetyStock)})</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {r.batchNo ? (
                                <span className="font-mono text-xs">{r.batchNo}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <ExpiryCell expiryAt={r.expiryAt} />
                            </TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                              {r.location ?? '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="ปรับสต็อก"
                                  onClick={() => setAdjustTarget(r)}
                                >
                                  <ClipboardCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="ดูประวัติ"
                                  onClick={() => openMovements(r)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-[var(--gold)]"
                                  title="รับเข้า"
                                  onClick={() => setReceiveOpen(true)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
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
      {adjustTarget && (
        <StockAdjustDialog
          open
          onOpenChange={(o) => { if (!o) setAdjustTarget(null) }}
          row={adjustTarget}
          onDone={() => { setAdjustTarget(null); fetchInventory() }}
        />
      )}

      {movementTarget && (
        <StockMovementDialog
          open
          onOpenChange={(o) => { if (!o) { setMovementTarget(null); setMovementDetail(null) } }}
          row={movementTarget}
          detail={movementDetail}
        />
      )}

      {receiveOpen && (
        <ReceiveGoodsDialog
          open
          onOpenChange={setReceiveOpen}
          branchId={branchId}
          branchName={branches.find((b) => b.id === branchId)?.name ?? ''}
          onDone={() => { setReceiveOpen(false); fetchInventory() }}
        />
      )}

      {countOpen && (
        <StockCountDialog
          open={countOpen}
          onOpenChange={setCountOpen}
          rows={rows ?? []}
          onDone={() => { setCountOpen(false); fetchInventory() }}
        />
      )}
    </div>
  )
}

// ---------- Sub-components ----------

function AlertBar({ tone, icon: Icon, text }: { tone: 'gold' | 'red'; icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${
        tone === 'gold'
          ? 'border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]'
          : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400'
      }`}
    >
      <Icon className="h-4 w-4" />
      {text}
    </motion.div>
  )
}

function QtyCell({ qty, unit, reorder, safety }: { qty: number; unit: string; reorder: number; safety: number }) {
  const status = classifyStock(qty, reorder, safety)
  if (status === 'OUT') {
    return (
      <div className="flex flex-col items-end">
        <span className="font-bold text-red-600 dark:text-red-400">หมด</span>
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
    )
  }
  const color = status === 'LOW' ? 'text-orange-600 dark:text-orange-400' : status === 'SAFETY' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
  return (
    <div className="flex flex-col items-end">
      <span className={`font-bold ${color}`}>{formatNumber(qty)}</span>
      <span className="text-[10px] text-muted-foreground">{unit}</span>
    </div>
  )
}

function ExpiryCell({ expiryAt }: { expiryAt?: string | null }) {
  if (!expiryAt) return <span className="text-xs text-muted-foreground">-</span>
  const d = new Date(expiryAt)
  const ms = d.getTime() - Date.now()
  const hours = ms / 3600000
  const days = hours / 24
  let label = ''
  let tone: 'red' | 'amber' | 'muted' = 'muted'
  if (ms < 0) {
    label = 'หมดอายุแล้ว'
    tone = 'red'
  } else if (hours < 24) {
    label = `${toThaiNumerals(Math.max(1, Math.round(hours)))} ชม.`
    tone = 'red'
  } else if (days < 3) {
    label = `${toThaiNumerals(Math.round(days))} วัน`
    tone = 'amber'
  } else {
    label = formatThaiDateTime(d)
  }
  return (
    <span
      suppressHydrationWarning
      className={`text-xs font-medium ${tone === 'red' ? 'text-red-600 dark:text-red-400' : tone === 'amber' ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}
    >
      {label}
    </span>
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

// ---------- Stock count dialog (count-then-adjust batch) ----------
function StockCountDialog({
  open,
  onOpenChange,
  rows,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  rows: InventoryRow[]
  onDone: () => void
}) {
  const [counts, setCounts] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) setCounts({})
  }, [open])

  const diffs = rows
    .map((r) => {
      const raw = counts[r.id]
      if (raw === undefined || raw === '') return null
      const counted = Number(raw)
      if (Number.isNaN(counted)) return null
      return { row: r, counted, diff: counted - r.quantity }
    })
    .filter((d): d is { row: InventoryRow; counted: number; diff: number } => d !== null && d.diff !== 0)

  async function save() {
    setSaving(true)
    let ok = 0
    for (const d of diffs) {
      try {
        const res = await fetch('/api/admin/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventoryId: d.row.id,
            branchId: d.row.branchId,
            type: 'ADJUST',
            quantity: Math.abs(d.counted),
            reason: `ตรวจนับสต็อก (นับได้ ${d.counted} ${d.row.unit}, ระบบ ${d.row.quantity})`,
            refType: 'STOCK_COUNT',
          }),
        })
        if (res.ok) ok += 1
      } catch { /* ignore */ }
    }
    setSaving(false)
    toast.success(`ปรับสต็อก ${toThaiNumerals(ok)} รายการแล้ว`)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[var(--gold)]" />
            ตรวจนับสต็อก
          </DialogTitle>
          <DialogDescription>
            กรอกจำนวนที่นับได้จริง ระบบจะปรับยอดอัตโนมัติพร้อมบันทึกการเคลื่อนไหว
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>สินค้า</TableHead>
                <TableHead className="text-right">ในระบบ</TableHead>
                <TableHead className="text-right">นับได้</TableHead>
                <TableHead className="text-right">ผลต่าง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                    กรุณาเลือกแท็บสินค้าก่อนเริ่มนับ
                  </TableCell>
                </TableRow>
              ) : rows.map((r) => {
                const counted = counts[r.id] !== undefined && counts[r.id] !== '' ? Number(counts[r.id]) : null
                const diff = counted !== null ? counted - r.quantity : 0
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{r.productName}</span>
                        <span className="text-xs text-muted-foreground">{r.batchNo ?? r.branchName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(r.quantity)} {r.unit}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="ml-auto h-8 w-24 text-right"
                        value={counts[r.id] ?? ''}
                        onChange={(e) => setCounts((c) => ({ ...c, [r.id]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {diff === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span className={diff > 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {diff > 0 ? '+' : ''}{formatNumber(diff)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-4">
          <span className="text-xs text-muted-foreground">
            {diffs.length > 0 ? `${toThaiNumerals(diffs.length)} รายการจะถูกปรับ` : 'ยังไม่มีการกรอกจำนวน'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button
              disabled={saving || diffs.length === 0}
              onClick={save}
              className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
            >
              {saving ? 'กำลังบันทึก...' : `บันทึกการนับ (${toThaiNumerals(diffs.length)})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
