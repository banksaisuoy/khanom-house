'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  Clock,
  X,
  Loader2,
  Pause,
  Play,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatBaht, formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'
import { getProductVisual } from '@/lib/product-emoji'
import { cn } from '@/lib/utils'
import { PosCart, type CartItem } from './pos-cart'
import { PosPaymentDialog, type PaymentItem } from './pos-payment-dialog'
import { CloseShiftDialog, type ShiftInfo } from './shift-screen'
import { CashDrawerDialog } from './cash-drawer-dialog'

export interface PosProduct {
  id: string
  name: string
  slug: string
  type: string
  price: number
  unit: string
  category: { id: string; name: string; slug: string; icon?: string | null }
  stock: number
}

export interface PosTerminalProps {
  shift: ShiftInfo
  cashier: { id: string; name: string; email: string }
  branch: { id: string; name: string; code: string }
  products: PosProduct[]
  categories: { id: string; name: string; slug: string; icon?: string | null }[]
}

export function PosTerminal({
  shift,
  cashier,
  branch,
  products,
  categories,
}: PosTerminalProps) {
  const [activeCat, setActiveCat] = React.useState<string>('all')
  const [search, setSearch] = React.useState('')
  const [items, setItems] = React.useState<CartItem[]>([])
  const [discount, setDiscount] = React.useState(0)
  const [customer, setCustomer] = React.useState<{ id?: string; name: string; phone?: string; tier?: string } | null>(null)

  const [payOpen, setPayOpen] = React.useState(false)
  const [closeShiftOpen, setCloseShiftOpen] = React.useState(false)
  const [cashMoveOpen, setCashMoveOpen] = React.useState(false)
  const [billsOpen, setBillsOpen] = React.useState(false)
  const [customerOpen, setCustomerOpen] = React.useState(false)
  const [heldOpen, setHeldOpen] = React.useState(false)
  const [holdOpen, setHoldOpen] = React.useState(false)
  const [holdNotes, setHoldNotes] = React.useState('')
  const [holdSaving, setHoldSaving] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  // After closing a shift, the server component should re-fetch and
  // surface the shift-open screen. Use router.refresh() instead of
  // window.location.reload() to avoid a full page reload and to keep
  // client state intact across the transition.
  const router = useRouter()
  const refreshShift = React.useCallback(() => {
    router.refresh()
  }, [router])

  const filtered = React.useMemo(() => {
    let list = products
    if (activeCat !== 'all') list = list.filter((p) => p.category.slug === activeCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q))
    }
    return list
  }, [products, activeCat, search])

  const addToCart = (p: PosProduct) => {
    if (p.stock <= 0) {
      toast.error(`${p.name} หมดสต็อก`)
      return
    }
    setItems((prev) => {
      const found = prev.find((it) => it.productId === p.id)
      if (found) {
        if (found.quantity >= p.stock) {
          toast.error(`เหลือสต็อก ${p.stock} ${p.unit}`)
          return prev
        }
        return prev.map((it) =>
          it.productId === p.id ? { ...it, quantity: it.quantity + 1 } : it
        )
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          price: p.price,
          quantity: 1,
          unit: p.unit,
          stock: p.stock,
        },
      ]
    })
  }

  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0)
  const total = Math.max(0, subtotal - discount)

  const onPaid = (billNo: string) => {
    if (billNo) {
      setItems([])
      setDiscount(0)
      setCustomer(null)
      setRefreshKey((k) => k + 1)
    }
    setPayOpen(false)
  }

  // ---- Hold / Recall ----
  const holdBill = async () => {
    if (items.length === 0) {
      toast.error('ตะกร้าว่าง — ไม่สามารถพักบิลได้')
      return
    }
    setHoldSaving(true)
    try {
      const res = await fetch('/api/admin/pos/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: shift.id,
          items: items.map((it) => ({
            productId: it.productId,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            unit: it.unit,
          })),
          subtotal,
          discount,
          total,
          notes: holdNotes || undefined,
          customerName: customer?.name,
          customerPhone: customer?.phone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`พักบิล ${data.holdCode} แล้ว`, {
        description: 'กด "เรียกบิล" เพื่อดึงบิลกลับมาได้ตลอด',
      })
      setItems([])
      setDiscount(0)
      setCustomer(null)
      setHoldNotes('')
      setHoldSaving(false)
      setHoldOpen(false)
      setRefreshKey((k) => k + 1)
    } catch (e: unknown) {
      toast.error('พักบิลไม่สำเร็จ', { description: (e as Error).message })
      setHoldSaving(false)
    }
  }

  const recallBill = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pos/hold/${id}/recall`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Populate cart with recalled items
      setItems(
        (data.items as Array<{
          productId: string
          name: string
          price: number
          quantity: number
          unit?: string
        }>).map((it) => ({
          productId: it.productId,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          unit: it.unit ?? 'ชิ้น',
          // stock re-lookup will be applied on next add; default to a large number
          stock: 9999,
        }))
      )
      setDiscount(data.discount ?? 0)
      if (data.customerName || data.customerPhone) {
        setCustomer({
          name: data.customerName ?? 'ลูกค้าทั่วไป',
          phone: data.customerPhone,
        })
      }
      if (data.notes) setHoldNotes(data.notes)
      toast.success(`เรียกบิล ${data.holdCode} กลับมาแล้ว`)
      setHeldOpen(false)
    } catch (e: unknown) {
      toast.error('เรียกบิลไม่สำเร็จ', { description: (e as Error).message })
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-2 lg:flex-row">
      {/* LEFT: catalog */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        {/* Category tabs */}
        <div className="border-b p-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <CategoryPill
              active={activeCat === 'all'}
              onClick={() => setActiveCat('all')}
              icon="🛒"
              label="ทั้งหมด"
            />
            {categories.map((c) => (
              <CategoryPill
                key={c.id}
                active={activeCat === c.slug}
                onClick={() => setActiveCat(c.slug)}
                icon={c.icon ?? '🍡'}
                label={c.name}
              />
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสินค้า…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-11 text-base"
            />
          </div>
        </div>

        {/* Product grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => {
              const v = getProductVisual(p.slug, p.name, p.type)
              const inCart = items.find((it) => it.productId === p.id)?.quantity ?? 0
              const out = p.stock <= 0
              return (
                <motion.button
                  key={p.id}
                  layout
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={out}
                  onClick={() => addToCart(p)}
                  className={cn(
                    'relative flex h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-card p-2 text-center transition-all hover:border-[var(--gold)] hover:shadow-md',
                    out && 'cursor-not-allowed opacity-50 grayscale',
                    inCart > 0 && 'border-[var(--gold)] bg-[var(--gold)]/5'
                  )}
                >
                  <span className="text-4xl">{v.emoji}</span>
                  <span className="line-clamp-2 text-xs font-medium leading-tight">{p.name}</span>
                  <span className="text-sm font-bold text-[var(--gold)]">{formatBaht(p.price)}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'absolute right-1 top-1 h-5 px-1 text-[9px]',
                      out
                        ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                        : p.stock < 10
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-border bg-muted/50 text-muted-foreground'
                    )}
                  >
                    {out ? 'หมด' : toThaiNumerals(p.stock)}
                  </Badge>
                  {inCart > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--forest)] px-1 text-xs font-bold text-white shadow-md dark:bg-[var(--gold)] dark:text-[var(--gold-foreground)]">
                      {toThaiNumerals(inCart)}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <div className="text-4xl">🔍</div>
              <p className="mt-2 text-sm">ไม่พบสินค้า "{search}"</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer: shift info + clock */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">SHIFT</Badge>
            <span className="font-mono font-semibold">{shift.shiftNo}</span>
            <span className="text-muted-foreground">· {cashier.name}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <PosClock />
          </div>
        </div>
      </div>

      {/* RIGHT: cart */}
      <div className="w-full overflow-hidden rounded-xl border shadow-sm lg:w-[400px] lg:shrink-0">
        <PosCart
          items={items}
          setItems={setItems}
          subtotal={subtotal}
          discount={discount}
          setDiscount={setDiscount}
          total={total}
          shiftNo={shift.shiftNo}
          customer={customer}
          onAttachCustomer={() => setCustomerOpen(true)}
          onClearCustomer={() => setCustomer(null)}
          onCheckout={() => setPayOpen(true)}
          onCloseShift={() => setCloseShiftOpen(true)}
          onCashMove={() => setCashMoveOpen(true)}
          onShowBills={() => setBillsOpen(true)}
          onHold={() => setHoldOpen(true)}
          onRecall={() => setHeldOpen(true)}
        />
      </div>

      {/* Payment dialog */}
      <PosPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        total={total}
        subtotal={subtotal}
        discount={discount}
        shiftId={shift.id}
        userId={cashier.id}
        customerId={customer?.id}
        items={items.map((it) => ({
          productId: it.productId,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          total: it.price * it.quantity,
        }))}
        onPaid={onPaid}
      />

      {/* Close shift dialog */}
      <CloseShiftDialog
        open={closeShiftOpen}
        onOpenChange={setCloseShiftOpen}
        shift={shift}
        onClosed={refreshShift}
      />

      {/* Cash drawer dialog */}
      <CashDrawerDialog
        open={cashMoveOpen}
        onOpenChange={setCashMoveOpen}
        shiftId={shift.id}
        onDone={() => setRefreshKey((k) => k + 1)}
      />

      {/* Bills history sheet */}
      <BillsHistorySheet
        open={billsOpen}
        onOpenChange={setBillsOpen}
        shiftId={shift.id}
        key={refreshKey}
      />

      {/* Customer attach dialog */}
      <CustomerAttachDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onAttach={(c) => {
          setCustomer(c)
          setCustomerOpen(false)
          toast.success(`แนบลูกค้า ${c.name}`)
        }}
      />

      {/* Held bills (recall) sheet */}
      <HeldBillsSheet
        open={heldOpen}
        onOpenChange={setHeldOpen}
        shiftId={shift.id}
        onRecall={recallBill}
      />

      {/* Hold confirm dialog */}
      <HoldConfirmDialog
        open={holdOpen}
        onOpenChange={setHoldOpen}
        items={items}
        total={total}
        notes={holdNotes}
        setNotes={setHoldNotes}
        saving={holdSaving}
        onConfirm={holdBill}
      />
    </div>
  )
}

// ============================================================
// PosClock — isolated so the 30-second tick only re-renders this
// small subtree, not the whole POS terminal. Pauses when the tab
// is hidden to avoid unnecessary wakeups.
// ============================================================
function PosClock() {
  const [now, setNow] = React.useState<Date | null>(null)
  React.useEffect(() => {
    setNow(new Date())
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id == null) id = setInterval(() => setNow(new Date()), 30_000)
    }
    const stop = () => {
      if (id != null) {
        clearInterval(id)
        id = null
      }
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        setNow(new Date())
        start()
      }
    }
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  return (
    <span className="tabular-nums" suppressHydrationWarning>
      {now ? `${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.` : '--:--'}
    </span>
  )
}

function CategoryPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-medium transition-all',
        active
          ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)]'
          : 'border-border bg-card hover:border-[var(--gold)]/50'
      )}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  )
}

// ============================================================
// Bills history sheet
// ============================================================
function BillsHistorySheet({
  open,
  onOpenChange,
  shiftId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  shiftId: string
}) {
  const [bills, setBills] = React.useState<Array<{
    id: string
    billNo: string
    subtotal: number
    total: number
    paymentMethod: string
    status: string
    createdAt: string
    itemCount: number
    cashierName?: string
    items: { name: string; quantity: number; total: number }[]
  }>>([])
  const [loading, setLoading] = React.useState(false)
  const [voiding, setVoiding] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/pos/bills?shiftId=${shiftId}`)
      .then((r) => r.json())
      .then((d) => setBills(d.items ?? []))
      .catch(() => toast.error('โหลดบิลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [shiftId])

  React.useEffect(() => {
    if (open) load()
  }, [open, load])

  const voidBill = async (id: string, billNo: string) => {
    setVoiding(id)
    try {
      const res = await fetch(`/api/admin/pos/bills/${id}/void`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`ยกเลิกบิล ${billNo} แล้ว`)
      load()
    } catch (e: unknown) {
      toast.error('ยกเลิกบิลไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setVoiding(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>บิลย้อนหลัง</SheetTitle>
          <SheetDescription>บิลทั้งหมดในกะปัจจุบัน — สามารถยกเลิกได้</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : bills.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">ยังไม่มีบิลในกะนี้</div>
            ) : (
              bills.map((b) => (
                <div key={b.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm font-bold">{b.billNo}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatThaiDateTime(new Date(b.createdAt))} · {b.cashierName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[var(--gold)]">{formatBaht(b.total)}</div>
                      <Badge variant="outline" className={cn(
                        'text-[9px]',
                        b.status === 'COMPLETED'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                      )}>
                        {b.status === 'COMPLETED' ? 'สำเร็จ' : 'ยกเลิกแล้ว'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {b.items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{it.quantity}× {it.name}</span>
                        <span className="tabular-nums">{formatBaht(it.total)}</span>
                      </div>
                    ))}
                  </div>
                  {b.status === 'COMPLETED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-7 w-full text-xs text-red-600"
                      disabled={voiding === b.id}
                      onClick={() => voidBill(b.id, b.billNo)}
                    >
                      {voiding === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      ยกเลิกบิลนี้
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================
// Customer attach dialog
// ============================================================
function CustomerAttachDialog({
  open,
  onOpenChange,
  onAttach,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAttach: (c: { id?: string; name: string; phone?: string; tier?: string }) => void
}) {
  const [phone, setPhone] = React.useState('')
  const [results, setResults] = React.useState<Array<{ id: string; name: string; phone: string; tier: string; points: number }>>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setPhone('')
      setResults([])
    }
  }, [open])

  React.useEffect(() => {
    if (!phone || phone.length < 3) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      setLoading(true)
      fetch(`/api/admin/customers?q=${encodeURIComponent(phone)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.customers ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [phone])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>เพิ่มลูกค้า</DialogTitle>
          <DialogDescription>ค้นหาด้วยชื่อหรือเบอร์โทร</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="ค้นหา…"
          className="h-11"
        />
        <ScrollArea className="max-h-72">
          <div className="space-y-1">
            {loading && <Skeleton className="h-12 w-full" />}
            {!loading && results.length === 0 && phone.length >= 3 && (
              <p className="py-4 text-center text-sm text-muted-foreground">ไม่พบลูกค้า</p>
            )}
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onAttach({ id: c.id, name: c.name, phone: c.phone, tier: c.tier })}
                className="flex w-full items-center justify-between rounded-lg border bg-card p-2 text-left hover:bg-muted/30"
              >
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone} · {toThaiNumerals(c.points)} แต้ม</div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{c.tier}</Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onAttach({ name: 'ลูกค้าทั่วไป' })}>
            ใช้ "ลูกค้าทั่วไป"
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Held bills (recall) sheet
// ============================================================
function HeldBillsSheet({
  open,
  onOpenChange,
  shiftId,
  onRecall,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  shiftId: string
  onRecall: (id: string) => Promise<void> | void
}) {
  const [held, setHeld] = React.useState<Array<{
    id: string
    holdCode: string
    subtotal: number
    discount: number
    total: number
    notes: string | null
    customerName: string | null
    itemCount: number
    userName: string | null
    createdAt: string
  }>>([])
  const [loading, setLoading] = React.useState(false)
  const [recalling, setRecalling] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/pos/hold?shiftId=${shiftId}`)
      .then((r) => r.json())
      .then((d) => setHeld(d.items ?? []))
      .catch(() => toast.error('โหลดบิลที่พักไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [shiftId])

  React.useEffect(() => {
    if (open) load()
  }, [open, load])

  const handleRecall = async (id: string) => {
    setRecalling(id)
    try {
      await onRecall(id)
    } finally {
      setRecalling(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>บิลที่พักไว้</SheetTitle>
          <SheetDescription>เลือกบิลเพื่อเรียกกลับมาทำรายการต่อ</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : held.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <div className="mb-2 text-4xl">📥</div>
                ยังไม่มีบิลที่พักไว้
              </div>
            ) : (
              held.map((h) => (
                <div key={h.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm font-bold text-[var(--gold)]">{h.holdCode}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatThaiDateTime(new Date(h.createdAt))} · {h.userName ?? '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatBaht(h.total)}</div>
                      <Badge variant="secondary" className="text-[9px]">
                        {toThaiNumerals(h.itemCount)} รายการ
                      </Badge>
                    </div>
                  </div>
                  {(h.customerName || h.notes) && (
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {h.customerName && <div>👤 {h.customerName}</div>}
                      {h.notes && <div className="line-clamp-2">📝 {h.notes}</div>}
                    </div>
                  )}
                  <Button
                    size="sm"
                    className="mt-2 h-8 w-full gap-1"
                    disabled={recalling === h.id}
                    onClick={() => handleRecall(h.id)}
                  >
                    {recalling === h.id ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังเรียก…</>
                    ) : (
                      <><Play className="h-3.5 w-3.5" /> เรียกบิลนี้</>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ============================================================
// Hold confirm dialog
// ============================================================
function HoldConfirmDialog({
  open,
  onOpenChange,
  items,
  total,
  notes,
  setNotes,
  saving,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  items: CartItem[]
  total: number
  notes: string
  setNotes: (v: string) => void
  saving: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-[var(--gold)]" /> พักบิล
          </DialogTitle>
          <DialogDescription>
            ระบบจะเก็บตะกร้านี้ไว้ — สามารถกด "เรียกบิล" เพื่อดึงกลับมาทำรายการต่อ
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">จำนวนสินค้า</span>
            <span className="font-semibold">{toThaiNumerals(items.length)} รายการ</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">ยอดรวม</span>
            <span className="font-bold text-[var(--gold)]">{formatBaht(total)}</span>
          </div>
        </div>
        <div>
          <Label className="text-sm">หมายเหตุ (ถ้ามี)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="เช่น ลูกค้าไปลืมเงินในรถ"
            className="min-h-16"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={onConfirm} disabled={saving || items.length === 0}>
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> กำลังพัก…</>
            ) : (
              <><Pause className="h-4 w-4" /> ยืนยันพักบิล</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

