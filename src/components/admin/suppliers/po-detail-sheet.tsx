'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, PackagePlus, CheckCircle2, Clock, MapPin, User, FileText, Package,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatBaht, formatThaiDate, formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'
import { poStatusConfig } from './suppliers-client'

export type PoListRow = {
  id: string
  poNo: string
  supplierId: string
  supplierName: string
  supplierCode: string
  branchId: string | null
  branchName: string | null
  status: string
  total: number
  receivedTotal: number
  expectedAt: string | null
  receivedAt: string | null
  notes: string | null
  userId: string | null
  userName: string | null
  itemCount: number
  createdAt: string
  updatedAt: string
}

type PoItem = {
  id: string
  productName: string
  productId: string | null
  quantity: number
  receivedQty: number
  unit: string
  unitPrice: number
  total: number
  notes: string | null
}

type PoDetail = {
  id: string
  poNo: string
  supplierId: string
  supplier: {
    id: string
    name: string
    code: string
    contactName: string | null
    phone: string | null
    address: string | null
  }
  branchId: string | null
  branch: { id: string; name: string } | null
  status: string
  total: number
  receivedTotal: number
  expectedAt: string | null
  receivedAt: string | null
  notes: string | null
  user: { id: string; name: string } | null
  items: PoItem[]
  createdAt: string
  updatedAt: string
}

type Props = {
  po: PoListRow
  open: boolean
  onOpenChange: (o: boolean) => void
  onUpdated: () => void
}

