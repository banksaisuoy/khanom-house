'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Copy, Truck, Wallet, QrCode, CreditCard, MapPin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/lib/cart-store'
import { formatTHB } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const TIME_SLOTS = [
  '09:00 - 12:00',
  '12:00 - 15:00',
  '15:00 - 18:00',
  '18:00 - 21:00',
]

export function CheckoutDialog({ open, onOpenChange }: Props) {
  const items = useCart((s) => s.items)
  const subtotal = useCart((s) => s.subtotal())
  const shipping = useCart((s) => s.shipping())
  const discount = useCart((s) => s.discount)
  const total = useCart((s) => s.total())
  const couponCode = useCart((s) => s.couponCode)
  const clearCart = useCart((s) => s.clearCart)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    wantAt: '',
    wantTime: TIME_SLOTS[0],
    notes: '',
    paymentMethod: 'CASH',
  })
  const [submitting, setSubmitting] = useState(false)
  const [shippingInfo, setShippingInfo] = useState<{
    zoneName: string | null
    shippingFee: number | null
    estimatedDays: number | null
    freeShippingApplied: boolean
    calculating: boolean
    matched: boolean
  }>({ zoneName: null, shippingFee: null, estimatedDays: null, freeShippingApplied: false, calculating: false, matched: false })
  const [success, setSuccess] = useState<{
    orderNo: string
    total: number
  } | null>(null)

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Calculate shipping fee based on address + subtotal (Task FILL-MULTI)
  const calculateShipping = async (address: string) => {
    if (!address || address.trim().length < 5) {
      setShippingInfo({
        zoneName: null,
        shippingFee: null,
        estimatedDays: null,
        freeShippingApplied: false,
        calculating: false,
        matched: false,
      })
      return
    }
    setShippingInfo((prev) => ({ ...prev, calculating: true }))
    try {
      const res = await fetch('/api/delivery-zones/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, subtotal }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'คำนวณค่าจัดส่งไม่สำเร็จ')
      if (data.zone) {
        setShippingInfo({
          zoneName: data.zone.name,
          shippingFee: data.shippingFee,
          estimatedDays: data.zone.estimatedDays,
          freeShippingApplied: data.freeShippingApplied,
          calculating: false,
          matched: true,
        })
      } else {
        setShippingInfo({
          zoneName: null,
          shippingFee: null,
          estimatedDays: null,
          freeShippingApplied: false,
          calculating: false,
          matched: false,
        })
      }
    } catch {
      setShippingInfo((prev) => ({ ...prev, calculating: false, matched: false }))
    }
  }

  // Recompute when address or subtotal changes (debounced via simple effect)
  // Use onBlur + onInput to avoid excessive API calls
  const handleAddressChange = (v: string) => {
    set('address', v)
  }

  // Derived shipping fee for display
  const effectiveShipping = shippingInfo.matched ? (shippingInfo.shippingFee ?? 0) : shipping
  const effectiveTotal = Math.max(0, subtotal - subtotal * discount) + effectiveShipping

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address) {
      toast.error('กรุณากรอกชื่อ เบอร์โทร และที่อยู่')
      return
    }
    if (!/^[0-9+\-\s]{8,15}$/.test(form.phone)) {
      toast.error('เบอร์โทรไม่ถูกต้อง')
      return
    }
    // If address has been entered but shipping not yet calculated, attempt now
    if (form.address && form.address.trim().length >= 5 && !shippingInfo.matched) {
      await calculateShipping(form.address)
    }
    setSubmitting(true)
    try {
      const payload = {
        items: items.map((it) => ({
          productId: it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          total: it.price * it.quantity,
        })),
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email || undefined,
        address: form.address,
        wantAt: form.wantAt || undefined,
        wantTime: form.wantTime,
        paymentMethod: form.paymentMethod,
        notes: form.notes || undefined,
        subtotal,
        discount: subtotal * discount,
        shipping: effectiveShipping,
        total: effectiveTotal,
        couponCode,
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'สั่งซื้อไม่สำเร็จ')
      }
      setSuccess({ orderNo: data.orderNo, total: data.total })
      clearCart()
      toast.success('สั่งซื้อสำเร็จ!', {
        description: `หมายเลขคำสั่งซื้อ ${data.orderNo}`,
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    if (success) {
      setSuccess(null)
      setForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        wantAt: '',
        wantTime: TIME_SLOTS[0],
        notes: '',
        paymentMethod: 'CASH',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        {success ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className="h-20 w-20 text-emerald-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground">
              สั่งซื้อสำเร็จ!
            </h2>
            <p className="text-muted-foreground">ขอบคุณที่อุดหนุน Khanom House</p>
            <div className="rounded-lg border border-border bg-muted/30 p-4 w-full max-w-sm">
              <p className="text-xs text-muted-foreground">หมายเลขคำสั่งซื้อ</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-xl font-mono font-bold text-gold">
                  {success.orderNo}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(success.orderNo)
                    toast.success('คัดลอกแล้ว')
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ยอดรวม</span>
                <span className="font-bold text-gold">
                  {formatTHB(success.total)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">
              เราจะติดต่อกลับเพื่อยืนยันออเดอร์ในเร็วๆ นี้ หรือติดตามสถานะออเดอร์ได้ที่เมนู &quot;ติดตามออเดอร์&quot;
            </p>
            <Button
              onClick={() => {
                toast.success('เปิดหน้าติดตามออเดอร์ (เดโม่)')
                handleClose()
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Truck className="h-4 w-4 mr-2" />
              ติดตามออเดอร์
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">ดำเนินการสั่งซื้อ</DialogTitle>
              <DialogDescription>
                กรอกข้อมูลจัดส่งและเลือกวิธีชำระเงิน
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Customer info */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="คุณสมชาย ใจดี"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">เบอร์โทร *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">ที่อยู่จัดส่ง *</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onBlur={(e) => calculateShipping(e.target.value)}
                  placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
                  rows={2}
                />
                {shippingInfo.calculating && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> กำลังคำนวณค่าจัดส่ง...
                  </p>
                )}
                {shippingInfo.matched && shippingInfo.zoneName && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    โซนจัดส่ง: {shippingInfo.zoneName}
                    {shippingInfo.estimatedDays != null && ` · ประมาณ ${shippingInfo.estimatedDays} วัน`}
                  </p>
                )}
                {form.address && form.address.trim().length >= 5 && !shippingInfo.matched && !shippingInfo.calculating && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    ⚠️ ยังไม่พบโซนจัดส่ง — ค่าจัดส่งใช้เกณฑ์มาตรฐาน {formatTHB(shipping)}
                  </p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wantAt">วันที่ต้องการรับ</Label>
                  <Input
                    id="wantAt"
                    type="date"
                    value={form.wantAt}
                    onChange={(e) => set('wantAt', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wantTime">ช่วงเวลา</Label>
                  <select
                    id="wantTime"
                    value={form.wantTime}
                    onChange={(e) => set('wantTime', e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">หมายเหตุ</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="เช่น ไม่ใส่กะทิ หรือโทรก่อนจัดส่ง"
                  rows={2}
                />
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <Label>วิธีชำระเงิน</Label>
                <RadioGroup
                  value={form.paymentMethod}
                  onValueChange={(v) => set('paymentMethod', v)}
                  className="grid sm:grid-cols-3 gap-2"
                >
                  <PaymentOption
                    value="CASH"
                    icon={<Wallet className="h-4 w-4" />}
                    label="เก็บเงินปลายทาง"
                  />
                  <PaymentOption
                    value="PROMPTPAY"
                    icon={<QrCode className="h-4 w-4" />}
                    label="พร้อมเพย์ QR"
                  />
                  <PaymentOption
                    value="CARD"
                    icon={<CreditCard className="h-4 w-4" />}
                    label="บัตรเครดิต"
                  />
                </RadioGroup>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-sm font-semibold mb-1">สรุปคำสั่งซื้อ</p>
                <div className="max-h-32 overflow-y-auto scrollbar-thin space-y-1 mb-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span className="line-clamp-1">
                        {it.emoji} {it.name} × {it.quantity}
                      </span>
                      <span>{formatTHB(it.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">รวมสินค้า</span>
                  <span>{formatTHB(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700 dark:text-emerald-400">
                    <span>ส่วนลด</span>
                    <span>-{formatTHB(subtotal * discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ค่าจัดส่ง</span>
                  <span>
                    {shippingInfo.calculating ? (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> คำนวณ...
                      </span>
                    ) : effectiveShipping === 0 ? (
                      <span className="text-emerald-600">
                        ฟรี{shippingInfo.freeShippingApplied && ' (โปรโมชั่น)'}
                      </span>
                    ) : (
                      formatTHB(effectiveShipping)
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">รวมทั้งหมด</span>
                  <span className="text-lg font-bold text-gold">
                    {formatTHB(effectiveTotal)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || items.length === 0}
                className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold"
              >
                {submitting ? 'กำลังสั่งซื้อ...' : 'ยืนยันคำสั่งซื้อ'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PaymentOption({
  value,
  icon,
  label,
}: {
  value: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Label
      htmlFor={`pay-${value}`}
      className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted/50 has-[:checked]:border-gold has-[:checked]:bg-gold/10"
    >
      <RadioGroupItem id={`pay-${value}`} value={value} />
      {icon}
      <span className="text-xs">{label}</span>
    </Label>
  )
}
