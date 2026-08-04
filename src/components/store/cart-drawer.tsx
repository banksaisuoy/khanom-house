'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBag, Tag, Truck, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart-store'
import { formatTHB } from '@/lib/types'
import { CheckoutDialog } from './checkout-dialog'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function CartDrawer({ open, onOpenChange }: Props) {
  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.removeItem)
  const updateQty = useCart((s) => s.updateQty)
  const subtotal = useCart((s) => s.subtotal())
  const shipping = useCart((s) => s.shipping())
  const total = useCart((s) => s.total())
  const discount = useCart((s) => s.discount)
  const couponCode = useCart((s) => s.couponCode)
  const applyCoupon = useCart((s) => s.applyCoupon)
  const removeCoupon = useCart((s) => s.removeCoupon)
  const [coupon, setCoupon] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return
    setChecking(true)
    try {
      const res = await fetch(
        `/api/promotions/validate?code=${encodeURIComponent(coupon.trim())}`
      )
      const data = await res.json()
      if (data.valid) {
        applyCoupon(data.code, data.discount)
        toast.success(`ใช้คูปอง "${data.code}" สำเร็จ`, {
          description: `ลด ${Math.round(data.discount * 100)}%`,
        })
        setCoupon('')
      } else {
        toast.error(data.error || 'คูปองไม่ถูกต้อง')
      }
    } catch {
      toast.error('ตรวจสอบคูปองไม่สำเร็จ')
    } finally {
      setChecking(false)
    }
  }

  const discountAmount = subtotal * discount

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0"
        >
          <SheetHeader className="bg-primary text-primary-foreground p-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ShoppingBag className="h-5 w-5" />
              ตะกร้าสินค้า ({items.length})
            </SheetTitle>
            <SheetDescription className="text-primary-foreground/80">
              ตรวจสอบรายการและดำเนินการสั่งซื้อ
            </SheetDescription>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="text-7xl">🧺</div>
              <div>
                <p className="font-semibold text-foreground">ตะกร้าว่างเปล่า</p>
                <p className="text-sm text-muted-foreground">
                  เริ่มเลือกขนมกันเลย!
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gold text-gold hover:bg-gold/10"
              >
                เลือกขนมต่อ
              </Button>
            </div>
          ) : (
            <>
              {/* Items list */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex gap-3 rounded-lg border border-border bg-card p-2"
                  >
                    <div
                      className={`grid h-16 w-16 shrink-0 place-items-center rounded-md bg-gradient-to-br ${it.gradient} text-3xl`}
                    >
                      {it.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-sm line-clamp-1">
                          {it.name}
                        </p>
                        <button
                          onClick={() => removeItem(it.id)}
                          aria-label="ลบ"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTHB(it.price)} / {it.unit}
                        {it.isFlashSale && (
                          <Badge
                            variant="secondary"
                            className="ml-1 text-[9px] py-0 bg-red-100 text-red-700"
                          >
                            แฟลชเซล
                          </Badge>
                        )}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(it.id, it.quantity - 1)}
                            aria-label="ลดจำนวน"
                            className="grid h-7 w-7 place-items-center rounded-full border border-border hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-medium">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(it.id, it.quantity + 1)}
                            aria-label="เพิ่มจำนวน"
                            className="grid h-7 w-7 place-items-center rounded-full border border-border hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-gold">
                          {formatTHB(it.price * it.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="border-t border-border p-3 space-y-2">
                {couponCode ? (
                  <div className="flex items-center justify-between rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2">
                    <span className="text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <Tag className="h-3 w-3" /> คูปอง "{couponCode}" (
                      {Math.round(discount * 100)}%)
                    </span>
                    <button
                      onClick={() => {
                        removeCoupon()
                        toast.success('นำคูปองออกแล้ว')
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="รหัสคูปอง (ลอง KH10)"
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyCoupon()
                      }}
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={checking}
                      variant="outline"
                      className="border-gold text-gold hover:bg-gold/10"
                    >
                      ใช้
                    </Button>
                  </div>
                )}

                {/* Free shipping progress */}
                {subtotal < 500 && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    ซื้อเพิ่ม {formatTHB(500 - subtotal)} ได้จัดส่งฟรี!
                  </p>
                )}
                {subtotal >= 500 && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Truck className="h-3 w-3" /> ยอดครบ ฿500 จัดส่งฟรี!
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="border-t border-border p-3 space-y-2 bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">รวมสินค้า</span>
                  <span>{formatTHB(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400">
                    <span>ส่วนลดคูปอง</span>
                    <span>-{formatTHB(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ค่าจัดส่ง</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ฟรี
                      </span>
                    ) : (
                      formatTHB(shipping)
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">รวมทั้งหมด</span>
                  <span className="text-xl font-bold text-gold">
                    {formatTHB(total)}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    onOpenChange(false)
                    setCheckoutOpen(true)
                  }}
                  className="w-full h-11 bg-gold text-gold-foreground hover:bg-gold/90 font-semibold"
                >
                  ดำเนินการสั่งซื้อ
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  )
}