export function PoDetailSheet({ po, open, onOpenChange, onUpdated }: Props) {
  const [detail, setDetail] = React.useState<PoDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [receiveMode, setReceiveMode] = React.useState(false)
  const [receiveQtys, setReceiveQtys] = React.useState<Record<string, number>>({})
  const [receiveStatus, setReceiveStatus] = React.useState<'SENT' | 'DRAFT'>('SENT')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open || !po) return
    let active = true
    setLoading(true)
    setDetail(null)
    setReceiveMode(false)
    setReceiveQtys({})
    fetch(`/api/admin/purchase-orders/${po.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (active) setDetail(d) })
      .catch(() => { /* ignore */ })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, po])

  // Initialize receiveQtys when entering receive mode
  React.useEffect(() => {
    if (!receiveMode || !detail) return
    const init: Record<string, number> = {}
    detail.items.forEach((it) => {
      const remaining = Math.max(0, it.quantity - it.receivedQty)
      init[it.id] = remaining
    })
    setReceiveQtys(init)
  }, [receiveMode, detail])

  // Mark PO as sent first (DRAFT → SENT) so we can receive
  async function markAsSent() {
    if (!detail) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/purchase-orders/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'ส่ง PO ไม่สำเร็จ')
      }
      toast.success('ส่งใบสั่งซื้อแล้ว — พร้อมรับของ')
      setReceiveStatus('SENT')
      // refresh detail
      const r = await fetch(`/api/admin/purchase-orders/${detail.id}`, { cache: 'no-store' })
      const d = await r.json()
      setDetail(d)
      onUpdated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ส่ง PO ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function submitReceive() {
    if (!detail) return
    const items = Object.entries(receiveQtys)
      .map(([id, receivedQty]) => ({ id, receivedQty: Number(receivedQty) }))
      .filter((x) => x.receivedQty > 0)
    if (items.length === 0) {
      toast.error('กรุณาระบุจำนวนรับเข้าอย่างน้อย 1 รายการ')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/purchase-orders/${detail.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'รับเข้าไม่สำเร็จ')
      }
      const data = await res.json()
      toast.success(
        `รับเข้า ${toThaiNumerals(items.length)} รายการ — PO ${data.newStatus === 'RECEIVED' ? 'ครบแล้ว' : 'ยังไม่ครบ'}`
      )
      setReceiveMode(false)
      // Refresh detail
      const r = await fetch(`/api/admin/purchase-orders/${detail.id}`, { cache: 'no-store' })
      const d = await r.json()
      setDetail(d)
      onUpdated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'รับเข้าไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function cancelPo() {
    if (!detail) return
    if (!confirm('ยืนยันยกเลิก PO นี้?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/purchase-orders/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (!res.ok) throw new Error('ยกเลิกไม่สำเร็จ')
      toast.success('ยกเลิก PO แล้ว')
      const r = await fetch(`/api/admin/purchase-orders/${detail.id}`, { cache: 'no-store' })
      const d = await r.json()
      setDetail(d)
      onUpdated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ยกเลิกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const status = detail?.status ?? po.status
  const cfg = poStatusConfig(status)
  const canReceive = status === 'DRAFT' || status === 'SENT' || status === 'PARTIAL'
  const canCancel = status === 'DRAFT' || status === 'SENT' || status === 'PARTIAL'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl md:max-w-2xl">
        <SheetHeader className="space-y-0 border-b bg-muted/30 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg leading-tight">
                <ShoppingCart className="mr-2 inline h-5 w-5 text-[var(--gold)]" />
                {po.poNo}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {detail?.supplier?.name ?? po.supplierName} ({detail?.supplier?.code ?? po.supplierCode})
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge className={`text-[10px] ring-1 ring-inset ${cfg.cls}`}>{cfg.label}</Badge>
                {detail?.branch && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    <MapPin className="mr-1 h-2.5 w-2.5" />
                    {detail.branch.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-6 py-5">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : detail ? (
              <>
                {/* Meta */}
                <section className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <MetaItem icon={Clock} label="วันที่สร้าง" value={formatThaiDate(new Date(detail.createdAt), { short: true })} />
                  <MetaItem icon={Clock} label="คาดว่าจะรับ" value={detail.expectedAt ? formatThaiDate(new Date(detail.expectedAt), { short: true }) : '—'} />
                  <MetaItem icon={CheckCircle2} label="วันที่รับ" value={detail.receivedAt ? formatThaiDate(new Date(detail.receivedAt), { short: true }) : '—'} />
                  <MetaItem icon={User} label="ผู้สั่ง" value={detail.user?.name ?? '—'} />
                </section>

                {/* Supplier info */}
                <section className="rounded-lg border bg-muted/20 p-3 text-xs">
                  <p className="mb-1 font-semibold text-[var(--gold)]">ข้อมูลซัพพลายเออร์</p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <div>ผู้ติดต่อ: <span className="font-medium">{detail.supplier.contactName ?? '—'}</span></div>
                    <div>เบอร์: <span className="font-medium">{detail.supplier.phone ?? '—'}</span></div>
                    {detail.supplier.address && <div className="sm:col-span-2">ที่อยู่: <span className="text-muted-foreground">{detail.supplier.address}</span></div>}
                  </div>
                  {detail.notes && (
                    <div className="mt-2 border-t pt-2">
                      <FileText className="mr-1 inline h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{detail.notes}</span>
                    </div>
                  )}
                </section>

                {/* Items table */}
                <section className="rounded-lg border">
                  <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    <div className="col-span-5">รายการ</div>
                    <div className="col-span-2 text-right">สั่ง</div>
                    <div className="col-span-2 text-right">รับแล้ว</div>
                    <div className="col-span-1 text-right">ราคา</div>
                    <div className="col-span-2 text-right">รวม</div>
                  </div>
                  {detail.items.map((it) => {
                    const remaining = Math.max(0, it.quantity - it.receivedQty)
                    const done = it.receivedQty >= it.quantity
                    return (
                      <div key={it.id} className="grid grid-cols-12 items-center gap-2 border-b px-3 py-2 text-xs last:border-b-0">
                        <div className="col-span-5">
                          <p className={`font-medium ${done ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                            {done && <CheckCircle2 className="mr-1 inline h-3 w-3" />}
                            {it.productName}
                          </p>
                          {it.productId && <Badge variant="outline" className="mt-0.5 text-[9px]">ลิงก์สินค้า</Badge>}
                        </div>
                        <div className="col-span-2 text-right tabular-nums">{toThaiNumerals(it.quantity)} {it.unit}</div>
                        <div className="col-span-2 text-right tabular-nums">
                          <span className={done ? 'font-semibold text-emerald-600 dark:text-emerald-400' : remaining > 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                            {toThaiNumerals(it.receivedQty)}
                          </span>
                        </div>
                        <div className="col-span-1 text-right tabular-nums text-muted-foreground">{formatBaht(it.unitPrice).replace('฿', '')}</div>
                        <div className="col-span-2 text-right font-semibold tabular-nums">{formatBaht(it.total)}</div>

                        {/* Receive row (only in receive mode + remaining > 0) */}
                        {receiveMode && remaining > 0 && (
                          <div className="col-span-12 mt-1 flex items-center gap-2 border-t pt-2">
                            <span className="text-[10px] text-muted-foreground">รับเข้า:</span>
                            <Input
                              type="number"
                              min={0}
                              max={remaining}
                              className="h-7 w-24 text-xs"
                              value={receiveQtys[it.id] ?? 0}
                              onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [it.id]: Math.min(remaining, Math.max(0, Number(e.target.value))) }))}
                            />
                            <span className="text-[10px] text-muted-foreground">/ {toThaiNumerals(remaining)} {it.unit} คงเหลือ</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="grid grid-cols-2 border-t bg-muted/30 px-3 py-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">ยอดสั่ง: </span>
                      <span className="font-semibold">{formatBaht(detail.total)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">ยอดรับแล้ว: </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatBaht(detail.receivedTotal)}</span>
                    </div>
                  </div>
                </section>

                <AnimatePresence>
                  {receiveMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs"
                    >
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        <PackagePlus className="mr-1 inline h-4 w-4" />
                        โหมดรับเข้าสินค้า
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        ระบุจำนวนที่รับจริงในแต่ละรายการ แล้วกด &quot;บันทึกรับเข้า&quot; — สต็อกสินค้าจะถูกเพิ่มอัตโนมัติ
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">โหลดข้อมูลไม่สำเร็จ</div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="border-t bg-muted/30 px-6 py-4">
          {!receiveMode ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              {canCancel && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-500/10 hover:text-red-700"
                  onClick={cancelPo}
                  disabled={saving}
                >
                  ยกเลิก PO
                </Button>
              )}
              {status === 'DRAFT' && (
                <Button
                  variant="outline"
                  onClick={markAsSent}
                  disabled={saving}
                  className="border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10"
                >
                  ส่งใบสั่งซื้อ
                </Button>
              )}
              {canReceive && (
                <Button
                  className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
                  onClick={() => setReceiveMode(true)}
                  disabled={saving}
                >
                  <PackagePlus className="mr-1 h-4 w-4" />
                  รับเข้าสินค้า
                </Button>
              )}
            </div>
          ) : (
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setReceiveMode(false)} disabled={saving}>ยกเลิก</Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={submitReceive}
                disabled={saving}
              >
                <Package className="mr-1 h-4 w-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึกรับเข้า'}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function MetaItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium">{value}</p>
    </div>
  )
}
