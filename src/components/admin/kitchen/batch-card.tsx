'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Clock, Flame, ShieldCheck, CheckCircle2, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { getProductVisual } from '@/lib/product-emoji'
import { cn } from '@/lib/utils'

export interface BatchDTO {
  id: string
  batchNo: string
  productId: string
  productName: string
  productSlug: string
  productType: string
  unit: string
  plannedQty: number
  producedQty: number
  wastedQty: number
  status: string
  priority: number
  startedAt: string | null
  completedAt: string | null
  qcStatus: string | null
  qcNote: string | null
  notes: string | null
  createdAt: string
  cookName: string | null
  recipe: {
    yieldQty: number
    yieldUnit: string
    prepTimeMin: number
    cookTimeMin: number
    instructions: string | null
    items: { ingredientName: string; quantity: number; unit: string; costPerUnit: number }[]
  } | null
}

interface Props {
  batch: BatchDTO
  onStart?: (id: string) => void
  onComplete?: (batch: BatchDTO) => void
  onAddWaste?: (batch: BatchDTO) => void
  onCancel?: (id: string) => void
  onViewRecipe?: (batch: BatchDTO) => void
}

// Live elapsed timer for COOKING batches
function useElapsed(startedAt: string | null) {
  // Start with null so server and first client render agree on a neutral
  // value; the real elapsed time is computed after mount in an effect.
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (!startedAt) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [startedAt])
  if (!startedAt) return 0
  if (now == null) return 0
  return Math.floor((now - new Date(startedAt).getTime()) / 60000)
}

const PRIORITY_CONFIG: Record<number, { label: string; cls: string }> = {
  2: { label: 'ด่วนมาก', cls: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30' },
  1: { label: 'ด่วน', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  0: { label: 'ปกติ', cls: 'bg-muted text-muted-foreground border-border' },
}

export function BatchCard({ batch, onStart, onComplete, onAddWaste, onCancel, onViewRecipe }: Props) {
  const elapsed = useElapsed(batch.startedAt)
  const v = getProductVisual(batch.productSlug, batch.productName, batch.productType)
  const progress = batch.plannedQty > 0 ? Math.min(100, (batch.producedQty / batch.plannedQty) * 100) : 0
  const cookTime = batch.recipe?.cookTimeMin ?? 60
  const overdue = batch.status === 'COOKING' && elapsed > cookTime

  const statusCfg: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    QUEUED: { label: 'รอคิว', icon: Clock, cls: 'text-amber-600 dark:text-amber-400' },
    COOKING: { label: 'กำลังทำ', icon: Flame, cls: 'text-orange-600 dark:text-orange-400' },
    QC: { label: 'รอ QC', icon: ShieldCheck, cls: 'text-violet-600 dark:text-violet-400' },
    COMPLETED: { label: 'เสร็จแล้ว', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
    CANCELLED: { label: 'ยกเลิก', icon: X, cls: 'text-red-600 dark:text-red-400' },
  }
  const cfg = statusCfg[batch.status] ?? statusCfg.QUEUED
  const StatusIcon = cfg.icon
  const prio = PRIORITY_CONFIG[batch.priority] ?? PRIORITY_CONFIG[0]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl border bg-card p-3 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{v.emoji}</span>
          <div>
            <div className="font-bold leading-tight">{batch.productName}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{batch.batchNo}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className={cn('text-[10px]', prio.cls)}>
            {prio.label}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px]', cfg.cls)}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Quantity */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">แผนผลิต</span>
        <span className="font-bold tabular-nums">
          {toThaiNumerals(batch.plannedQty)} {batch.unit}
        </span>
      </div>

      {/* Progress (only if COOKING/QC/COMPLETED) */}
      {batch.status !== 'QUEUED' && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-2 flex-1 [&>div]:bg-[var(--gold)]" />
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {toThaiNumerals(batch.producedQty)}/{toThaiNumerals(batch.plannedQty)}
            </span>
          </div>
          {batch.wastedQty > 0 && (
            <div className="mt-1 text-[10px] text-red-600 dark:text-red-400">
              เสีย {toThaiNumerals(batch.wastedQty)} {batch.unit}
            </div>
          )}
        </div>
      )}

      {/* Timer for COOKING */}
      {batch.status === 'COOKING' && batch.startedAt && (
        <div className={cn(
          'mt-2 flex items-center justify-between rounded-lg border px-2 py-1 text-xs',
          overdue
            ? 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400'
            : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300'
        )}>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> ทำมาแล้ว
          </span>
          <span className="font-mono font-bold tabular-nums" suppressHydrationWarning>
            {toThaiNumerals(elapsed)} นาที
          </span>
        </div>
      )}
      {overdue && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" /> เกินเวลาที่กะไว้ ({toThaiNumerals(cookTime)} นาที)
        </div>
      )}

      {/* QC stamp for COMPLETED */}
      {batch.status === 'COMPLETED' && (
        <div className={cn(
          'mt-2 rounded-lg border px-2 py-1.5 text-center text-xs font-medium',
          batch.qcStatus === 'PASS'
            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
            : batch.qcStatus === 'FAIL'
              ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400'
              : 'border-muted bg-muted/30 text-muted-foreground'
        )}>
          {batch.qcStatus === 'PASS' ? '✓ ผ่าน QC' : batch.qcStatus === 'FAIL' ? '✗ ไม่ผ่าน QC' : 'รอ QC'}
          {batch.producedQty > 0 && (
            <span className="ml-1">· ได้ {toThaiNumerals(batch.producedQty)} {batch.unit}</span>
          )}
        </div>
      )}

      {/* Cook */}
      {batch.cookName && (
        <div className="mt-2 text-[10px] text-muted-foreground">
          โดย {batch.cookName}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 space-y-2">
        {batch.status === 'QUEUED' && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              className="h-12 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600"
              onClick={() => onStart?.(batch.id)}
            >
              <Flame className="h-5 w-5" /> เริ่มทำ
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 text-red-600"
              onClick={() => onCancel?.(batch.id)}
            >
              <X className="h-5 w-5" /> ยกเลิก
            </Button>
          </div>
        )}

        {batch.status === 'COOKING' && (
          <>
            <Button
              size="lg"
              className="h-12 w-full"
              onClick={() => onComplete?.(batch)}
            >
              <CheckCircle2 className="h-5 w-5" /> บันทึกผลผลิต
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-9" onClick={() => onAddWaste?.(batch)}>
                + ของเสีย
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => onViewRecipe?.(batch)}>
                ดูสูตร
              </Button>
            </div>
          </>
        )}

        {batch.status === 'QC' && (
          <div className="rounded-lg bg-violet-500/5 px-3 py-2 text-center text-xs text-violet-700 dark:text-violet-400">
            <ShieldCheck className="mx-auto mb-1 h-4 w-4" />
            ส่งไปตรวจ QC แล้ว — รอการตรวจที่หน้า QC
          </div>
        )}

        {(batch.status === 'QUEUED' || batch.status === 'COOKING') && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-full text-xs"
            onClick={() => onViewRecipe?.(batch)}
          >
            ดูสูตร
          </Button>
        )}
      </div>
    </motion.div>
  )
}
