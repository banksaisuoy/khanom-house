'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { TruckIcon, Phone, Mail, MapPin, Building, Star } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'

export type SupplierFormValues = {
  name: string
  code?: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  taxId?: string | null
  paymentTerms?: string | null
  rating: number
  isActive: boolean
}

export type SupplierRow = {
  id: string
  name: string
  code: string
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  taxId: string | null
  paymentTerms: string | null
  rating: number
  isActive: boolean
  poCount: number
  createdAt: string
  updatedAt: string
}

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  supplier?: SupplierRow
  onSubmit: (values: SupplierFormValues, id?: string) => void
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSubmit }: Props) {
  const isEdit = !!supplier
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [contactName, setContactName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [taxId, setTaxId] = React.useState('')
  const [paymentTerms, setPaymentTerms] = React.useState('')
  const [rating, setRating] = React.useState(3)
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    if (supplier) {
      setName(supplier.name)
      setCode(supplier.code)
      setContactName(supplier.contactName ?? '')
      setPhone(supplier.phone ?? '')
      setEmail(supplier.email ?? '')
      setAddress(supplier.address ?? '')
      setTaxId(supplier.taxId ?? '')
      setPaymentTerms(supplier.paymentTerms ?? '')
      setRating(supplier.rating)
      setIsActive(supplier.isActive)
    } else {
      setName('')
      setCode('')
      setContactName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setTaxId('')
      setPaymentTerms('')
      setRating(3)
      setIsActive(true)
    }
  }, [open, supplier])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(
      {
        name: name.trim(),
        code: code.trim() || undefined,
        contactName: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        taxId: taxId.trim() || null,
        paymentTerms: paymentTerms.trim() || null,
        rating,
        isActive,
      },
      supplier?.id
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-[var(--gold)]" />
            {isEdit ? 'แก้ไขซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์ใหม่'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `แก้ไขข้อมูล "${supplier?.name}"` : 'กรอกข้อมูลซัพพลายเออร์ / ผู้จำหน่ายวัตถุดิบ'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 px-6 py-5">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--gold)]">🏢 ข้อมูลทั่วไป</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="ชื่อซัพพลายเออร์ *">
                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="เช่น บริษัท น้ำตาลไทย จำกัด" />
                  </Field>
                  <Field label="รหัส">
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ระบบสร้างให้อัตโนมัติหากว่าง" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="ผู้ติดต่อ">
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="คุณ..." />
                  </Field>
                  <Field label="เบอร์โทร">
                    <div className="relative">
                      <Phone className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-7" placeholder="02-xxx-xxxx" />
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="อีเมล">
                    <div className="relative">
                      <Mail className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-7" placeholder="contact@supplier.th" />
                    </div>
                  </Field>
                  <Field label="เลขประจำตัวผู้เสียภาษี">
                    <div className="relative">
                      <Building className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="pl-7" placeholder="X-XXXX-XXXXX-XXX-X" />
                    </div>
                  </Field>
                </div>
                <Field label="ที่อยู่">
                  <div className="relative">
                    <MapPin className="absolute left-2 top-3 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className="pl-7" placeholder="เลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" />
                  </div>
                </Field>
              </section>

              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-[var(--gold)]">💳 เงื่อนไขการชำระเงิน & คะแนน</h3>
                <Field label="เงื่อนไขการชำระ (Payment Terms)">
                  <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="เครดิต 30 วัน / เงินสด / COD" />
                </Field>
                <div className="space-y-2">
                  <Label className="text-xs">คะแนนร้าน (Rating)</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className="p-1"
                        aria-label={`คะแนน ${n} ดาว`}
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            n <= rating
                              ? 'fill-[var(--gold)] text-[var(--gold)]'
                              : 'text-muted-foreground/40'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                  <div>
                    <p className="text-sm">สถานะใช้งาน</p>
                    <p className="text-[10px] text-muted-foreground">ปิดเพื่อระงับการสั่งซื้อจากร้านนี้</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90">
              {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มซัพพลายเออร์'}
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

// Suppress unused-motion warning if motion import is unused
void motion
