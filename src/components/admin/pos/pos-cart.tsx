'use client'

import * as React from 'react'
import { Minus, Plus, Trash2, Search, X, UserPlus, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  unit: string
  stock: number
}

export interface PosCartProps {
  items: CartItem[]
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>
  subtotal: number
  discount: number
  setDiscount: (v: number) => void
  total: number
  shiftNo: string
  customer: { id?: string; name: string; phone?: string; tier?: string } | null
  onAttachCustomer: () => void
  onClearCustomer: () => void
  onCheckout: () => void
  onCloseShift: () => void
  onCashMove: () => void
  onShowBills: () => void
  onHold: () => void
  onRecall: () => void
}

export function PosCart({
  items,
  setItems,
  subtotal,
  discount,
  setDiscount,
  total,
  shiftNo,
  customer,
  onAttachCustomer,
  onClearCustomer,
  onCheckout,
  onCloseShift,
  onCashMove,
  onShowBills,
  onHold,
  onRecall,
}: PosCartProps) {
  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.productId === id
            ? { ...it, quantity: Math.max(0, Math.min(it.stock || 999, it.quantity + delta)) }
            : it
        )
        .filter((it) => it.quantity > 0)
    )
  }
  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.productId !== id))
  const clearAll = () => setItems([])

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-[var(--forest)] px-3 py-2 text-primary-foreground dark:bg-[var(--gold)] dark:text-[var(--gold-foreground)]">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/20 text-primary-foreground dark:bg-black/20 dark:text-[var(--gold-foreground)]">
            SHIFT
          </Badge>
          <span className="text-sm font-bold">{shiftNo}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-primary-foreground hover:bg-white/10 dark:text-[var(--gold-foreground)] dark:hover:bg-black/10"
          onClick={onCloseShift}
        >
          ปิดกะ
        </Button>
      </div>

      {/* Customer */}
      <div className="border-b p-3">
        {customer ? (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{customer.name}</span>
                {customer.tier && (
                  <Badge variant="secondary" className="text-[9px]">{customer.tier}</Badge>
                )}
              </div>
              {customer.phone && (
                <div className="text-xs text-muted-foreground">{customer.phone}</div>
              )}
            </div>
            <Button size="sm" variant="ghost" className="h-7" onClick={onClearCustomer}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="h-11 w-full justify-start gap-2"
            onClick={onAttachCustomer}
          >
            <UserPlus className="h-4 w-4" />
            ลูกค้าทั่วไป (คลิกเพื่อเพิ่ม)
          </Button>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 min-h-0">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <div className="text-5xl">🛒</div>
            <p className="text-sm font-medium">ตะกร้าว่าง</p>
            <p className="text-xs">แตะสินค้าทางซ้ายเพื่อเพิ่ม</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 p-2">
              {items.map((it) => (
                <div
                  key={it.productId}
                  className="rounded-lg border bg-card p-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatBaht(it.price)} / {it.unit}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-red-500"
                      onClick={() => removeItem(it.productId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => updateQty(it.productId, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center text-base font-bold tabular-nums">
                        {toThaiNumerals(it.quantity)}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => updateQty(it.productId, 1)}
                        disabled={it.quantity >= it.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-base font-bold tabular-nums text-[var(--gold)]">
                      {formatBaht(it.price * it.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Totals + actions */}
      <div className="border-t bg-muted/30 p-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">รวมก่อนหัก</span>
            <span className="tabular-nums">{formatBaht(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">ส่วนลด</span>
            <Input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="h-7 w-24 text-right tabular-nums"
            />
          </div>
          <Separator className="my-1" />
          <div className="flex items-center justify-between text-xl font-bold">
            <span>รวมทั้งสิ้น</span>
            <span className="tabular-nums text-[var(--gold)]">{formatBaht(total)}</span>
          </div>
        </div>

        <Button
          size="lg"
          className={cn(
            'mt-3 h-14 w-full text-base font-bold',
            items.length === 0 && 'opacity-50'
          )}
          disabled={items.length === 0}
          onClick={onCheckout}
        >
          ชำระเงิน · {formatBaht(total)}
        </Button>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={onHold} disabled={items.length === 0}>
            <Pause className="h-3.5 w-3.5" /> พักบิล
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={onRecall}>
            <Play className="h-3.5 w-3.5" /> เรียกบิล
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <Button size="sm" variant="outline" className="h-9" onClick={onCashMove}>
            รับเข้าลิ้นชัก
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={onCashMove}>
            จ่ายออกลิ้นชัก
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={onShowBills}>
            บิลย้อนหลัง
          </Button>
        </div>
        {items.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 h-7 w-full text-xs text-muted-foreground"
            onClick={clearAll}
          >
            ล้างตะกร้า
          </Button>
        )}
      </div>
    </div>
  )
}
