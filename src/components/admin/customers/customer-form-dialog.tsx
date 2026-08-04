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

export type CustomerFormValues = {
  id?: string
  name: string
  phone: string
  email?: string
  tier: string
  points: number
  birthday?: string
  notes?: string
}

const TIERS = [
  { value: 'AUTO', label: 'อัตโนมัติ (คำนวณจากแต้ม)' },
  { value: 'BRONZE', label: 'BRONZE' },
  { value: 'SILVER', label: 'SILVER (500+)' },
  { value: 'GOLD', label: 'GOLD (1,500+)' },
  { value: 'VIP', label: 'VIP (3,000+)' },
]

const EMPTY: CustomerFormValues = {
  name: '', phone: '', email: '', tier: 'AUTO', points: 0, birthday: '', notes: '',
}

export function CustomerFormDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<CustomerFormValues> & { id?: string }
  onSaved: () => void
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = React.useState<CustomerFormValues>(EMPTY)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY,
        ...initial,
        birthday: initial?.birthday ? initial.birthday.slice(0, 10) : '',
      })
    }
  }, [open, initial])

  const set = <K extends keyof CustomerFormValues>(k: K, v: CustomerFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name || !form.phone) {
      toast.error('กรุณากรอกชื่อและเบอร์โทร')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, points: Number(form.points) || 0 }
      const url = isEdit ? `/api/admin/customers/${initial?.id}` : '/api/admin/customers'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || 'บันทึกไม่สำเร็จ')
      }
      toast.success(isEdit ? 'แก้ไขลูกค้าเรียบร้อย' : 'เพิ่มลูกค้าเรียบร้อย')
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `แก้ไขข้อมูล ${initial?.name ?? ''}` : 'กรอกข้อมูลลูกค้าใหม่ในระบบ CRM'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>เบอร์โทร <span className="text-red-500">*</span></Label>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="08xxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>อีเมล</Label>
            <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tier</Label>
            <Select value={form.tier} onValueChange={(v) => set('tier', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>แต้มสะสม</Label>
            <Input type="number" value={form.points} onChange={(e) => set('points', Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>วันเกิด</Label>
            <Input type="date" value={form.birthday ?? ''} onChange={(e) => set('birthday', e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>หมายเหตุ</Label>
            <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'เพิ่มลูกค้า'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
