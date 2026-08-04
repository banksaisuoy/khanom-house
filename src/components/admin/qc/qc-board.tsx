'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toThaiNumerals, formatThaiDateTime } from '@/lib/thai-date'
import { getProductVisual } from '@/lib/product-emoji'
import { cn } from '@/lib/utils'
import type { BatchDTO } from '@/components/admin/kitchen/batch-card'

interface Props {
  initialPending: BatchDTO[]
  initialPassed: BatchDTO[]
}

const QC_ITEMS = [
  { key: 'shape', label: 'รูปทรงถูกต้อง' },
  { key: 'color', label: 'สีสันสดใส' },
  { key: 'taste', label: 'กลิ่นรสชาติ' },
  { key: 'clean', label: 'ความสะอาด' },
  { key: 'temp', label: 'อุณหภูมิเหมาะสม' },
]

interface QcFormState {
  checks: Record<string, boolean>
  status: 'PASS' | 'FAIL'
  note: string
  wasteQty: number
  wasteReason: string
}

export function QcBoard({ initialPending, initialPassed }: Props) {
  const [pending, setPending] = React.useState<BatchDTO[]>(initialPending)
  const [passed, setPassed] = React.useState<BatchDTO[]>(initialPassed)
  const [forms, setForms] = React.useState<Record<string, QcFormState>>({})
  const [busy, setBusy] = React.useState<string | null>(null)

  // Stats
  const today = new Date().toDateString()
  const todayPassed = passed.filter((b) => b.completedAt && new Date(b.completedAt).toDateString() === today).length
  const todayFailed = pending.length // pending ones haven't been judged; this is rough
  const totalJudged = todayPassed + todayFailed
  const passRate = totalJudged > 0 ? Math.round((todayPassed / totalJudged) * 100) : 0

  const getForm = (id: string): QcFormState => {
    if (!forms[id]) {
      return {
        checks: {},
        status: 'PASS',
        note: '',
        wasteQty: 0,
        wasteReason: '',
      }
    }
    return forms[id]
  }
  const setForm = (id: string, patch: Partial<QcFormState>) => {
    setForms((prev) => ({
      ...prev,
      [id]: { ...getForm(id), ...patch },
    }))
  }
  const toggleCheck = (id: string, key: string) => {
    const f = getForm(id)
    setForm(id, { checks: { ...f.checks, [key]: !f.checks[key] } })
  }

  const submitQc = async (batch: BatchDTO) => {
    const f = getForm(batch.id)
    setBusy(batch.id)
    try {
      const res = await fetch(`/api/admin/production/${batch.id}/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: f.status,
          note: f.note || `${QC_ITEMS.filter((i) => f.checks[i.key]).length}/${QC_ITEMS.length} ข้อผ่าน`,
          logWaste: f.status === 'FAIL' && f.wasteQty > 0
            ? { quantity: f.wasteQty, reason: f.wasteReason || 'QC FAIL' }
            : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(f.status === 'PASS' ? `✓ ${batch.productName} ผ่าน QC` : `✗ ${batch.productName} ไม่ผ่าน QC`)
      // Refresh from server
      await refresh()
      // Clear form
      setForms((prev) => {
        const next = { ...prev }
        delete next[batch.id]
        return next
      })
    } catch (e: unknown) {
      toast.error('บันทึก QC ไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const refresh = async () => {
    try {
      const res = await fetch('/api/admin/production')
      const data = await res.json()
      const all: BatchDTO[] = data.items ?? []
      setPending(all.filter((b) => b.status === 'QC' && (!b.qcStatus || b.qcStatus === 'PENDING')))
      setPassed(all.filter((b) => b.qcStatus === 'PASS'))
    } catch {
      /* silent */
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-7 w-7 text-[var(--gold)]" /> ควบคุมคุณภาพ (QC)
        </h1>
        <p className="text-sm text-muted-foreground">ตรวจสอบคุณภาพขนมก่อนส่งมอบ — เช็คลิสต์ 5 ข้อ</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">ผ่าน</div>
            <div className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {toThaiNumerals(todayPassed)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">ไม่ผ่าน / รอตรวจ</div>
            <div className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {toThaiNumerals(pending.length)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">อัตราผ่าน</div>
            <div className="text-3xl font-bold tabular-nums text-[var(--gold)]">
              {toThaiNumerals(passRate)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending QC */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold">รอ QC ({toThaiNumerals(pending.length)})</h2>
          </div>
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                <ShieldCheck className="mx-auto mb-2 h-10 w-10 opacity-30" />
                ไม่มีคิวรอตรวจ QC
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-260px)]">
              <div className="space-y-3 pr-1">
                <AnimatePresence>
                  {pending.map((b) => (
                    <QcCard
                      key={b.id}
                      batch={b}
                      form={getForm(b.id)}
                      busy={busy === b.id}
                      onToggleCheck={(k) => toggleCheck(b.id, k)}
                      onChangeForm={(p) => setForm(b.id, p)}
                      onSubmit={() => submitQc(b)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Passed today */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold">ผ่านแล้ว ({toThaiNumerals(passed.length)})</h2>
          </div>
          {passed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-10 w-10 opacity-30" />
                ยังไม่มีรายการที่ผ่าน QC วันนี้
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-260px)]">
              <div className="space-y-2 pr-1">
                {passed.map((b) => {
                  const v = getProductVisual(b.productSlug, b.productName, b.productType)
                  return (
                    <Card key={b.id}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <span className="text-3xl">{v.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{b.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.batchNo} · ได้ {toThaiNumerals(b.producedQty)} {b.unit}
                            {b.wastedQty > 0 && <span className="text-red-500"> · เสีย {toThaiNumerals(b.wastedQty)}</span>}
                          </div>
                          {b.completedAt && (
                            <div className="text-[10px] text-muted-foreground">
                              {formatThaiDateTime(new Date(b.completedAt))}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          ✓ ผ่าน
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// QC card with checklist form
// ============================================================
function QcCard({
  batch,
  form,
  busy,
  onToggleCheck,
  onChangeForm,
  onSubmit,
}: {
  batch: BatchDTO
  form: QcFormState
  busy: boolean
  onToggleCheck: (key: string) => void
  onChangeForm: (patch: Partial<QcFormState>) => void
  onSubmit: () => void
}) {
  const v = getProductVisual(batch.productSlug, batch.productName, batch.productType)
  const checkedCount = Object.values(form.checks).filter(Boolean).length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card>
        <CardContent className="space-y-3 p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <span className="text-4xl">{v.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{batch.productName}</div>
              <div className="text-xs text-muted-foreground">
                {batch.batchNo} · ได้ {toThaiNumerals(batch.producedQty)} {batch.unit}
              </div>
            </div>
            <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400">
              รอตรวจ
            </Badge>
          </div>

          {/* Checklist */}
          <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
            {QC_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={!!form.checks[item.key]}
                  onCheckedChange={() => onToggleCheck(item.key)}
                />
                <span className={cn(form.checks[item.key] && 'text-muted-foreground line-through')}>
                  {item.label}
                </span>
              </label>
            ))}
            <Separator className="my-1" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>ตรวจแล้ว</span>
              <span className="font-medium">{toThaiNumerals(checkedCount)}/{toThaiNumerals(QC_ITEMS.length)} ข้อ</span>
            </div>
          </div>

          {/* Status select */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeForm({ status: 'PASS' })}
              className={cn(
                'flex h-12 items-center justify-center gap-2 rounded-lg border-2 text-sm font-medium transition-colors',
                form.status === 'PASS'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-border hover:border-emerald-500/50'
              )}
            >
              <CheckCircle2 className="h-4 w-4" /> ผ่าน
            </button>
            <button
              type="button"
              onClick={() => onChangeForm({ status: 'FAIL' })}
              className={cn(
                'flex h-12 items-center justify-center gap-2 rounded-lg border-2 text-sm font-medium transition-colors',
                form.status === 'FAIL'
                  ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                  : 'border-border hover:border-red-500/50'
              )}
            >
              <XCircle className="h-4 w-4" /> ไม่ผ่าน
            </button>
          </div>

          {/* Note */}
          <Textarea
            value={form.note}
            onChange={(e) => onChangeForm({ note: e.target.value })}
            placeholder="หมายเหตุ QC (เช่น สีซีด 1 ถาด)"
            className="min-h-12 text-sm"
          />

          {/* Photo placeholder */}
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            <Camera className="mr-1 h-4 w-4" /> ถ่ายรูปประกอบ (เร็วๆ นี้)
          </div>

          {/* Waste section if FAIL */}
          {form.status === 'FAIL' && (
            <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">บันทึกของเสียจาก QC ไม่ผ่าน</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] text-muted-foreground">จำนวน ({batch.unit})</label>
                  <input
                    type="number"
                    min={0}
                    value={form.wasteQty || ''}
                    onChange={(e) => onChangeForm({ wasteQty: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-9 w-full rounded-md border bg-card px-2 text-sm tabular-nums"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground">เหตุผล</label>
                  <input
                    type="text"
                    value={form.wasteReason}
                    onChange={(e) => onChangeForm({ wasteReason: e.target.value })}
                    className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                    placeholder="เช่น สีซีด รูปไม่ได้ทรง"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            className="h-12 w-full text-base"
            disabled={busy}
            onClick={onSubmit}
            variant={form.status === 'PASS' ? 'default' : 'destructive'}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : form.status === 'PASS' ? (
              <><CheckCircle2 className="h-5 w-5" /> ยืนยันผ่าน QC</>
            ) : (
              <><XCircle className="h-5 w-5" /> ยืนยันไม่ผ่าน + บันทึกของเสีย</>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
