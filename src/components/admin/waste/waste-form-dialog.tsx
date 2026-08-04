'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Camera, Search } from 'lucide-react'
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

const SOURCES = [
  { value: 'PRODUCTION', label: 'การผลิต' },
  { value: 'EXPIRED', label: 'หมดอายุ' },
  { value: 'DAMAGED', label: 'ชำรุด' },
  { value: 'RETURNED', label: 'ถูกส่งคืน' },
  { value: 'TRANSPORT', label: 'ขนส่ง' },
]

const UNITS = ['ชิ้น', 'กก.', 'ก้อน', 'ถุง', 'กล่อง', 'ถาด', 'ใบ']

type ProductMini = { id: string; name: string; costPrice: number; unit: string }

export function WasteFormDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [productId, setProductId] = React.useState('')
  const [productName, setProductName] = React.useState('')
  const [batchNo, setBatchNo] = React.useState('')
  const [source, setSource] = React.useState('PRODUCTION')
  const [quantity, setQuantity] = React.useState('1')
  const [unit, setUnit] = React.useState('ชิ้น')
  const [value, setValue] = React.useState('0')
  const [reason, setReason] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setProductId(''); setProductName(''); setBatchNo(''); setSource('PRODUCTION')
      setQuantity('1'); setUnit('ชิ้น'); setValue('0'); setReason(''); setSearch('')
    }
  }, [open])

  const { data: productsData } = useQuery<{ products: ProductMini[] }>({
    queryKey: ['admin-products-mini'],
    queryFn: async () => {
      const r = await fetch('/api/admin/products')
      if (!r.ok) return { products: [] }
      const j = await r.json()
      return { products: (j.products ?? []).map((p: ProductMini) => ({ id: p.id, name: p.name, costPrice: p.costPrice ?? 0, unit: p.unit ?? 'ชิ้น' })) }
    },
    enabled: open,
  })

  const products = productsData?.products ?? []
  const filtered = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products.slice(0, 30)

  const selectProduct = (p: ProductMini) => {
    setProductId(p.id)
    setProductName(p.name)
    setUnit(p.unit)
    // auto-calc value from costPrice × qty
    const qty = Number(quantity) || 0
    setValue(String(Math.round(p.costPrice * qty)))
  }

  React.useEffect(() => {
    // recompute value when qty changes if a product is selected
    if (productId) {
      const p = products.find((x) => x.id === productId)
      if (p) {
        const qty = Number(quantity) || 0
        setValue(String(Math.round(p.costPrice * qty)))
      }
    }
  }, [quantity, productId, products])

  const submit = async () => {
    if (!productName || !source || !reason) {
      toast.error('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setSaving(true)
    try {
      const r = await fetch('/api/admin/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId || null,
          productName,
          batchNo: batchNo || null,
          source,
          quantity: Number(quantity) || 0,
          unit,
          value: Number(value) || 0,
          reason,
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || 'บันทึกไม่สำเร็จ')
      }
      toast.success('บันทึกของเสียเรียบร้อย')
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
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>บันทึกของเสีย</DialogTitle>
          <DialogDescription>บันทึกของเสียจากการผลิต หมดอายุ ชำรุด ฯลฯ</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Product select / search */}
          <div className="space-y-1.5">
            <Label>สินค้า <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาสินค้า..."
                className="h-9 pl-7 text-sm"
              />
            </div>
            <div className="max-h-32 overflow-y-auto rounded-lg border">
              {filtered.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">ไม่พบสินค้า — พิมพ์ชื่อในช่องด้านล่าง</p>
              ) : (
                <ul className="divide-y">
                  {filtered.slice(0, 20).map((p) => (
                    <li
                      key={p.id}
                      onClick={() => selectProduct(p)}
                      className="cursor-pointer p-2 text-xs hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">ต้นทุน {formatBaht(p.costPrice)}/{p.unit}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Input
              value={productName}
              onChange={(e) => { setProductName(e.target.value); setProductId('') }}
              placeholder="หรือพิมพ์ชื่อสินค้าเอง"
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>เลข Batch</Label>
              <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="ไม่บังคับ" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>แหล่งที่มา</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>จำนวน</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>หน่วย</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>มูลค่าความเสียหาย (฿)</Label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="h-9" />
              <p className="text-[10px] text-muted-foreground">
                * คำนวณอัตโนมัติจาก ต้นทุน × จำนวน (สามารถแก้ไขได้)
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>เหตุผล <span className="text-red-500">*</span></Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="อธิบายเหตุผลที่เป็นของเสีย..."
            />
          </div>

          {/* Image upload placeholder */}
          <div className="space-y-1.5">
            <Label>รูปภาพประกอบ <span className="text-muted-foreground">(ไม่บังคับ)</span></Label>
            <button
              type="button"
              onClick={() => toast.info('ฟีเจอร์อัปโหลดรูปภาพ — เร็วๆ นี้')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-xs text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <Camera className="h-4 w-4" />
              อัปโหลดรูปภาพ (เร็วๆ นี้)
            </button>
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
