'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Flame, ShieldCheck, CheckCircle2, Plus, ChefHat, Loader2, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toThaiNumerals, formatThaiTime } from '@/lib/thai-date'
import { cn } from '@/lib/utils'
import { BatchCard, type BatchDTO } from './batch-card'
import { RecipeSheet } from './recipe-sheet'
import { StartProductionDialog } from './start-production-dialog'

interface Props {
  initialBatches: BatchDTO[]
  branchName: string
}

// Module-level constant so the kanban columns array is referentially stable
// across renders — lets `grouped` useMemo key off `batches` only.
const KITCHEN_COLUMNS: { status: string; label: string; icon: React.ElementType; cls: string }[] = [
  { status: 'QUEUED', label: 'รอคิว', icon: Clock, cls: 'text-amber-600 dark:text-amber-400' },
  { status: 'COOKING', label: 'กำลังทำ', icon: Flame, cls: 'text-orange-600 dark:text-orange-400' },
  { status: 'QC', label: 'รอ QC', icon: ShieldCheck, cls: 'text-violet-600 dark:text-violet-400' },
  { status: 'COMPLETED', label: 'เสร็จแล้ว', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
]

export function KitchenBoard({ initialBatches, branchName }: Props) {
  const [batches, setBatches] = React.useState<BatchDTO[]>(initialBatches)
  const [loading, setLoading] = React.useState(false)
  const [startOpen, setStartOpen] = React.useState(false)
  const [recipeBatch, setRecipeBatch] = React.useState<BatchDTO | null>(null)
  const [completeBatch, setCompleteBatch] = React.useState<BatchDTO | null>(null)
  const [wasteBatch, setWasteBatch] = React.useState<BatchDTO | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/production')
      const data = await res.json()
      if (data.items) setBatches(data.items)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  const startBatch = async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/production/${id}/start`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('เริ่มผลิตแล้ว')
      await refresh()
    } catch (e: unknown) {
      toast.error('เริ่มผลิตไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const cancelBatch = async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/production/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('ยกเลิกคิวแล้ว')
      await refresh()
    } catch (e: unknown) {
      toast.error('ยกเลิกไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const submitComplete = async (producedQty: number, wastedQty: number, notes: string) => {
    if (!completeBatch) return
    setBusy(completeBatch.id)
    try {
      const res = await fetch(`/api/admin/production/${completeBatch.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producedQty, wastedQty, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`บันทึกผลผลิตแล้ว · ได้ ${toThaiNumerals(producedQty)} ${completeBatch.unit}`)
      setCompleteBatch(null)
      await refresh()
    } catch (e: unknown) {
      toast.error('บันทึกผลผลิตไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const submitWaste = async (qty: number, reason: string) => {
    if (!wasteBatch) return
    // Add waste as additional wastedQty via PATCH
    setBusy(wasteBatch.id)
    try {
      const newWaste = wasteBatch.wastedQty + qty
      const res = await fetch(`/api/admin/production/${wasteBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wastedQty: newWaste, notes: `${wasteBatch.notes ?? ''}\n+ของเสีย ${qty}: ${reason}`.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`บันทึกของเสีย ${toThaiNumerals(qty)} ${wasteBatch.unit}`)
      setWasteBatch(null)
      await refresh()
    } catch (e: unknown) {
      toast.error('บันทึกของเสียไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  // Columns
  const columns = KITCHEN_COLUMNS

  // Stats — memoized so the three .filter() calls only re-run when batches
  // change, not on every parent re-render (e.g. when the KitchenClock ticks).
  const stats = React.useMemo(() => {
    const todayStr = new Date().toDateString()
    const todayCompleted = batches.filter(
      (b) =>
        b.status === 'COMPLETED' &&
        b.completedAt &&
        new Date(b.completedAt).toDateString() === todayStr
    ).length
    return [
      { label: 'รอผลิต', value: batches.filter((b) => b.status === 'QUEUED').length, tone: 'amber' },
      { label: 'กำลังทำ', value: batches.filter((b) => b.status === 'COOKING').length, tone: 'orange' },
      { label: 'รอ QC', value: batches.filter((b) => b.status === 'QC').length, tone: 'violet' },
      { label: 'เสร็จวันนี้', value: todayCompleted, tone: 'emerald' },
    ]
  }, [batches])

  // Group batches by status once, so the kanban render doesn't re-filter
  // the full list for each of the 4 columns.
  const grouped = React.useMemo(() => {
    const map = new Map<string, BatchDTO[]>()
    for (const col of KITCHEN_COLUMNS) map.set(col.status, [])
    for (const b of batches) {
      const arr = map.get(b.status)
      if (arr) arr.push(b)
    }
    return map
  }, [batches])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ChefHat className="h-7 w-7 text-[var(--gold)]" />
            ห้องครัว — คิวผลิต
          </h1>
          <p className="text-sm text-muted-foreground">{branchName}</p>
        </div>
        <div className="flex items-center gap-3">
          <KitchenClock />
          <Button size="lg" onClick={() => setStartOpen(true)} className="h-14 text-base">
            <Plus className="h-5 w-5" /> เริ่มผลิตใหม่
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={cn(
                'text-3xl font-bold tabular-nums',
                s.tone === 'amber' && 'text-amber-600 dark:text-amber-400',
                s.tone === 'orange' && 'text-orange-600 dark:text-orange-400',
                s.tone === 'violet' && 'text-violet-600 dark:text-violet-400',
                s.tone === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
              )}>
                {toThaiNumerals(s.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban */}
      {batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <div className="text-5xl">🍳</div>
            <p className="font-medium">ไม่มีคิวผลิตในขณะนี้</p>
            <Button className="mt-2" onClick={() => setStartOpen(true)}>
              <Plus className="h-4 w-4" /> เริ่มผลิตใหม่
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {columns.map((col) => {
            const items = grouped.get(col.status) ?? []
            const Icon = col.icon
            return (
              <div
                key={col.status}
                className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 lg:w-auto lg:shrink"
              >
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn('h-4 w-4', col.cls)} />
                    <span className="font-semibold">{col.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{toThaiNumerals(items.length)}</Badge>
                </div>
                <ScrollArea className="max-h-[calc(100vh-280px)]">
                  <div className="space-y-2 p-2">
                    <AnimatePresence>
                      {items.map((b) => (
                        <BatchCard
                          key={b.id}
                          batch={b}
                          onStart={startBatch}
                          onComplete={setCompleteBatch}
                          onAddWaste={setWasteBatch}
                          onCancel={cancelBatch}
                          onViewRecipe={setRecipeBatch}
                        />
                      ))}
                    </AnimatePresence>
                    {items.length === 0 && (
                      <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                        — ว่าง —
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )
          })}
        </div>
      )}

      {/* Recipe sheet */}
      <RecipeSheet
        batch={recipeBatch}
        open={!!recipeBatch}
        onOpenChange={(v) => !v && setRecipeBatch(null)}
      />

      {/* Start production dialog */}
      <StartProductionDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        onCreated={() => {
          refresh()
          toast.success('สร้างคิวผลิตแล้ว')
        }}
      />

      {/* Complete dialog */}
      <CompleteDialog
        batch={completeBatch}
        open={!!completeBatch}
        onOpenChange={(v) => !v && setCompleteBatch(null)}
        busy={busy === completeBatch?.id}
        onSubmit={submitComplete}
      />

      {/* Waste dialog */}
      <WasteDialog
        batch={wasteBatch}
        open={!!wasteBatch}
        onOpenChange={(v) => !v && setWasteBatch(null)}
        busy={busy === wasteBatch?.id}
        onSubmit={submitWaste}
      />
    </div>
  )
}

// ============================================================
// Kitchen clock — isolated so the 1-second tick does not re-render
// the whole board. Pauses the interval when the tab is hidden to
// avoid unnecessary CPU/battery drain.
// ============================================================
function KitchenClock() {
  const [now, setNow] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setNow(new Date())
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id == null) {
        id = setInterval(() => setNow(new Date()), 1000)
      }
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
        // Refresh immediately on resume so the clock isn't stale.
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
    <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 shadow-sm">
      <Timer className="h-5 w-5 text-[var(--gold)]" />
      <div className="text-right">
        <div className="font-mono text-2xl font-bold tabular-nums" suppressHydrationWarning>
          {now
            ? now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '--:--:--'}
        </div>
        <div className="text-[10px] text-muted-foreground" suppressHydrationWarning>
          {now ? now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' }) : '\u00A0'}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Complete dialog
// ============================================================
function CompleteDialog({
  batch,
  open,
  onOpenChange,
  busy,
  onSubmit,
}: {
  batch: BatchDTO | null
  open: boolean
  onOpenChange: (v: boolean) => void
  busy: boolean
  onSubmit: (producedQty: number, wastedQty: number, notes: string) => void
}) {
  const [produced, setProduced] = React.useState(0)
  const [wasted, setWasted] = React.useState(0)
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (batch && open) {
      setProduced(batch.plannedQty)
      setWasted(0)
      setNotes('')
    }
  }, [batch, open])

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> บันทึกผลผลิต
          </DialogTitle>
          <DialogDescription>
            {batch.productName} · {batch.batchNo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-muted/30 p-2 text-center text-sm">
            แผนผลิต <b>{toThaiNumerals(batch.plannedQty)} {batch.unit}</b>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ผลผลิตที่ได้</Label>
              <Input
                type="number"
                min={0}
                value={produced}
                onChange={(e) => setProduced(Math.max(0, Number(e.target.value) || 0))}
                className="h-12 text-center text-xl font-bold tabular-nums"
              />
            </div>
            <div>
              <Label>ของเสีย</Label>
              <Input
                type="number"
                min={0}
                value={wasted}
                onChange={(e) => setWasted(Math.max(0, Number(e.target.value) || 0))}
                className="h-12 text-center text-xl font-bold tabular-nums"
              />
            </div>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="หมายเหตุ (เช่น นึ่งไม่สุก 1 ถาด)"
            className="min-h-16"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>ยกเลิก</Button>
          <Button size="lg" disabled={busy} onClick={() => onSubmit(produced, wasted, notes)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            ยืนยัน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Waste dialog
// ============================================================
function WasteDialog({
  batch,
  open,
  onOpenChange,
  busy,
  onSubmit,
}: {
  batch: BatchDTO | null
  open: boolean
  onOpenChange: (v: boolean) => void
  busy: boolean
  onSubmit: (qty: number, reason: string) => void
}) {
  const [qty, setQty] = React.useState(1)
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setQty(1)
      setReason('')
    }
  }, [open])

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>บันทึกของเสียเพิ่ม</DialogTitle>
          <DialogDescription>{batch.productName} · {batch.batchNo}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>จำนวนที่เสีย ({batch.unit})</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="h-12 text-center text-xl font-bold tabular-nums"
            />
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เหตุผล เช่น ไหม้, รูปทรงผิด, หกตอนยก"
            className="min-h-16"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>ยกเลิก</Button>
          <Button disabled={busy} onClick={() => onSubmit(qty, reason)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
