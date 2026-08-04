'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

export type PromotionFormValues = {
  id?: string
  code: string
  name: string
  type: string
  value: number
  minSpend: number
  maxDiscount: number | null
  usageLimit: number | null
  startsAt: string
  endsAt: string
  isActive: boolean
  productIds: string[]
}

const EMPTY: PromotionFormValues = {
  code: '', name: '', type: 'PERCENT', value: 10, minSpend: 0, maxDiscount: null,
  usageLimit: null, startsAt: '', endsAt: '', isActive: true, productIds: [],
}

const TYPES = [
  { value: 'PERCENT', label: 'เปอร์เซ็นต์ (%)' },
  { value: 'FIXED', label: 'จำนวนตรง (฿)' },
  { value: 'BOGO', label: 'ซื้อ 1 แถม 1' },
]

function toLocalDateInput(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  return date.toISOString().slice(0, 10)
}

export function PromotionFormDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<PromotionFormValues> & { id?: string }
  onSaved: () => void
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = React.useState<PromotionFormValues>(EMPTY)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY,
        ...initial,
        startsAt: toLocalDateInput(initial?.startsAt),
        endsAt: toLocalDateInput(initial?.endsAt),
        productIds: initial?.productIds ?? [],
      })
    }
  }, [open, initial])

  const { data: productsData } = useQuery<{ products: { id: string; name: string; sku: string }[] }>({
    queryKey: ['admin-products-mini'],
    queryFn: async () => {
      const r = await fetch('/api/admin/products')
      if (!r.ok) return { products: [] }
      const j = await r.json()
      return { products: (j.products ?? []).map((p: { id: string; name: string; sku: string }) => ({ id: p.id, name: p.name, sku: p.sku })) }
    },
    enabled: open,
  })

  const products = productsData?.products ?? []
  const set = <K extends keyof PromotionFormValues>(k: K, v: PromotionFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const toggleProduct = (pid: string) => {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(pid)
        ? f.productIds.filter((x) => x !== pid)
        : [...f.productIds, pid],
    }))
  }

  const submit = async () => {
    if (!form.code || !form.name || !form.startsAt || !form.endsAt) {
      toast.error('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        value: Number(form.value) || 0,
        minSpend: Number(form.minSpend) || 0,
      }
      const url = isEdit ? `/api/admin/promotions/${initial?.id}` : '/api/admin/promotions'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || 'บันทึกไม่สำเร็จ')
      }
      toast.success(isEdit ? 'แก้ไขโปรเรียบร้อย' : 'สร้างโปรเรียบร้อย')
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
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่น'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `แก้ไข ${initial?.name ?? ''}` : 'กำหนดคูปองส่วนลดสำหรับลูกค้า'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>รหัสโปร <span className="text-red-500">*</span></Label>
              <Input
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="เช่น KH10"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ชื่อโปร <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="เช่น ลด 10% ทั้งร้าน" />
            </div>
            <div className="space-y-1.5">
              <Label>ประเภท</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>มูลค่า {form.type === 'PERCENT' ? '(%)' : form.type === 'FIXED' ? '(฿)' : ''}</Label>
              <Input type="number" value={form.value} onChange={(e) => set('value', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>ใช้ขั้นต่ำ (฿)</Label>
              <Input type="number" value={form.minSpend} onChange={(e) => set('minSpend', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>ส่วนลดสูงสุด (฿) <span className="text-muted-foreground">(ไม่บังคับ)</span></Label>
              <Input
                type="number"
                value={form.maxDiscount ?? ''}
                onChange={(e) => set('maxDiscount', e.target.value ? Number(e.target.value) : null)}
                placeholder="ไม่จำกัด"
              />
            </div>
            <div className="space-y-1.5">
              <Label>จำกัดการใช้ (ครั้ง) <span className="text-muted-foreground">(ไม่บังคับ)</span></Label>
              <Input
                type="number"
                value={form.usageLimit ?? ''}
                onChange={(e) => set('usageLimit', e.target.value ? Number(e.target.value) : null)}
                placeholder="ไม่จำกัด"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">เปิดใช้งาน</Label>
                <p className="text-[10px] text-muted-foreground">ลูกค้าใช้โปรนี้ได้</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
            </div>
            <div className="space-y-1.5">
              <Label>เริ่มต้น <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>สิ้นสุด <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
            </div>
          </div>

          {/* Product scope */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>สินค้าที่เข้าร่วม <span className="text-muted-foreground">(ไม่เลือก = ทุกสินค้า)</span></Label>
              {form.productIds.length > 0 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => set('productIds', [])}>
                  ล้างทั้งหมด
                </Button>
              )}
            </div>
            {form.productIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.productIds.map((pid) => {
                  const p = products.find((x) => x.id === pid)
                  return (
                    <Badge key={pid} variant="secondary" className="gap-1">
                      {p?.name ?? pid}
                      <button onClick={() => toggleProduct(pid)} className="hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              <ScrollArea className="h-48">
                {products.length === 0 ? (
                  <p className="p-3 text-center text-xs text-muted-foreground">กำลังโหลดสินค้า...</p>
                ) : (
                  <ul className="divide-y">
                    {products.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 p-2 hover:bg-muted/40">
                        <Checkbox
                          checked={form.productIds.includes(p.id)}
                          onCheckedChange={() => toggleProduct(p.id)}
                          id={`promo-prod-${p.id}`}
                        />
                        <label htmlFor={`promo-prod-${p.id}`} className="flex-1 cursor-pointer text-sm">
                          {p.name}
                        </label>
                        <span className="font-mono text-[10px] text-muted-foreground">{p.sku}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'สร้างโปร'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
