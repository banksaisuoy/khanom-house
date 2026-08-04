'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatBaht } from '@/lib/thai-date'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  shiftId: string
  onDone?: () => void
}

export function CashDrawerDialog({ open, onOpenChange, shiftId, onDone }: Props) {
  const [type, setType] = React.useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN')
  const [amount, setAmount] = React.useState(0)
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setType('CASH_IN')
      setAmount(0)
      setReason('')
    }
  }, [open])

  const submit = async () => {
    if (amount <= 0) {
      toast.error('จำนวนเงินต้องมากกว่า 0')
      return
    }
    if (!reason.trim()) {
      toast.error('กรุณาระบุเหตุผล')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/pos/shift/${shiftId}/cash-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${type === 'CASH_IN' ? 'รับเข้า' : 'จ่ายออก'} ${formatBaht(amount)} แล้ว`)
      onOpenChange(false)
      onDone?.()
    } catch (e: unknown) {
      toast.error('บันทึกไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>เคลื่อนไหวเงินในลิ้นชัก</DialogTitle>
          <DialogDescription>รับเงินเข้า/จ่ายออก พร้อมบันทึกเหตุผล</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('CASH_IN')}
            className={cn(
              'flex h-16 flex-col items-center justify-center gap-1 rounded-lg border-2 transition-colors',
              type === 'CASH_IN'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-border hover:border-emerald-500/50'
            )}
          >
            <ArrowDownToLine className="h-5 w-5" />
            <span className="text-sm font-medium">รับเข้า</span>
          </button>
          <button
            type="button"
            onClick={() => setType('CASH_OUT')}
            className={cn(
              'flex h-16 flex-col items-center justify-center gap-1 rounded-lg border-2 transition-colors',
              type === 'CASH_OUT'
                ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                : 'border-border hover:border-red-500/50'
            )}
          >
            <ArrowUpFromLine className="h-5 w-5" />
            <span className="text-sm font-medium">จ่ายออก</span>
          </button>
        </div>

        <div className="space-y-2">
          <Label>จำนวนเงิน (฿)</Label>
          <Input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="h-12 text-center text-xl font-bold tabular-nums"
          />
        </div>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เหตุผล เช่น ทอนเงินขาด, เบิกใช้ซื้อของ, เปลี่ยนแบงค์"
          className="min-h-16"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={submitting} size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            ยืนยัน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
