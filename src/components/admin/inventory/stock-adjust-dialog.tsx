'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, ArrowDown, RefreshCw, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MOVEMENT_TYPES, classifyStock } from '@/lib/admin-catalog'
import { formatNumber, toThaiNumerals } from '@/lib/thai-date'

type Row = {
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
  productName: string
  productType?: string | null
  status: 'OUT' | 'LOW' | 'SAFETY' | 'OK'
}

const ALLOWED = ['IN', 'OUT', 'ADJUST'] as const
type MoveType = (typeof ALLOWED)[number]

export function StockAdjustDialog({
  open,
  onOpenChange,
  row,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  row: Row
  onDone: () => void
}) {
  const [type, setType] = React.useState<MoveType>('IN')
  const [qty, setQty] = React.useState<number | ''>('')
  const [reason, setReason] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setType('IN')
      setQty('')
      setReason('')
    }
  }, [open, row.id])

  const qtyNum = qty === '' ? 0 : Number(qty)
  let projected = row.quantity
  if (type === 'IN') projected = row.quantity + qtyNum
  else if (type === 'OUT') projected = Math.max(0, row.quantity - qtyNum)
  else if (type === 'ADJUST') projected = qtyNum
  const projectedStatus = classifyStock(projected, row.reorderPoint, row.safetyStock)

  async function submit() {
    if (qtyNum <= 0) {
      toast.error('กรุณาระบุจำนวนที่มากกว่า 0')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: row.id,
          branchId: row.branchId,
          type,
          quantity: qtyNum,
          reason: reason.trim() || undefined,
          refType: 'MANUAL',
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'ปรับสต็อกไม่สำเร็จ')
      }
      toast.success(`${type === 'IN' ? 'รับเข้า' : type === 'OUT' ? 'เบิกออก' : 'ปรับปรุง'} ${toThaiNumerals(qtyNum)} ${row.unit} แล้ว`)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ปรับสต็อกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const TypeIcon = type === 'IN' ? ArrowUp : type === 'OUT' ? ArrowDown : RefreshCw

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[var(--gold)]" />
            ปรับสต็อก
          </DialogTitle>
          <DialogDescription>
            {row.productName} · {row.branchName}
          </DialogDescription>
        </DialogHeader>

        {/* Current stock summary */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">คงเหลือปัจจุบัน</p>
              <p className="text-2xl font-bold text-[var(--forest)] dark:text-[var(--gold)]">
                {formatNumber(row.quantity)} <span className="text-sm font-normal text-muted-foreground">{row.unit}</span>
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>สั่งซื้อ @ {formatNumber(row.reorderPoint)}</p>
              <p>ขั้นต่ำ {formatNumber(row.safetyStock)}</p>
              {row.batchNo && <p>แบตช์ {row.batchNo}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">ประเภทการเคลื่อนไหว</Label>
            <Select value={type} onValueChange={(v) => setType(v as MoveType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.filter((m) => ALLOWED.includes(m.value as MoveType)).map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label} ({m.value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {type === 'ADJUST' ? 'จำนวนนับได้จริง' : 'จำนวน'} ({row.unit})
            </Label>
            <Input
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">เหตุผล / หมายเหตุ</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น รับเข้าจากการผลิต, เบิกออกใช้ภายใน, ตรวจนับเหลือ..."
            />
          </div>

          {/* Projected total */}
          {qtyNum > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TypeIcon className="h-3.5 w-3.5" />
                  ยอดหลังปรับ
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground line-through">{formatNumber(row.quantity)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={`text-xl font-bold ${
                    projectedStatus === 'OUT' ? 'text-red-600'
                      : projectedStatus === 'SAFETY' ? 'text-red-600'
                      : projectedStatus === 'LOW' ? 'text-orange-600'
                      : 'text-emerald-600'
                  }`}>
                    {formatNumber(projected)}
                  </span>
                  <span className="text-sm text-muted-foreground">{row.unit}</span>
                </div>
              </div>
              <div className="mt-1.5 flex justify-end">
                <StatusBadge status={projectedStatus} />
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ยกเลิก</Button>
          <Button
            disabled={saving || qtyNum <= 0}
            onClick={submit}
            className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadge({ status }: { status: 'OUT' | 'LOW' | 'SAFETY' | 'OK' }) {
  const map = {
    OUT: { label: 'หมดสต็อก', cls: 'bg-red-500/15 text-red-700 dark:text-red-400' },
    SAFETY: { label: 'ต่ำกว่าขั้นต่ำ', cls: 'bg-red-500/15 text-red-700 dark:text-red-400' },
    LOW: { label: 'ต่ำกว่าจุดสั่งซื้อ', cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-400' },
    OK: { label: 'ปกติ', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  }[status]
  return <Badge className={map.cls} variant="outline">{map.label}</Badge>
}
