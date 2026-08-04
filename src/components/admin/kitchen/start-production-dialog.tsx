'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, ChefHat } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { getProductVisual } from '@/lib/product-emoji'
import { cn } from '@/lib/utils'

interface RecipeProduct {
  id: string
  name: string
  slug: string
  type: string
  unit: string
  recipe: {
    yieldQty: number
    yieldUnit: string
    prepTimeMin: number
    cookTimeMin: number
    instructions: string | null
    items: { ingredientName: string; quantity: number; unit: string; costPerUnit: number }[]
  }
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated?: () => void
}

export function StartProductionDialog({ open, onOpenChange, onCreated }: Props) {
  const [products, setProducts] = React.useState<RecipeProduct[]>([])
  const [productId, setProductId] = React.useState<string>('')
  const [plannedQty, setPlannedQty] = React.useState(10)
  const [priority, setPriority] = React.useState(0)
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    // Fetch products with recipes
    fetch('/api/admin/production?products-with-recipes=1')
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? [])
        if (d.products?.length && !productId) setProductId(d.products[0].id)
      })
      .catch(() => toast.error('โหลดรายการสินค้าไม่สำเร็จ'))
  }, [open, productId])

  React.useEffect(() => {
    if (!open) {
      setPlannedQty(10)
      setPriority(0)
      setNotes('')
    }
  }, [open])

  const product = products.find((p) => p.id === productId) ?? null
  const recipe = product?.recipe ?? null
  const scale = recipe && recipe.yieldQty > 0 ? plannedQty / recipe.yieldQty : 0
  const totalCost = recipe ? recipe.items.reduce((s, ri) => s + ri.quantity * scale * ri.costPerUnit, 0) : 0

  const submit = async () => {
    if (!productId) {
      toast.error('กรุณาเลือกสินค้า')
      return
    }
    if (plannedQty <= 0) {
      toast.error('ปริมาณต้องมากกว่า 0')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, plannedQty, priority, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`สร้างคิวผลิต ${data.batchNo} แล้ว`)
      onOpenChange(false)
      onCreated?.()
    } catch (e: unknown) {
      toast.error('สร้างคิวผลิตไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-[var(--gold)]" /> เริ่มผลิตใหม่
          </DialogTitle>
          <DialogDescription>เลือกสินค้าที่มีสูตร แล้วระบุปริมาณที่จะผลิต</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Left: form */}
          <div className="space-y-3">
            <div>
              <Label>สินค้า (ที่มีสูตร)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="เลือกสินค้า…" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => {
                    const v = getProductVisual(p.slug, p.name, p.type)
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {v.emoji} {p.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {products.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">กำลังโหลด…</p>
              )}
            </div>

            <div>
              <Label>ปริมาณที่จะผลิต ({product?.unit ?? 'หน่วย'})</Label>
              <Input
                type="number"
                min={1}
                step={5}
                value={plannedQty}
                onChange={(e) => setPlannedQty(Math.max(1, Number(e.target.value) || 1))}
                className="h-12 text-center text-xl font-bold tabular-nums"
              />
              {recipe && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  สูตรได้ {toThaiNumerals(recipe.yieldQty)} {recipe.yieldUnit} · สเกล ×{scale.toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <Label>ความสำคัญ</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 0, label: 'ปกติ' },
                  { v: 1, label: 'ด่วน' },
                  { v: 2, label: 'ด่วนมาก' },
                ].map((p) => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => setPriority(p.v)}
                    className={cn(
                      'h-10 rounded-lg border-2 text-sm font-medium transition-colors',
                      priority === p.v
                        ? p.v === 0
                          ? 'border-muted-foreground bg-muted text-foreground'
                          : p.v === 1
                            ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                        : 'border-border hover:border-foreground/30'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="หมายเหตุ (เช่น ลูกค้าสั่งพิเศษ งานมงคล)"
              className="min-h-16"
            />

            {recipe && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เวลาเตรียม + ทำ</span>
                  <span className="font-bold">{toThaiNumerals(recipe.prepTimeMin + recipe.cookTimeMin)} นาที</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ต้นทุนประมาณ</span>
                  <span className="font-bold text-[var(--gold)]">{formatBaht(totalCost)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: scaled recipe preview */}
          <div className="rounded-lg border bg-card p-3">
            <h4 className="mb-2 text-sm font-semibold">ตัวอย่างวัตถุดิบที่ต้องใช้</h4>
            {recipe ? (
              <ScrollArea className="max-h-72">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">วัตถุดิบ</th>
                      <th className="px-2 py-1 text-right font-medium">ปริมาณ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.items.map((ri, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5">{ri.ingredientName}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                          {toThaiNumerals((ri.quantity * scale).toFixed(2))} {ri.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                เลือกสินค้าเพื่อดูวัตถุดิบ
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={submitting || !productId} size="lg">
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> กำลังสร้าง…</>
            ) : (
              <><Plus className="h-4 w-4" /> สร้างคิวผลิต</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
