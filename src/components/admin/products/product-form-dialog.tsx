'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Wand2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ALLERGEN_PRESETS,
  PRODUCT_TYPES,
  suggestSku,
  type CategoryDTO,
  type ProductAdminDTO,
} from '@/lib/admin-catalog'

export type ProductFormValues = {
  name: string
  nameEn?: string | null
  sku?: string | null
  barcode?: string | null
  description?: string | null
  categoryId: string
  type: string
  price: number
  memberPrice?: number | null
  wholesalePrice?: number | null
  eventPrice?: number | null
  costPrice?: number
  unit?: string
  tags: string[]
  isBestSeller: boolean
  isFeatured: boolean
  isFlashSale: boolean
  flashSalePrice?: number | null
  flashSaleEndAt?: string | null
  flashSaleStock?: number | null
  shelfLifeHours?: number | null
  needsRefrigeration: boolean
  allergens: string[]
  storageInstructions?: string | null
  consumeWithin?: string | null
  isVegan: boolean
  isHalal: boolean
  isVegetarian: boolean
}

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  product?: ProductAdminDTO
  categories: CategoryDTO[]
  onSubmit: (values: ProductFormValues, id?: string) => void
}

export function ProductFormDialog({ open, onOpenChange, product, categories, onSubmit }: Props) {
  const isEdit = !!product
  const [name, setName] = React.useState('')
  const [nameEn, setNameEn] = React.useState('')
  const [sku, setSku] = React.useState('')
  const [barcode, setBarcode] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [categoryId, setCategoryId] = React.useState('')
  const [type, setType] = React.useState('FRESH')
  const [price, setPrice] = React.useState<number | ''>('')
  const [memberPrice, setMemberPrice] = React.useState<number | ''>('')
  const [wholesalePrice, setWholesalePrice] = React.useState<number | ''>('')
  const [eventPrice, setEventPrice] = React.useState<number | ''>('')
  const [costPrice, setCostPrice] = React.useState<number | ''>('')
  const [unit, setUnit] = React.useState('ชิ้น')
  const [tagsInput, setTagsInput] = React.useState('')
  const [isBestSeller, setIsBestSeller] = React.useState(false)
  const [isFeatured, setIsFeatured] = React.useState(false)
  const [isFlashSale, setIsFlashSale] = React.useState(false)
  const [flashSalePrice, setFlashSalePrice] = React.useState<number | ''>('')
  const [flashSaleEndAt, setFlashSaleEndAt] = React.useState('')
  const [flashSaleStock, setFlashSaleStock] = React.useState<number | ''>('')
  const [shelfLifeHours, setShelfLifeHours] = React.useState<number | ''>('')
  const [needsRefrigeration, setNeedsRefrigeration] = React.useState(false)
  // Allergen + storage + diet state (Task FILL-MULTI)
  const [allergens, setAllergens] = React.useState<string[]>([])
  const [storageInstructions, setStorageInstructions] = React.useState('')
  const [consumeWithin, setConsumeWithin] = React.useState('')
  const [isVegan, setIsVegan] = React.useState(false)
  const [isHalal, setIsHalal] = React.useState(false)
  const [isVegetarian, setIsVegetarian] = React.useState(false)

  // Initialize fields when product changes or dialog opens
  React.useEffect(() => {
    if (!open) return
    if (product) {
      setName(product.name)
      setNameEn(product.nameEn ?? '')
      setSku(product.sku)
      setBarcode(product.barcode ?? '')
      setDescription(product.description ?? '')
      setCategoryId(product.categoryId)
      setType(product.type)
      setPrice(product.price)
      setMemberPrice(product.memberPrice ?? '')
      setWholesalePrice(product.wholesalePrice ?? '')
      setEventPrice(product.eventPrice ?? '')
      setCostPrice(product.costPrice)
      setUnit(product.unit)
      setTagsInput(product.tags.join(', '))
      setIsBestSeller(product.isBestSeller)
      setIsFeatured(product.isFeatured)
      setIsFlashSale(product.isFlashSale)
      setFlashSalePrice(product.flashSalePrice ?? '')
      setFlashSaleEndAt(
        product.flashSaleEndAt ? new Date(product.flashSaleEndAt).toISOString().slice(0, 16) : ''
      )
      setFlashSaleStock(product.flashSaleStock ?? '')
      setShelfLifeHours(product.shelfLifeHours ?? '')
      setNeedsRefrigeration(product.needsRefrigeration)
      setAllergens(product.allergens ?? [])
      setStorageInstructions(product.storageInstructions ?? '')
      setConsumeWithin(product.consumeWithin ?? '')
      setIsVegan(product.isVegan)
      setIsHalal(product.isHalal)
      setIsVegetarian(product.isVegetarian)
    } else {
      setName('')
      setNameEn('')
      setSku('')
      setBarcode('')
      setDescription('')
      setCategoryId(categories[0]?.id ?? '')
      setType('FRESH')
      setPrice('')
      setMemberPrice('')
      setWholesalePrice('')
      setEventPrice('')
      setCostPrice('')
      setUnit('ชิ้น')
      setTagsInput('')
      setIsBestSeller(false)
      setIsFeatured(false)
      setIsFlashSale(false)
      setFlashSalePrice('')
      setFlashSaleEndAt('')
      setFlashSaleStock('')
      setShelfLifeHours('')
      setNeedsRefrigeration(false)
      setAllergens([])
      setStorageInstructions('')
      setConsumeWithin('')
      setIsVegan(false)
      setIsHalal(false)
      setIsVegetarian(false)
    }
  }, [open, product, categories])

  // Auto-suggest SKU from name when creating
  React.useEffect(() => {
    if (isEdit) return
    if (!name.trim()) return
    setSku((prev) => {
      // Don't override if user typed one
      if (prev && prev.trim()) return prev
      return suggestSku(name)
    })
  }, [name, isEdit])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (!categoryId) return
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const values: ProductFormValues = {
      name: name.trim(),
      nameEn: nameEn.trim() || null,
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      description: description.trim() || null,
      categoryId,
      type,
      price: Number(price) || 0,
      memberPrice: memberPrice === '' ? null : Number(memberPrice),
      wholesalePrice: wholesalePrice === '' ? null : Number(wholesalePrice),
      eventPrice: eventPrice === '' ? null : Number(eventPrice),
      costPrice: Number(costPrice) || 0,
      unit,
      tags,
      isBestSeller,
      isFeatured,
      isFlashSale,
      flashSalePrice: isFlashSale && flashSalePrice !== '' ? Number(flashSalePrice) : null,
      flashSaleEndAt: isFlashSale && flashSaleEndAt ? new Date(flashSaleEndAt).toISOString() : null,
      flashSaleStock: isFlashSale && flashSaleStock !== '' ? Number(flashSaleStock) : null,
      shelfLifeHours: shelfLifeHours === '' ? null : Number(shelfLifeHours),
      needsRefrigeration,
      allergens,
      storageInstructions: storageInstructions.trim() || null,
      consumeWithin: consumeWithin.trim() || null,
      isVegan,
      isHalal,
      isVegetarian,
    }
    onSubmit(values, product?.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `แก้ไขข้อมูลสินค้า "${product?.name}"` : 'กรอกข้อมูลสินค้าและเมนูขนมไทย'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 px-6 py-5">
              {/* Section: ข้อมูลพื้นฐาน */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--gold)]">📦 ข้อมูลพื้นฐาน</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="ชื่อสินค้า (ไทย) *" htmlFor="p-name">
                    <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="เช่น ขนมถ้วยฟู" />
                  </Field>
                  <Field label="ชื่อภาษาอังกฤษ" htmlFor="p-nameEn">
                    <Input id="p-nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Steamed Coconut Cup" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="SKU" htmlFor="p-sku">
                    <div className="flex gap-1">
                      <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="KH-XXX-001" />
                      {!isEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setSku(suggestSku(name))}
                          title="สร้างอัตโนมัติ"
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Field>
                  <Field label="บาร์โค้ด" htmlFor="p-barcode">
                    <Input id="p-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="8850000000000" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="หมวดหมู่ *" htmlFor="p-cat">
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger id="p-cat" className="w-full">
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.icon ? `${c.icon} ` : ''}
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="ประเภท" htmlFor="p-type">
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger id="p-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.emoji} {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="คำอธิบาย" htmlFor="p-desc">
                  <Textarea
                    id="p-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="รายละเอียด / วัตถุดิบ / คุณสมบัติพิเศษ"
                  />
                </Field>
                <Field label="แท็ก (คั่นด้วยจุลภาค)" htmlFor="p-tags">
                  <Input
                    id="p-tags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="ขนมไทย, สด, ยอดนิยม"
                  />
                  {tagsInput.trim() && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tagsInput.split(',').map((t, i) => (
                        t.trim() && <Badge key={i} variant="secondary" className="text-xs">{t.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </Field>
              </section>

              {/* Section: ราคาและต้นทุน */}
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-[var(--gold)]">💰 ราคาและต้นทุน</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="ราคาขาย (฿) *">
                    <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} required />
                  </Field>
                  <Field label="ราคาสมาชิก (฿)">
                    <Input type="number" min={0} value={memberPrice} onChange={(e) => setMemberPrice(e.target.value === '' ? '' : Number(e.target.value))} />
                  </Field>
                  <Field label="ราคาส่ง (฿)">
                    <Input type="number" min={0} value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))} />
                  </Field>
                  <Field label="ราคาอีเวนต์ (฿)">
                    <Input type="number" min={0} value={eventPrice} onChange={(e) => setEventPrice(e.target.value === '' ? '' : Number(e.target.value))} />
                  </Field>
                  <Field label="ต้นทุน (฿)">
                    <Input type="number" min={0} value={costPrice} onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))} />
                  </Field>
                  <Field label="หน่วย">
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="ชิ้น / กล่อง / แก้ว" />
                  </Field>
                </div>
              </section>

              {/* Section: คุณสมบัติ */}
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-[var(--gold)]">⭐ คุณสมบัติพิเศษ</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ToggleRow label="สินค้าขายดี" checked={isBestSeller} onChange={setIsBestSeller} />
                  <ToggleRow label="แนะนำ" checked={isFeatured} onChange={setIsFeatured} />
                  <ToggleRow label="แฟลชเซล" checked={isFlashSale} onChange={setIsFlashSale} />
                </div>
                {isFlashSale && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 sm:grid-cols-3"
                  >
                    <Field label="ราคาแฟลชเซล (฿)">
                      <Input type="number" min={0} value={flashSalePrice} onChange={(e) => setFlashSalePrice(e.target.value === '' ? '' : Number(e.target.value))} />
                    </Field>
                    <Field label="สิ้นสุดเมื่อ">
                      <Input type="datetime-local" value={flashSaleEndAt} onChange={(e) => setFlashSaleEndAt(e.target.value)} />
                    </Field>
                    <Field label="สต็อกแฟลชเซล">
                      <Input type="number" min={0} value={flashSaleStock} onChange={(e) => setFlashSaleStock(e.target.value === '' ? '' : Number(e.target.value))} />
                    </Field>
                  </motion.div>
                )}
              </section>

              {/* Section: การเก็บรักษา */}
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-[var(--gold)]">🧊 การเก็บรักษา</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="อายุการเก็บรักษา (ชั่วโมง)">
                    <Input type="number" min={0} value={shelfLifeHours} onChange={(e) => setShelfLifeHours(e.target.value === '' ? '' : Number(e.target.value))} placeholder="เช่น 12 สำหรับขนมสด" />
                  </Field>
                  <ToggleRow label="ต้องเก็บในตู้เย็น" checked={needsRefrigeration} onChange={setNeedsRefrigeration} />
                </div>
              </section>

              {/* Section: สารก่อภูมิแพ้ & ข้อกำหนดอาหาร (Task FILL-MULTI) */}
              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-[var(--gold)]">⚠️ สารก่อภูมิแพ้ & ข้อกำหนดอาหาร</h3>
                <Field label="สารก่อภูมิแพ้ (เลือกได้หลายขัย)">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ALLERGEN_PRESETS.map((a) => {
                      const checked = allergens.includes(a)
                      return (
                        <label
                          key={a}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs transition ${checked ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]' : 'border-border bg-card hover:bg-muted/50'}`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              if (v) setAllergens((prev) => [...prev, a])
                              else setAllergens((prev) => prev.filter((x) => x !== a))
                            }}
                          />
                          <span>{a}</span>
                        </label>
                      )
                    })}
                  </div>
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="วิธีการเก็บรักษา">
                    <Input value={storageInstructions} onChange={(e) => setStorageInstructions(e.target.value)} placeholder="เช่น แช่เย็น / อุณหภูมิห้อง" />
                  </Field>
                  <Field label="ควรบริโภคภายใน">
                    <Input value={consumeWithin} onChange={(e) => setConsumeWithin(e.target.value)} placeholder="เช่น 1 วัน / 3 วัน" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ToggleRow label="เจ (Vegan)" checked={isVegan} onChange={setIsVegan} />
                  <ToggleRow label="ฮาลาล (Halal)" checked={isHalal} onChange={setIsHalal} />
                  <ToggleRow label="มังสวิรัติ" checked={isVegetarian} onChange={setIsVegetarian} />
                </div>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90">
              {isEdit ? 'บันทึกการแก้ไข' : 'สร้างสินค้า'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
