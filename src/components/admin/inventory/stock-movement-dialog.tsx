'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { History, ArrowUp, ArrowDown, RefreshCw, Trash2, Truck, ChefHat, ShoppingCart, ArrowLeftRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  movementColor,
  movementLabel,
  type InventoryDetailDTO,
} from '@/lib/admin-catalog'
import { formatNumber, formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'

type Row = {
  id: string
  branchName: string
  type: string
  quantity: number
  unit: string
  reorderPoint: number
  safetyStock: number
  batchNo?: string | null
  expiryAt?: string | null
  location?: string | null
  productName: string
  status: 'OUT' | 'LOW' | 'SAFETY' | 'OK'
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  IN: ArrowUp,
  OUT: ArrowDown,
  ADJUST: RefreshCw,
  TRANSFER: ArrowLeftRight,
  PRODUCTION: ChefHat,
  WASTE: Trash2,
  SALE: ShoppingCart,
}

export function StockMovementDialog({
  open,
  onOpenChange,
  row,
  detail,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  row: Row
  detail: InventoryDetailDTO | null
}) {
  const sign = (t: string) => (t === 'IN' || t === 'PRODUCTION' ? '+' : t === 'OUT' || t === 'WASTE' || t === 'SALE' ? '-' : '±')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-[var(--gold)]" />
            ประวัติการเคลื่อนไหวสต็อก
          </DialogTitle>
          <DialogDescription>
            {row.productName} · {row.branchName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 border-b bg-card px-6 py-3 text-center">
          <Stat label="คงเหลือ" value={`${formatNumber(detail?.quantity ?? row.quantity)} ${row.unit}`} tone={row.status === 'OUT' ? 'red' : row.status === 'LOW' || row.status === 'SAFETY' ? 'orange' : 'green'} />
          <Stat label="จุดสั่งซื้อ" value={formatNumber(detail?.reorderPoint ?? row.reorderPoint)} />
          <Stat label="สต็อกขั้นต่ำ" value={formatNumber(detail?.safetyStock ?? row.safetyStock)} />
        </div>

        <ScrollArea className="max-h-[55vh]">
          <div className="px-6 py-4">
            {!detail ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-14" />
                  </div>
                ))}
              </div>
            ) : detail.movements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-3xl">📭</div>
                <p className="font-medium">ยังไม่มีประวัติ</p>
                <p className="text-sm text-muted-foreground">ยังไม่เคยมีการเคลื่อนไหวสต็อกสำหรับรายการนี้</p>
              </div>
            ) : (
              <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                {detail.movements.map((m, i) => {
                  const Icon = ICONS[m.type] ?? ArrowLeftRight
                  const color = movementColor(m.type)
                  return (
                    <motion.li
                      key={m.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="relative flex gap-3"
                    >
                      <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${m.type === 'IN' || m.type === 'PRODUCTION' ? 'bg-emerald-500/15 text-emerald-600' : m.type === 'OUT' || m.type === 'WASTE' || m.type === 'SALE' ? 'bg-rose-500/15 text-rose-600' : 'bg-amber-500/15 text-amber-600'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 border-l border-transparent pb-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`text-sm font-semibold ${color}`}>
                            {movementLabel(m.type)} {sign(m.type)}{formatNumber(m.quantity)} {detail.unit}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatThaiDateTime(new Date(m.createdAt))}
                          </span>
                        </div>
                        {m.reason && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{m.reason}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          {m.userName && (
                            <Badge variant="outline" className="font-normal py-0">👤 {m.userName}</Badge>
                          )}
                          {m.refType && (
                            <Badge variant="outline" className="font-normal py-0">📎 {m.refType}{m.refId ? ` · ${m.refId.slice(-6)}` : ''}</Badge>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </ol>
            )}
          </div>
        </ScrollArea>

        <Separator />
        <div className="flex items-center justify-between px-6 py-3 text-xs text-muted-foreground">
          <span>แสดง {detail ? toThaiNumerals(detail.movements.length) : '-'} รายการล่าสุด</span>
          <span>อัปเดต {detail ? formatThaiDateTime(new Date(detail.updatedAt)) : '-'}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'orange' | 'green' }) {
  const c = tone === 'red' ? 'text-red-600 dark:text-red-400' : tone === 'orange' ? 'text-orange-600 dark:text-orange-400' : tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : ''
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${c}`}>{value}</p>
    </div>
  )
}
