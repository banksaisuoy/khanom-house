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

const TYPES = [
  { value: 'EARN', label: 'รับแต้ม (EARN)', desc: 'เพิ่มแต้มให้ลูกค้า' },
  { value: 'BONUS', label: 'แต้มโบนัส (BONUS)', desc: 'เพิ่มแต้มพิเศษ' },
  { value: 'REDEEM', label: 'ใช้แต้ม (REDEEM)', desc: 'หักแต้มที่ใช้' },
  { value: 'EXPIRE', label: 'หมดอายุ (EXPIRE)', desc: 'หักแต้มที่หมดอายุ' },
]

export function LoyaltyAdjustDialog({
  open, onOpenChange, customer, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customer: { id: string; name: string; points: number; tier: string } | null
  onSaved: () => void
}) {
  const [type, setType] = React.useState('EARN')
  const [points, setPoints] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setType('EARN')
      setPoints('')
      setReason('')
    }
  }, [open, customer?.id])

  if (!customer) return null

  const submit = async () => {
    const pts = Number(points)
    if (!pts || pts <= 0) {
      toast.error('กรุณาระบุจำนวนแต้ม (มากกว่า 0)')
      return
    }
    if (!reason.trim()) {
      toast.error('กรุณาระบุเหตุผล')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/customers/${customer.id}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, points: pts, reason }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || 'ไม่สำเร็จ')
      }
      const j = await r.json()
      if (j.tierUpgraded) {
        toast.success(`ปรับแต้มเรียบร้อย · อัปเกรดเป็น ${j.tier}`)
      } else {
        toast.success('ปรับแต้มเรียบร้อย')
      }
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
          <DialogTitle>ปรับแต้มสะสม</DialogTitle>
          <DialogDescription>
            {customer.name} · แต้มปัจจุบัน {customer.points} · Tier {customer.tier}
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
            <Label>จำนวนแต้ม</Label>
            <Input
              type="number" min={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="เช่น 100"
            />
          </div>
          <div className="space-y-1.5">
            <Label>เหตุผล</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ซื้อสินค้าครบ 1,000 บาท, ลูกค้าแจ้งปรับแต้ม"
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
