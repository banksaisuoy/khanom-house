'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChefHat,
  Plus,
  Trash2,
  Calculator,
  Save,
} from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RECIPE_UNITS,
  productTypeLabel,
  productTypeEmoji,
  type RecipeDTO,
} from '@/lib/admin-catalog'
import { formatBaht, formatNumber } from '@/lib/thai-date'

type ProductLite = { id: string; name: string; slug: string; type: string; unit: string }

type Item = {
  key: string
  ingredientName: string
  quantity: number | ''
  unit: string
  costPerUnit: number | ''
}

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  recipe?: RecipeDTO
  productsWithoutRecipe: ProductLite[]
  ingredientNames: string[]
  initialProduct?: ProductLite
  onDone: () => void
}

export function RecipeFormDialog({
  open,
  onOpenChange,
  recipe,
  productsWithoutRecipe,
  ingredientNames,
  initialProduct,
  onDone,
}: Props) {
  const isEdit = !!recipe
  const [productId, setProductId] = React.useState('')
  const [productUnit, setProductUnit] = React.useState('ชิ้น')
  const [yieldQty, setYieldQty] = React.useState<number | ''>(10)
  const [yieldUnit, setYieldUnit] = React.useState('ชิ้น')
  const [prepTimeMin, setPrepTimeMin] = React.useState<number | ''>(20)
  const [cookTimeMin, setCookTimeMin] = React.useState<number | ''>(45)
  const [instructions, setInstructions] = React.useState('')
  const [items, setItems] = React.useState<Item[]>([])
  const [scalingQty, setScalingQty] = React.useState<number | ''>(10)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (recipe) {
      setProductId(recipe.productId)
      setYieldQty(recipe.yieldQty)
      setYieldUnit(recipe.yieldUnit)
      setPrepTimeMin(recipe.prepTimeMin)
      setCookTimeMin(recipe.cookTimeMin)
      setInstructions(recipe.instructions ?? '')
      setItems(
        recipe.items.map((it) => ({
          key: `${Date.now()}-${Math.random()}`,
          ingredientName: it.ingredientName,
          quantity: it.quantity,
          unit: it.unit,
          costPerUnit: it.costPerUnit,
        }))
      )
      setScalingQty(recipe.yieldQty)
    } else {
      setProductId(initialProduct?.id ?? '')
      setProductUnit(initialProduct?.unit ?? 'ชิ้น')
      setYieldQty(10)
      setYieldUnit(initialProduct?.unit ?? 'ชิ้น')
      setPrepTimeMin(20)
      setCookTimeMin(45)
      setInstructions('')
      setItems([
        { key: `k-${Date.now()}`, ingredientName: '', quantity: '', unit: 'g', costPerUnit: '' },
      ])
      setScalingQty(10)
    }
  }, [open, recipe, initialProduct])

  function addItem() {
    setItems((arr) => [
      ...arr,
      { key: `k-${Date.now()}-${Math.random()}`, ingredientName: '', quantity: '', unit: 'g', costPerUnit: '' },
    ])
  }
  function removeItem(key: string) {
    setItems((arr) => arr.filter((i) => i.key !== key))
  }
  function updateItem(key: string, patch: Partial<Item>) {
    setItems((arr) => arr.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  // Compute totals
  const totalCost = items.reduce((s, it) => {
    const q = Number(it.quantity) || 0
    const c = Number(it.costPerUnit) || 0
    return s + q * c
  }, 0)
  const yieldNum = Number(yieldQty) || 0
  const costPerUnit = yieldNum > 0 ? totalCost / yieldNum : 0

  // Scaling calculation
  const scaleNum = Number(scalingQty) || 0
  const scale = yieldNum > 0 ? scaleNum / yieldNum : 0
  const scaledCost = items.reduce((s, it) => {
    const q = Number(it.quantity) || 0
    const c = Number(it.costPerUnit) || 0
    return s + q * scale * c
  }, 0)

  function handleProductChange(id: string) {
    setProductId(id)
    const p = productsWithoutRecipe.find((x) => x.id === id)
    if (p) {
      setProductUnit(p.unit)
      setYieldUnit(p.unit)
    }
  }

  async function submit() {
    if (!productId) { toast.error('กรุณาเลือกสินค้า'); return }
    if (!isEdit && !productsWithoutRecipe.find((p) => p.id === productId)) {
      toast.error('สินค้านี้มีสูตรอยู่แล้ว')
      return
    }
    if (yieldNum <= 0) { toast.error('ปริมาณผลผลิตต้องมากกว่า 0'); return }
    const validItems = items
      .filter((i) => i.ingredientName.trim() && Number(i.quantity) > 0)
      .map((i) => ({
        ingredientName: i.ingredientName.trim(),
        quantity: Number(i.quantity),
        unit: i.unit,
        costPerUnit: Number(i.costPerUnit) || 0,
      }))
    if (validItems.length === 0) { toast.error('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ'); return }

    setSaving(true)
    try {
      const payload = {
        productId,
        yieldQty: yieldNum,
        yieldUnit,
        prepTimeMin: Number(prepTimeMin) || 0,
        cookTimeMin: Number(cookTimeMin) || 0,
        instructions: instructions.trim() || null,
        items: validItems,
      }
      const url = isEdit ? `/api/admin/recipes/${recipe!.id}` : '/api/admin/recipes'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'บันทึกไม่สำเร็จ')
      }
      toast.success(isEdit ? 'อัปเดตสูตรแล้ว' : 'สร้างสูตรใหม่แล้ว')
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const selectedProductName = isEdit
    ? recipe!.productName
    : (productsWithoutRecipe.find((p) => p.id === productId)?.name ?? '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-[var(--gold)]" />
            {isEdit ? `แก้ไขสูตร: ${recipe!.productName}` : 'สร้างสูตรใหม่'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `ปรับปรุงส่วนผสม อัตราส่วน และต้นทุน`
              : 'เลือกสินค้าที่ยังไม่มีสูตร แล้วเพิ่มวัตถุดิบพร้อมคำนวณต้นทุน'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh]">
          <div className="space-y-5 px-6 py-5">
            {/* Section 1: product + yield */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--gold)]">📦 สินค้าและผลผลิต</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">สินค้า {isEdit ? '' : '*'}</Label>
                  {isEdit ? (
                    <Input value={selectedProductName} disabled />
                  ) : (
                    <Select value={productId} onValueChange={handleProductChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกสินค้าที่ยังไม่มีสูตร" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsWithoutRecipe.length === 0 ? (
                          <SelectItem value="_none" disabled>ทุกสินค้ามีสูตรแล้ว</SelectItem>
                        ) : (
                          productsWithoutRecipe.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {productTypeEmoji(p.type)} {p.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ปริมาณผลผลิต *</Label>
                  <Input type="number" min={0} value={yieldQty} onChange={(e) => setYieldQty(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">หน่วยผลผลิต</Label>
                  <Select value={yieldUnit} onValueChange={setYieldUnit}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[...new Set([...RECIPE_UNITS, productUnit])].map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">เวลาเตรียม (นาที)</Label>
                  <Input type="number" min={0} value={prepTimeMin} onChange={(e) => setPrepTimeMin(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">เวลาทำ (นาที)</Label>
                  <Input type="number" min={0} value={cookTimeMin} onChange={(e) => setCookTimeMin(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs">ประเภทสินค้า</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm">
                    {recipe?.productType
                      ? `${productTypeEmoji(recipe.productType)} ${productTypeLabel(recipe.productType)}`
                      : (productsWithoutRecipe.find((p) => p.id === productId)
                          ? `${productTypeEmoji(productsWithoutRecipe.find((p) => p.id === productId)!.type)} ${productTypeLabel(productsWithoutRecipe.find((p) => p.id === productId)!.type)}`
                          : '-')}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">วิธีทำ / คำแนะนำ</Label>
                <Textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="ผสมแป้งกับน้ำ นึ่งในไฟปานกลาง 15 นาที ราดกะทิ..."
                />
              </div>
            </section>

            {/* Section 2: ingredients */}
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--gold)]">🥥 วัตถุดิบ / Recipe Items</h3>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  เพิ่มวัตถุดิบ
                </Button>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>วัตถุดิบ</TableHead>
                      <TableHead className="w-[100px]">ปริมาณ</TableHead>
                      <TableHead className="w-[100px]">หน่วย</TableHead>
                      <TableHead className="w-[120px]">ต้นทุน/หน่วย</TableHead>
                      <TableHead className="w-[100px] text-right">รวม</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence initial={false}>
                      {items.map((it) => {
                        const lineCost = (Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0)
                        return (
                          <motion.tr
                            key={it.key}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                          >
                            <TableCell>
                              <Input
                                className="h-8"
                                value={it.ingredientName}
                                onChange={(e) => updateItem(it.key, { ingredientName: e.target.value })}
                                list="ingredient-names"
                                placeholder="เช่น แป้งข้าวจ้าว"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8 text-right"
                                value={it.quantity}
                                onChange={(e) => updateItem(it.key, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={it.unit} onValueChange={(v) => updateItem(it.key, { unit: v })}>
                                <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {RECIPE_UNITS.map((u) => (
                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-right"
                                value={it.costPerUnit}
                                onChange={(e) => updateItem(it.key, { costPerUnit: e.target.value === '' ? '' : Number(e.target.value) })}
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatBaht(lineCost)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:bg-red-500/10"
                                onClick={() => removeItem(it.key)}
                                disabled={items.length === 1}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
              {/* datalist for autocomplete */}
              <datalist id="ingredient-names">
                {ingredientNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>

              {/* Totals */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground">ต้นทุนวัตถุดิบรวม / สูตร</p>
                  <p className="mt-0.5 text-xl font-bold">{formatBaht(totalCost)}</p>
                </div>
                <div className="rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-3">
                  <p className="text-[10px] text-muted-foreground">ต้นทุนต่อหน่วย ({yieldUnit})</p>
                  <p className="mt-0.5 text-xl font-bold text-[var(--forest)] dark:text-[var(--gold)]">
                    {formatBaht(costPerUnit)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] text-muted-foreground">ผลผลิต / สูตร</p>
                  <p className="mt-0.5 text-xl font-bold">
                    {formatNumber(yieldNum)} <span className="text-sm font-normal text-muted-foreground">{yieldUnit}</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: scaling calculator */}
            <section className="space-y-3 border-t pt-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--gold)]">
                <Calculator className="h-4 w-4" />
                เครื่องคำนวณการผลิต (Production Scaling)
              </h3>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">ต้องการผลิต</Label>
                    <Input
                      type="number"
                      min={0}
                      className="w-32"
                      value={scalingQty}
                      onChange={(e) => setScalingQty(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{yieldUnit}</span>
                    <span className="mx-2">·</span>
                    <span>สูตรต้นฉบับ {formatNumber(yieldNum)} {yieldUnit}</span>
                    {scale > 0 && (
                      <Badge variant="outline" className="ml-2 font-mono">×{scale.toFixed(2)}</Badge>
                    )}
                  </div>
                </div>
                {scale > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {items.filter((i) => i.ingredientName.trim() && Number(i.quantity) > 0).map((it, idx) => {
                      const scaled = (Number(it.quantity) || 0) * scale
                      return (
                        <div key={idx} className="flex items-center justify-between rounded bg-background/60 px-3 py-1.5 text-sm">
                          <span className="font-medium">{it.ingredientName}</span>
                          <span className="text-muted-foreground">
                            {formatNumber(Number(it.quantity) || 0)} {it.unit}
                            <span className="mx-1.5">→</span>
                            <span className="font-semibold text-[var(--forest)] dark:text-[var(--gold)]">
                              {formatNumber(scaled)} {it.unit}
                            </span>
                          </span>
                        </div>
                      )
                    })}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between px-3 py-1 text-sm">
                      <span className="font-medium">ต้นทุนรวมสำหรับ {formatNumber(scaleNum)} {yieldUnit}</span>
                      <span className="text-lg font-bold text-[var(--forest)] dark:text-[var(--gold)]">{formatBaht(scaledCost)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-0.5 text-xs text-muted-foreground">
                      <span>ต้นทุน / หน่วย</span>
                      <span>{formatBaht(scaleNum > 0 ? scaledCost / scaleNum : 0)}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ยกเลิก</Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
          >
            {saving ? (
              'กำลังบันทึก...'
            ) : (
              <>
                <Save className="mr-1 h-4 w-4" />
                {isEdit ? 'บันทึกการแก้ไข' : 'สร้างสูตร'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
