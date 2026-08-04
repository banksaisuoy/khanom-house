'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
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
import { normalizeChecklist, type ChecklistItem } from '@/lib/admin-ui'

export type CateringItem = { productId?: string; name: string; qty: number; price: number }

export type EventFormValues = {
  id?: string
  title: string
  type: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  guestCount: number
  eventDate: string // datetime-local
  setupTime: string
  location: string
  mapUrl?: string
  theme?: string
  packagingType?: string
  budget: number
  totalQuote: number
  deposit: number
  status: string
  assignedUserId: string
  vehicle: string
  notes?: string
  items: CateringItem[]
  checklist: ChecklistItem[]
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { text: 'สั่งวัตถุดิบ', done: false },
  { text: 'ทำขนม', done: false },
  { text: 'แพ็คกล่อง', done: false },
  { text: 'ตรวจ QC', done: false },
  { text: 'จัดส่ง', done: false },
]

const TYPES = [
  { value: 'BREAK', label: 'จัดเบรค' },
  { value: 'SEMINAR', label: 'สัมมนา' },
  { value: 'WEDDING', label: 'แต่งงาน' },
  { value: 'MERIT', label: 'งานบุญ' },
  { value: 'CORPORATE', label: 'องค์กร' },
  { value: 'PARTY', label: 'ปาร์ตี้' },
]
const STATUSES = [
  { value: 'DRAFT', label: 'ร่าง' },
  { value: 'QUOTED', label: 'ส่งใบเสนอราคา' },
  { value: 'CONFIRMED', label: 'ยืนยันแล้ว' },
  { value: 'PREPARING', label: 'กำลังเตรียม' },
  { value: 'DELIVERED', label: 'จัดส่งแล้ว' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

function toLocalInput(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}

const EMPTY: EventFormValues = {
  title: '', type: 'BREAK', customerName: '', customerPhone: '', customerEmail: '',
  guestCount: 20, eventDate: '', setupTime: '', location: '', mapUrl: '',
  theme: '', packagingType: '', budget: 0, totalQuote: 0, deposit: 0,
  status: 'DRAFT', assignedUserId: '', vehicle: '', notes: '',
  items: [], checklist: DEFAULT_CHECKLIST,
}

export function EventFormDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<EventFormValues> & { id?: string }
  onSaved: () => void
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = React.useState<EventFormValues>(EMPTY)
  const [saving, setSaving] = React.useState(false)
  const [newChecklistItem, setNewChecklistItem] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY,
        ...initial,
        eventDate: initial?.eventDate ? toLocalInput(new Date(initial.eventDate)) : '',
        setupTime: initial?.setupTime ? toLocalInput(new Date(initial.setupTime)) : '',
        items: initial?.items ?? [],
        checklist: normalizeChecklist(initial?.checklist ?? []).map((it) => ({ text: it.text, done: it.done })),
      })
    }
  }, [open, initial])

  const { data: usersData } = useQuery<{ users: { id: string; name: string; role: string }[] }>({
    queryKey: ['admin-users-mini'],
    queryFn: async () => {
      const r = await fetch('/api/admin/users')
      if (!r.ok) return { users: [] }
      const j = await r.json()
      return { users: (j.users ?? []).map((u: { id: string; name: string; role: string }) => ({ id: u.id, name: u.name, role: u.role })) }
    },
    enabled: open,
  })

  const { data: productsData } = useQuery<{ products: { id: string; name: string; price: number; unit: string }[] }>({
    queryKey: ['admin-products-mini'],
    queryFn: async () => {
      const r = await fetch('/api/admin/products?limit=200')
      if (!r.ok) return { products: [] }
      const j = await r.json()
      return { products: (j.products ?? j ?? []).slice ? ((j.products ?? j).slice(0, 200)) : [] }
    },
    enabled: open,
  })

  const users = usersData?.users ?? []
  const products = productsData?.products ?? []

  const set = <K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { name: '', qty: 1, price: 0 }],
    }))
  }
  const updateItem = (idx: number, patch: Partial<CateringItem>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }))
  }
  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const addChecklist = () => {
    if (!newChecklistItem.trim()) return
    setForm((f) => ({ ...f, checklist: [...f.checklist, { text: newChecklistItem.trim(), done: false }] }))
    setNewChecklistItem('')
  }
  const removeChecklist = (idx: number) => {
    setForm((f) => ({ ...f, checklist: f.checklist.filter((_, i) => i !== idx) }))
  }

  const totalItems = form.items.reduce((s, it) => s + it.qty * it.price, 0)

  const submit = async () => {
    if (!form.title || !form.customerName || !form.eventDate || !form.location) {
      toast.error('กรุณากรอกข้อมูลให้ครบ: ชื่องาน, ลูกค้า, วันที่, สถานที่')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        guestCount: Number(form.guestCount) || 0,
        budget: Number(form.budget) || 0,
        totalQuote: Number(form.totalQuote) || 0,
        deposit: Number(form.deposit) || 0,
      }
      const url = isEdit ? `/api/admin/catering/${initial?.id}` : '/api/admin/catering'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || 'บันทึกไม่สำเร็จ')
      }
      toast.success(isEdit ? 'แก้ไขงานเรียบร้อย' : 'สร้างงานใหม่เรียบร้อย')
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
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขงาน' : 'สร้างงานใหม่'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `แก้ไขข้อมูลงาน ${initial?.title ?? ''}` : 'กรอกรายละเอียดงาน Catering / จัดเบรค'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label>ชื่องาน <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="เช่น จัดเบรคประชุม บริษัท ABC" />
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทงาน</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>สถานะ</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>ชื่อลูกค้า <span className="text-red-500">*</span></Label>
              <Input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>เบอร์โทร</Label>
              <Input value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>อีเมล</Label>
              <Input value={form.customerEmail ?? ''} onChange={(e) => set('customerEmail', e.target.value)} />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>จำนวนแขก (ท่าน)</Label>
              <Input type="number" value={form.guestCount} onChange={(e) => set('guestCount', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>วันที่จัดงาน <span className="text-red-500">*</span></Label>
              <Input type="datetime-local" value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>เวลาติดตั้ง</Label>
              <Input type="datetime-local" value={form.setupTime} onChange={(e) => set('setupTime', e.target.value)} />
            </div>
          </div>

          {/* Location */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>สถานที่ <span className="text-red-500">*</span></Label>
              <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="เช่น โรงแรมแกรนด์ สีลม" />
            </div>
            <div className="space-y-1.5">
              <Label>Google Maps URL</Label>
              <Input value={form.mapUrl ?? ''} onChange={(e) => set('mapUrl', e.target.value)} placeholder="https://maps.app..." />
            </div>
            <div className="space-y-1.5">
              <Label>ธีมงาน</Label>
              <Input value={form.theme ?? ''} onChange={(e) => set('theme', e.target.value)} placeholder="เช่น ไทยประยุกต์" />
            </div>
            <div className="space-y-1.5">
              <Label>รูปแบบบรรจุภัณฑ์</Label>
              <Input value={form.packagingType ?? ''} onChange={(e) => set('packagingType', e.target.value)} placeholder="เช่น กล่องแต่ง" />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>งบประมาณ (฿)</Label>
              <Input type="number" value={form.budget} onChange={(e) => set('budget', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>ราคาเสนอ (฿)</Label>
              <Input type="number" value={form.totalQuote} onChange={(e) => set('totalQuote', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>มัดจำ (฿)</Label>
              <Input type="number" value={form.deposit} onChange={(e) => set('deposit', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>ยอดคงเหลือ</Label>
              <Input disabled value={formatBaht(Math.max(0, form.totalQuote - form.deposit))} />
            </div>
          </div>

          {/* Assigned */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>พนักงานรับผิดชอบ</Label>
              <Select value={form.assignedUserId || 'none'} onValueChange={(v) => set('assignedUserId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="ยังไม่มอบหมาย" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— ยังไม่มอบหมาย —</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ยานพาหนะ</Label>
              <Select value={form.vehicle || 'none'} onValueChange={(v) => set('vehicle', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="รถตู้">รถตู้</SelectItem>
                  <SelectItem value="รถกระบะ">รถกระบะ</SelectItem>
                  <SelectItem value="มอเตอร์ไซค์">มอเตอร์ไซค์</SelectItem>
                  <SelectItem value="รถบรรทุก">รถบรรทุก</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>รายการสินค้า / เมนู</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> เพิ่มรายการ
              </Button>
            </div>
            <div className="space-y-1.5">
              {form.items.length === 0 && (
                <p className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
                  ยังไม่มีรายการสินค้า
                </p>
              )}
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5">
                  <div className="col-span-6">
                    <Select
                      value={it.productId ?? 'custom'}
                      onValueChange={(v) => {
                        if (v === 'custom') {
                          updateItem(i, { productId: undefined, name: it.name, price: it.price })
                        } else {
                          const p = products.find((p) => p.id === v)
                          updateItem(i, { productId: v, name: p?.name ?? it.name, price: p?.price ?? it.price })
                        }
                      }}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="เลือกสินค้า" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">— กำหนดเอง —</SelectItem>
                        {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="col-span-5 h-9"
                    placeholder="ชื่อรายการ"
                    value={it.name}
                    onChange={(e) => updateItem(i, { name: e.target.value })}
                  />
                  <div className="col-span-3">
                    <Input
                      type="number"
                      className="h-9"
                      placeholder="จำนวน"
                      value={it.qty}
                      onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      className="h-9"
                      placeholder="ราคา/หน่วย"
                      value={it.price}
                      onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-red-500"
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {form.items.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">รวมมูลค่ารายการ</span>
                <span className="font-semibold">{formatBaht(totalItems)}</span>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label>รายการตรวจสอบ (Checklist)</Label>
            <div className="space-y-1.5">
              {form.checklist.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={c.text}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        checklist: f.checklist.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                      }))
                    }
                    className="h-9"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-red-500"
                    onClick={() => removeChecklist(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="เพิ่มรายการ checklist"
                className="h-9"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklist() } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addChecklist} className="h-9">
                เพิ่ม
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Textarea
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'สร้างงาน'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
