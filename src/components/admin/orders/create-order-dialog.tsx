'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Minus,
  Search,
  Trash2,
  User,
  Phone,
  Loader2,
  ShoppingCart,
  Tag,
} from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatBaht, toThaiNumerals } from '@/lib/thai-date'
import {
  CHANNEL_CONFIG,
  ORDER_TYPE_CONFIG,
  PAYMENT_METHOD_CONFIG,
  type OrderChannel,
  type OrderType,
  type PaymentMethod,
} from '@/lib/order-status'
import { getProductVisual } from '@/lib/product-emoji'
import { cn } from '@/lib/utils'

interface ProductLite {
  id: string
  name: string
  slug: string
  type: string
  price: number
  unit: string
  category?: { name: string; slug: string; icon?: string | null } | null
}

interface LineItem {
  productId: string
  name: string
  price: number
  quantity: number
  notes?: string
  unit: string
}

interface CustomerLite {
  id: string
  name: string
  phone: string
  email?: string | null
  tier: string
  points: number
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated?: (orderId: string) => void
}

export function CreateOrderDialog({ open, onOpenChange, onCreated }: Props) {
  const [products, setProducts] = React.useState<ProductLite[]>([])
  const [productSearch, setProductSearch] = React.useState('')
  const [items, setItems] = React.useState<LineItem[]>([])

  const [customerName, setCustomerName] = React.useState('')
  const [customerPhone, setCustomerPhone] = React.useState('')
  const [customerEmail, setCustomerEmail] = React.useState('')
  const [customerId, setCustomerId] = React.useState<string | undefined>(undefined)
  const [customerFound, setCustomerFound] = React.useState<CustomerLite | null>(null)

  const [channel, setChannel] = React.useState<OrderChannel>('PHONE')
  const [orderType, setOrderType] = React.useState<OrderType>('PICKUP')
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('CASH')
  const [paymentStatus, setPaymentStatus] = React.useState<'UNPAID' | 'PAID'>('PAID')
  const [discount, setDiscount] = React.useState(0)
  const [shipping, setShipping] = React.useState(0)
  const [notes, setNotes] = React.useState('')
  const [deliveryAddress, setDeliveryAddress] = React.useState('')

  const [submitting, setSubmitting] = React.useState(false)

  // Load products once
  React.useEffect(() => {
    if (!open || products.length) return
    const ac = new AbortController()
    fetch('/api/products?limit=200', { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.products) setProducts(d.products)
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') toast.error('โหลดรายการสินค้าไม่สำเร็จ')
      })
    return () => ac.abort()
  }, [open, products.length])

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setItems([])
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
      setCustomerId(undefined)
      setCustomerFound(null)
      setDiscount(0)
      setShipping(0)
      setNotes('')
      setDeliveryAddress('')
      setProductSearch('')
    }
  }, [open])

  // Customer lookup when phone changes (debounced)
  React.useEffect(() => {
    if (!customerPhone || customerPhone.length < 8) {
      setCustomerFound(null)
      return
    }
    const ac = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/admin/customers?q=${encodeURIComponent(customerPhone)}`, {
        signal: ac.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.customers?.length) {
            // Find the customer whose phone matches exactly (the API uses contains)
            const exact = d.customers.find((c: CustomerLite) => c.phone === customerPhone) ?? d.customers[0]
            setCustomerFound(exact)
            if (!customerName) setCustomerName(exact.name)
            if (!customerEmail && exact.email) setCustomerEmail(exact.email)
            setCustomerId(exact.id)
          } else {
            setCustomerFound(null)
            setCustomerId(undefined)
          }
        })
        .catch((e) => {
          // AbortError fires when phone changes before the lookup resolves.
          if ((e as Error).name !== 'AbortError') {
            /* silent — non-critical lookup */
          }
        })
    }, 350)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [customerPhone, customerName, customerEmail])

  const filteredProducts = React.useMemo(() => {
    if (!productSearch.trim()) return products
    const q = productSearch.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q))
  }, [products, productSearch])

  const addItem = (p: ProductLite) => {
    setItems((prev) => {
      const found = prev.find((it) => it.productId === p.id)
      if (found) {
        return prev.map((it) =>
          it.productId === p.id ? { ...it, quantity: it.quantity + 1 } : it
        )
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, price: p.price, quantity: 1, unit: p.unit },
      ]
    })
  }
  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.productId === id ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it
        )
        .filter((it) => it.quantity > 0)
    )
  }
  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.productId !== id))

  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0)
  const total = Math.max(0, subtotal - discount + shipping)

  const canSubmit =
    items.length > 0 &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length >= 8 &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          customerId,
          type: orderType,
          paymentMethod,
          paymentStatus,
          items: items.map((it) => ({
            productId: it.productId,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            notes: it.notes,
          })),
          discount,
          shipping,
          notes: notes || undefined,
          deliveryAddress: deliveryAddress || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`สร้างออเดอร์ ${data.orderNo} แล้ว`)
      onOpenChange(false)
      onCreated?.(data.orderId)
    } catch (e: unknown) {
      toast.error('สร้างออเดอร์ไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b bg-[var(--forest)]/5 px-5 py-3 dark:bg-[var(--gold)]/5">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[var(--gold)]" />
            สร้างคำสั่งซื้อใหม่
          </DialogTitle>
          <DialogDescription className="text-xs">
            เพิ่มสินค้า ระบุลูกค้า และยืนยัน — ระบบจะตัดสต็อกและบันทึกการชำระเงินอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[calc(92vh-130px)] grid-cols-1 overflow-hidden md:grid-cols-2">
          {/* LEFT: product picker */}
          <div className="flex flex-col border-r">
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาสินค้า…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-3">
                {filteredProducts.map((p) => {
                  const v = getProductVisual(p.slug, p.name, p.type)
                  const inCart = items.find((it) => it.productId === p.id)?.quantity ?? 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItem(p)}
                      className={cn(
                        'group relative flex h-24 flex-col items-center justify-center gap-1 rounded-lg border-2 bg-card p-2 text-center transition-all hover:border-[var(--gold)] hover:shadow-md',
                        inCart > 0 && 'border-[var(--gold)] bg-[var(--gold)]/5'
                      )}
                    >
                      <span className="text-3xl">{v.emoji}</span>
                      <span className="line-clamp-2 text-[11px] font-medium leading-tight">{p.name}</span>
                      <span className="text-[11px] font-bold text-[var(--gold)]">{formatBaht(p.price)}</span>
                      {inCart > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--forest)] px-1 text-[10px] font-bold text-white dark:bg-[var(--gold)] dark:text-[var(--gold-foreground)]">
                          {toThaiNumerals(inCart)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {filteredProducts.length === 0 && (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  ไม่พบสินค้าที่ตรงกับ "{productSearch}"
                </div>
              )}
            </ScrollArea>
          </div>

          {/* RIGHT: cart + customer + payment */}
          <div className="flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-4">
                {/* Customer */}
                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> ข้อมูลลูกค้า
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">ชื่อ</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="ชื่อลูกค้า"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">เบอร์โทร</Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="08x-xxx-xxxx"
                          className="h-9 pl-8"
                        />
                      </div>
                    </div>
                  </div>
                  {customerFound && (
                    <div className="flex items-center gap-2 rounded-md bg-[var(--gold)]/10 px-2 py-1 text-xs">
                      <Badge variant="secondary" className="text-[10px]">{customerFound.tier}</Badge>
                      <span>สมาชิกเดิม · แต้มสะสม {toThaiNumerals(customerFound.points)}</span>
                    </div>
                  )}
                  <Input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="อีเมล (ถ้ามี)"
                    className="h-9"
                  />
                </section>

                {/* Cart */}
                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <ShoppingCart className="h-3.5 w-3.5" /> ตะกร้า ({toThaiNumerals(items.length)})
                  </h3>
                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                      คลิกสินค้าทางซ้ายเพื่อเพิ่มในตะกร้า
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((it) => (
                        <div key={it.productId} className="flex items-center gap-2 rounded-md border bg-card p-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{it.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {formatBaht(it.price)} × {toThaiNumerals(it.quantity)} = {formatBaht(it.price * it.quantity)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.productId, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">
                              {toThaiNumerals(it.quantity)}
                            </span>
                            <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.productId, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeItem(it.productId)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Order config */}
                <section className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">ช่องทาง</Label>
                    <Select value={channel} onValueChange={(v) => setChannel(v as OrderChannel)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">ประเภท</Label>
                    <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ORDER_TYPE_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">วิธีชำระ</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px]">สถานะชำระ</Label>
                    <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'UNPAID' | 'PAID')}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAID">ชำระแล้ว</SelectItem>
                        <SelectItem value="UNPAID">ยังไม่ชำระ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                {/* Delivery & notes */}
                {(orderType === 'DELIVERY' || orderType === 'PREORDER') && (
                  <Input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="ที่อยู่จัดส่ง"
                    className="h-9"
                  />
                )}
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="หมายเหตุ (เช่น ไม่ใส่กะทิ, เผื่อเวลา 30 นาที)"
                  className="min-h-16 text-sm"
                />

                {/* Totals */}
                <section className="rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">รวมก่อนหัก</span>
                      <span className="tabular-nums">{formatBaht(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Tag className="h-3 w-3" /> ส่วนลด
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                        className="h-7 w-24 text-right tabular-nums"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">ค่าจัดส่ง</span>
                      <Input
                        type="number"
                        min={0}
                        value={shipping}
                        onChange={(e) => setShipping(Math.max(0, Number(e.target.value) || 0))}
                        className="h-7 w-24 text-right tabular-nums"
                      />
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-base font-bold">
                      <span>รวมทั้งสิ้น</span>
                      <span className="tabular-nums text-[var(--gold)]">{formatBaht(total)}</span>
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t bg-card p-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="min-w-32">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก…
              </>
            ) : (
              <>สร้างออเดอร์ · {formatBaht(total)}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
