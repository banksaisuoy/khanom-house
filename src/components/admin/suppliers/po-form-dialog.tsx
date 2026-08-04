'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ShoppingCart, Package } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatBaht } from '@/lib/thai-date'
import type { SupplierRow } from './supplier-form-dialog'

export type PoItemInput = {
  productName: string
  productId?: string
  quantity: number
  unit: string
  unitPrice: number
  notes?: string
}

export type PoFormValues = {
  supplierId: string
  branchId?: string
  expectedAt?: string
  notes?: string
  items: PoItemInput[]
}

type ProductLite = {
  id: string
  name: string
  sku: string
  unit: string
  costPrice: number
}

type Branch = { id: string; name: string; code: string; isMain: boolean }

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  suppliers: SupplierRow[]
  branches: Branch[]
  onSubmit: (values: PoFormValues) => void
}

const UNIT_PRESETS = ['ชิ้น', 'กก.', 'กรัม', 'ลิตร', 'แพ็ค', 'กล่อง', 'ขวด', 'ถุง']

export function PoFormDialog({ open, onOpenChange, suppliers, branches, onSubmit }: Props) {
  const [supplierId, setSupplierId] = React.useState('')
  const [branchId, setBranchId] = React.useState('')
  const [expectedAt, setExpectedAt] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [items, setItems] = React.useState<PoItemInput[]>([])
  const [products, setProducts] = React.useState<ProductLite[]>([])

  // Picker state for adding new line
  const [pickMode, setPickMode] = React.useState<'product' | 'manual'>('manual')
  const [pickedProductId, setPickedProductId] = React.useState('')
  const [manualName, setManualName] = React.useState('')
  const [qty, setQty] = React.useState<number | ''>('')
  const [unit, setUnit] = React.useState('ชิ้น')
  const [unitPrice, setUnitPrice] = React.useState<number | ''>('')

  React.useEffect(() => {
    if (!open) return
    setSupplierId(suppliers[0]?.id ?? '')
    setBranchId(branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? '')
    setExpectedAt('')
    setNotes('')
    setItems([])
    setPickMode('manual')
    setPickedProductId('')
    setManualName('')
    setQty('')
    setUnit('ชิ้น')
    setUnitPrice('')
    // Load products (cost price suggestions)
    fetch('/api/admin/products?status=active', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
  }, [open, suppliers, branches])

  const activeSuppliers = suppliers.filter((s) => s.isActive)
  const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)

  function addLine() {
    let productName = ''
    let productId: string | undefined
    let suggestedUnit = unit
    let suggestedPrice: number | undefined

    if (pickMode === 'product' && pickedProductId) {
      const p = products.find((x) => x.id === pickedProductId)
      if (!p) return
      productName = p.name
      productId = p.id
      suggestedUnit = p.unit
      suggestedPrice = p.costPrice
    } else if (pickMode === 'manual') {
      if (!manualName.trim()) return
      productName = manualName.trim()
    } else {
      return
    }

    const finalQty = qty === '' ? 0 : Number(qty)
    const finalPrice = unitPrice === '' ? (suggestedPrice ?? 0) : Number(unitPrice)
    if (finalQty <= 0) return

    setItems((prev) => [
      ...prev,
      {
        productName,
        productId,
        quantity: finalQty,
        unit: suggestedUnit,
        unitPrice: finalPrice,
        notes: undefined,
      },
    ])
    setManualName('')
    setPickedProductId('')
    setQty('')
    setUnitPrice('')
  }

  function removeLine(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function submit() {
    if (!supplierId) return
    if (items.length === 0) return
    onSubmit({
      supplierId,
      branchId: branchId || undefined,
      expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined,
      notes: notes.trim() || undefined,
      items: items.map((it) => ({
        productName: it.productName,
        productId: it.productId,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        notes: it.notes,
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[var(--gold)]" />
            สร้างใบสั่งซื้อ (Purchase Order)
          </DialogTitle>
          <DialogDescription>
            เลือกซัพพลายเออร์ ระบุรายการสินค้าและจำนวน — ระบบจะคำนวณยอดรวมให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[64vh]">
          <div className="space-y-5 px-6 py-5">
            {/* Section 1: PO meta */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--gold)]">📋 ข้อมูลใบสั่งซื้อ</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">ซัพพลายเออร์ *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder="เลือกซัพพลายเออร์" /></SelectTrigger>
                    <SelectContent>
                      {activeSuppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} · {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">รับเข้าสาขา</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger><SelectValue placeholder="เลือกสาขา" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.isMain && '(สำนักงานใหญ่)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">วันที่คาดว่าจะรับของ</Label>
                  <Input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">หมายเหตุ</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="หมายเหตุเพิ่มเติม เช่น ส่งก่อน 9 โมงเช้า" />
              </div>
            </section>

            {/* Section 2: Item builder */}
            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-[var(--gold)]">🛒 รายการสั่งซื้อ</h3>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-3 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPickMode('manual')}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      pickMode === 'manual'
                        ? 'bg-[var(--forest)] text-[var(--gold)]'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    กรอกชื่อเอง
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickMode('product')}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      pickMode === 'product'
                        ? 'bg-[var(--forest)] text-[var(--gold)]'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    เลือกจากสินค้า
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                  {pickMode === 'product' ? (
                    <div className="sm:col-span-5 space-y-1">
                      <Label className="text-[10px]">สินค้า</Label>
                      <Select value={pickedProductId} onValueChange={(v) => {
                        setPickedProductId(v)
                        const p = products.find((x) => x.id === v)
                        if (p) {
                          setUnit(p.unit)
                          if (unitPrice === '') setUnitPrice(p.costPrice)
                        }
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="เลือก" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.sku} · {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="sm:col-span-5 space-y-1">
                      <Label className="text-[10px]">ชื่อสินค้า/วัตถุดิบ</Label>
                      <Input className="h-8 text-xs" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="เช่น แป้งข้าวเจ้า 5 กก." />
                    </div>
                  )}
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[10px]">จำนวน</Label>
                    <Input className="h-8 text-xs" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[10px]">หน่วย</Label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNIT_PRESETS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[10px]">ราคา/หน่วย (฿)</Label>
                    <Input className="h-8 text-xs" type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" />
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
                      onClick={addLine}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items list */}
              <div className="rounded-lg border">
                <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
                  <div className="col-span-5">รายการ</div>
                  <div className="col-span-2 text-right">จำนวน</div>
                  <div className="col-span-2 text-right">ราคา/หน่วย</div>
                  <div className="col-span-2 text-right">รวม</div>
                  <div className="col-span-1"></div>
                </div>
                <AnimatePresence>
                  {items.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground"
                    >
                      <Package className="h-8 w-8 opacity-40" />
                      <span>ยังไม่มีรายการ — เพิ่มจากด้านบน</span>
                    </motion.div>
                  ) : (
                    items.map((it, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="grid grid-cols-12 items-center gap-2 border-b px-3 py-2 text-xs last:border-b-0"
                      >
                        <div className="col-span-5">
                          <p className="font-medium">{it.productName}</p>
                          {it.productId && <Badge variant="outline" className="mt-0.5 text-[9px]">ลิงก์สินค้า</Badge>}
                        </div>
                        <div className="col-span-2 text-right tabular-nums">{it.quantity} {it.unit}</div>
                        <div className="col-span-2 text-right tabular-nums">{formatBaht(it.unitPrice)}</div>
                        <div className="col-span-2 text-right font-semibold tabular-nums">{formatBaht(it.quantity * it.unitPrice)}</div>
                        <div className="col-span-1 text-right">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => removeLine(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
                {items.length > 0 && (
                  <div className="flex items-center justify-between bg-muted/30 px-3 py-2 text-sm font-semibold">
                    <span>ยอดรวมทั้งสิ้น</span>
                    <span className="text-[var(--gold)]">{formatBaht(total)}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button
            type="button"
            disabled={!supplierId || items.length === 0}
            onClick={submit}
            className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
          >
            สร้างใบสั่งซื้อ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
