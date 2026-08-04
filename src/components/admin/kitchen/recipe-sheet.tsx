'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toThaiNumerals, formatBaht } from '@/lib/thai-date'
import { getProductVisual } from '@/lib/product-emoji'
import type { BatchDTO } from './batch-card'

interface Props {
  batch: BatchDTO | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function RecipeSheet({ batch, open, onOpenChange }: Props) {
  if (!batch || !batch.recipe) {
    // Even if no recipe, show product info
    if (batch && open) {
      return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{batch.productName}</SheetTitle>
              <SheetDescription>ไม่มีสูตรในระบบ</SheetDescription>
            </SheetHeader>
            <div className="p-4 text-sm text-muted-foreground">
              สินค้านี้ยังไม่มีสูตรอาหารบันทึกไว้
            </div>
          </SheetContent>
        </Sheet>
      )
    }
    return null
  }

  const v = getProductVisual(batch.productSlug, batch.productName, batch.productType)
  const recipe = batch.recipe
  const scale = batch.plannedQty / recipe.yieldQty
  const totalCost = recipe.items.reduce((s, ri) => s + ri.quantity * scale * ri.costPerUnit, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b bg-[var(--forest)]/5 px-4 py-3 dark:bg-[var(--gold)]/5">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <span className="text-3xl">{v.emoji}</span>
            {batch.productName}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {batch.batchNo} · แผนผลิต {toThaiNumerals(batch.plannedQty)} {batch.unit}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {/* Yield info */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-muted/30 p-2">
                <div className="text-[10px] text-muted-foreground">สูตรได้</div>
                <div className="text-sm font-bold">{toThaiNumerals(recipe.yieldQty)} {recipe.yieldUnit}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2">
                <div className="text-[10px] text-muted-foreground">เตรียม</div>
                <div className="text-sm font-bold">{toThaiNumerals(recipe.prepTimeMin)} นาที</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2">
                <div className="text-[10px] text-muted-foreground">ทำ</div>
                <div className="text-sm font-bold">{toThaiNumerals(recipe.cookTimeMin)} นาที</div>
              </div>
            </div>

            {/* Ingredients — scaled */}
            <section>
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>วัตถุดิบ (สำหรับ {toThaiNumerals(batch.plannedQty)} {batch.unit})</span>
                <Badge variant="secondary" className="text-[10px]">
                  สเกล ×{scale.toFixed(2)}
                </Badge>
              </h3>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">วัตถุดิบ</th>
                      <th className="px-3 py-2 text-right font-medium">ปริมาณ</th>
                      <th className="px-3 py-2 text-right font-medium">ต้นทุน</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {recipe.items.map((ri, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-t"
                        >
                          <td className="px-3 py-2.5 font-medium">{ri.ingredientName}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {toThaiNumerals((ri.quantity * scale).toFixed(2))} {ri.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {formatBaht(ri.quantity * scale * ri.costPerUnit)}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30">
                      <td colSpan={2} className="px-3 py-2 text-right font-bold">ต้นทุนรวม</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-[var(--gold)]">{formatBaht(totalCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Instructions */}
            {recipe.instructions && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">วิธีทำ</h3>
                <div className="rounded-lg border bg-card p-3 text-sm leading-relaxed">
                  {recipe.instructions}
                </div>
              </section>
            )}

            {batch.notes && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">หมายเหตุการผลิต</h3>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  {batch.notes}
                </div>
              </section>
            )}

            <Separator />
            <div className="text-center text-xs text-muted-foreground">
              ปรุงโดย {batch.cookName ?? '—'}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
