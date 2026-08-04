'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatBaht } from '@/lib/thai-date'

const TYPES = [
  { value: 'TOPUP', label: 'เติมเครดิต (TOPUP)', desc: 'เพิ่มเครดิตให้ลูกค้า' },
  { value: 'REFUND', label: 'คืนเงิน (REFUND)', desc: 'คืนเงินเป็นเครดิตร้าน' },
  { value: 'REWARD', label: 'รางวัล (REWARD)', desc: 'ให้เครดิตเป็นรางวัล' },
  { value: 'ADJUST', label: 'ปรับยอด (ADJUST)', desc: 'ปรับเพิ่ม/ลด ใช้เครื่องหมายลบ', allowNegative: true },
]

export function StoreCreditAdjustDialog({
  open, onOpenChange, customer, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customer: { id: string; name: string; balance: number } | null
  onSaved: () => void
}) {
  const [type, setType] = React.useState('TOPUP')
  const [amount, setAmount] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setType('TOPUP')
      setAmount('')
      setReason('')
    }
  }, [open, customer?.id])

  if (!customer) return null

  const allowNegative = TYPES.find((t) => t.value === type)?.allowNegative ?? false

  const submit = async () => {
    const amt = Number(amount)
    if (!amt || amt === 0) {
      toast.error('กรุณาระบุจำนวนเงิน (ไม่เป็น 0)')
      return
    }
    if (!allowNegative && amt <= 0) {
      toast.error('จำนวนเงินต้องมากกว่า 0')
      return
    }
    if (!reason.trim()) {
      toast.error('กรุณาระบุเหตุผล')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/customers/${customer.id}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: amt, reason }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'ไม่สำเร็จ')
      toast.success(`ปรับเครดิตเรียบร้อย · ยอดใหม่ ${formatBaht(j.balance)}`)
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ปรับเครดิตร้าน</DialogTitle>
          <DialogDescription>
            {customer.name} · คงเหลือ {formatBaht(customer.balance)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>ประเภท</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span>{t.label}</span>
                      <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>จำนวนเงิน {allowNegative && <span className="text-[10px] text-muted-foreground">(ลบเพื่อหัก)</span>}</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={allowNegative ? 'เช่น 100 หรือ -50' : 'เช่น 100'}
            />
          </div>
          <div className="space-y-1.5">
            <Label>เหตุผล</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น เติมเครดิตมือ, คืนเงินออเดอร์ KH000042"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
