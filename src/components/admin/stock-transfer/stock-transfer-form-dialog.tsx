'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, ArrowLeftRight, Package } from 'lucide-react'
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
import { toThaiNumerals } from '@/lib/thai-date'

export type StockTransferItem = {
  productId: string
  productName: string
  quantity: number
  unit: string
}

export type StockTransferFormValues = {
  fromBranchId: string
  toBranchId: string
  items: StockTransferItem[]
  notes?: string
}

type Branch = { id: string; name: string; code: string; isMain: boolean }

type ProductLite = {
  id: string
  name: string
  sku: string
  unit: string
}

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  branches: Branch[]
  onSubmit: (values: StockTransferFormValues) => void
}

export function StockTransferFormDialog({ open, onOpenChange, branches, onSubmit }: Props) {
  const [fromBranchId, setFromBranchId] = React.useState('')
  const [toBranchId, setToBranchId] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [items, setItems] = React.useState<StockTransferItem[]>([])
  const [products, setProducts] = React.useState<ProductLite[]>([])

  // Picker state
  const [pickedProductId, setPickedProductId] = React.useState('')
  const [qty, setQty] = React.useState<number | ''>('')

  React.useEffect(() => {
    if (!open) return
    setFromBranchId(branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? '')
    setToBranchId(branches.find((b) => !b.isMain)?.id ?? branches[1]?.id ?? branches[0]?.id ?? '')
    setNotes('')
    setItems([])
    setPickedProductId('')
    setQty('')
    fetch('/api/admin/products?status=active', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]))
  }, [open, branches])

  const fromBranch = branches.find((b) => b.id === fromBranchId)
  const toBranch = branches.find((b) => b.id === toBranchId)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  function addLine() {
    if (!pickedProductId || qty === '' || Number(qty) <= 0) return
    const product = products.find((p) => p.id === pickedProductId)
    if (!product) return
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + Number(qty) } : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: Number(qty),
          unit: product.unit,
        },
      ]
    })
    setPickedProductId('')
    setQty('')
  }

  function removeLine(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fromBranchId || !toBranchId) return
    if (fromBranchId === toBranchId) return
    if (items.length === 0) return
    onSubmit({
      fromBranchId,
      toBranchId,
      items,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-[var(--gold)]" />
            สร้างใบโอนสต็อกใหม่
          </DialogTitle>
          <DialogDescription>
            เลือกสาขาต้นทาง/ปลายทางและรายการสินค้าที่ต้องการโอน
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 px-6 py-5">
              {/* Branches */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--gold)]">🚚 เส้นทางโอนสินค้า</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="สาขาต้นทาง *">
                    <Select value={fromBranchId} onValueChange={setFromBranchId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกสาขา" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.isMain && '⭐'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="สาขาปลายทาง *">
                    <Select value={toBranchId} onValueChange={setToBranchId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกสาขา" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches
                          .filter((b) => b.id !== fromBranchId)
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} {b.isMain && '⭐'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {fromBranch && toBranch && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    <span className="font-medium">{fromBranch.name}</span>
                    <ArrowLeftRight className="h-3 w-3 text-[var(--gold)]" />
                    <span className="font-medium">{toBranch.name}</span>
                  </div>
                )}
                {fromBranchId === toBranchId && toBranchId && (
                  <p className="text-xs text-red-600">⚠️ สาขาต้นทางและปลายทางต้องไม่เป็นสาขาเดียวกัน</p>
                )}
              </section>

              {/* Items */}
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-[var(--gold)]">📦 รายการสินค้า</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Field label="เลือกสินค้า">
                    <Select value={pickedProductId} onValueChange={setPickedProductId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ค้นหาสินค้า..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="จำนวน">
                    <Input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-24"
                      placeholder="0"
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addLine}
                      disabled={!pickedProductId || qty === '' || Number(qty) <= 0}
                    >
                      <Plus className="mr-1 h-4 w-4" /> เพิ่ม
                    </Button>
                  </div>
                </div>

                {items.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">สินค้า</th>
                          <th className="text-right p-2 w-24">จำนวน</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <motion.tr
                            key={it.productId}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-t"
                          >
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{it.productName}</span>
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              {toThaiNumerals(it.quantity)} {it.unit}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeLine(it.productId)}
                                className="text-red-500 hover:text-red-700 p-1"
                                aria-label="ลบรายการ"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30">
                        <tr>
                          <td className="p-2 font-semibold text-right">รวม</td>
                          <td className="p-2 text-right font-bold text-[var(--gold)]">
                            {toThaiNumerals(totalItems)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">ยังไม่มีรายการสินค้า</p>
                )}
              </section>

              {/* Notes */}
              <section className="space-y-3 border-t pt-4">
                <Field label="หมายเหตุ">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="เช่น โอนเพื่อเติมสต็อกสาขา..."
                  />
                </Field>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
              disabled={!fromBranchId || !toBranchId || fromBranchId === toBranchId || items.length === 0}
            >
              <ArrowLeftRight className="mr-1 h-4 w-4" /> สร้างใบโอน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}
