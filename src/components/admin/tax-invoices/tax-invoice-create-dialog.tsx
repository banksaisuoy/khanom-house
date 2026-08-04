'use client'

import * as React from 'react'
import { FileText, User, Building2, Phone, Mail, MapPin } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatBaht, formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import type { EligibleOrder } from './tax-invoices-client'

export type TaxInvoiceFormValues = {
  orderId: string
  customerName: string
  customerTaxId?: string
  customerAddress?: string
  customerEmail?: string
  customerPhone?: string
}

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  eligibleOrders: EligibleOrder[]
  onSubmit: (values: TaxInvoiceFormValues) => void
}

export function TaxInvoiceCreateDialog({
  open, onOpenChange, eligibleOrders, onSubmit,
}: Props) {
  const [orderId, setOrderId] = React.useState('')
  const [customerName, setCustomerName] = React.useState('')
  const [customerTaxId, setCustomerTaxId] = React.useState('')
  const [customerAddress, setCustomerAddress] = React.useState('')
  const [customerEmail, setCustomerEmail] = React.useState('')
  const [customerPhone, setCustomerPhone] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setOrderId(eligibleOrders[0]?.id ?? '')
    setCustomerName(eligibleOrders[0]?.customerName ?? '')
    setCustomerTaxId('')
    setCustomerAddress('')
    setCustomerEmail(eligibleOrders[0]?.customerEmail ?? '')
    setCustomerPhone(eligibleOrders[0]?.customerPhone ?? '')
  }, [open, eligibleOrders])

  // When order changes, prefill customer info
  React.useEffect(() => {
    if (!open) return
    const o = eligibleOrders.find((x) => x.id === orderId)
    if (!o) return
    setCustomerName(o.customerName)
    setCustomerPhone(o.customerPhone)
    setCustomerEmail(o.customerEmail ?? '')
  }, [orderId, open, eligibleOrders])

  const selectedOrder = eligibleOrders.find((o) => o.id === orderId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orderId || !customerName.trim()) return
    onSubmit({
      orderId,
      customerName: customerName.trim(),
      customerTaxId: customerTaxId.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--gold)]" />
            ออกใบกำกับภาษี
          </DialogTitle>
          <DialogDescription>
            เลือกคำสั่งซื้อและกรอกข้อมูลลูกค้าเพื่อออกใบกำกับภาษี
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 px-6 py-5">
              <Field label="เลือกคำสั่งซื้อ *">
                {eligibleOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 rounded-md border bg-muted/30">
                    ไม่มีคำสั่งซื้อที่สามารถออกใบกำกับภาษีได้ในขณะนี้
                  </p>
                ) : (
                  <Select value={orderId} onValueChange={setOrderId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="เลือกคำสั่งซื้อ" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleOrders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.orderNo} — {o.customerName} ({formatBaht(o.total)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>

              {selectedOrder && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เลขที่คำสั่งซื้อ</span>
                    <span className="font-mono font-semibold">{selectedOrder.orderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ยอดรวม</span>
                    <span className="font-semibold text-[var(--gold)]">{formatBaht(selectedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">วันที่สั่งซื้อ</span>
                    <span>{formatThaiDate(new Date(selectedOrder.createdAt), { short: true })}</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-[var(--gold)]">📋 ข้อมูลลูกค้า (สำหรับใบกำกับภาษี)</h3>
                <Field label="ชื่อลูกค้า / บริษัท *">
                  <div className="relative">
                    <User className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-7"
                      placeholder="ชื่อ-นามสกุล หรือ ชื่อบริษัท"
                      required
                    />
                  </div>
                </Field>
                <Field label="เลขประจำตัวผู้เสียภาษี (13 หลัก)">
                  <div className="relative">
                    <Building2 className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerTaxId}
                      onChange={(e) => setCustomerTaxId(e.target.value)}
                      className="pl-7 font-mono"
                      placeholder="X-XXXX-XXXXX-XXX-X"
                      maxLength={17}
                    />
                  </div>
                </Field>
                <Field label="ที่อยู่">
                  <div className="relative">
                    <MapPin className="absolute left-2 top-3 h-3.5 w-3.5 text-muted-foreground" />
                    <Textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="pl-7"
                      rows={2}
                      placeholder="เลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
                    />
                  </div>
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="โทรศัพท์">
                    <div className="relative">
                      <Phone className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="pl-7"
                        placeholder="08x-xxx-xxxx"
                      />
                    </div>
                  </Field>
                  <Field label="อีเมล">
                    <div className="relative">
                      <Mail className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="pl-7"
                        placeholder="customer@email.com"
                      />
                    </div>
                  </Field>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  หมายเหตุ: ระบบจะคำนวณภาษีมูลค่าเพิ่ม {toThaiNumerals(7)}% จากยอดคำสั่งซื้อ
                </p>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button
              type="submit"
              className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
              disabled={!orderId || !customerName.trim()}
            >
              <FileText className="mr-1 h-4 w-4" /> ออกใบกำกับภาษี
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
