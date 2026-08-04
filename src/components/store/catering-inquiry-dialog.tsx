'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Send, Loader2 } from 'lucide-react'
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

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  presetType?: string
}

const EVENT_TYPES = [
  { value: 'BREAK', label: 'จัดเบรค' },
  { value: 'SEMINAR', label: 'งานสัมมนา' },
  { value: 'WEDDING', label: 'งานมงคล / แต่งงาน' },
  { value: 'MERIT', label: 'งานบุญ / ทำบุญ' },
  { value: 'CORPORATE', label: 'งานองค์กร' },
  { value: 'PARTY', label: 'งานเลี้ยงสังสรรค์' },
]

export function CateringInquiryDialog({
  open,
  onOpenChange,
  presetType = 'BREAK',
}: Props) {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    eventType: presetType,
    guestCount: '30',
    eventDate: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.customerName || !form.customerPhone) {
      toast.error('กรุณากรอกชื่อและเบอร์โทร')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/catering/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'ส่งคำขอไม่สำเร็จ')
      setSuccess(data.eventNo)
      toast.success('ส่งคำขอสำเร็จ!', {
        description: `เลขใบคำขอ ${data.eventNo}`,
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
        customerName: '',
        customerPhone: '',
        eventType: presetType,
        guestCount: '30',
        eventDate: '',
        notes: '',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        {success ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"
            >
              <Send className="h-8 w-8" />
            </motion.div>
            <h2 className="text-xl font-bold">ส่งคำขอสำเร็จ!</h2>
            <p className="text-muted-foreground">
              ทีมงานจะติดต่อกลับเพื่อส่งใบเสนอราคาในเร็วๆ นี้
            </p>
            <p className="rounded-md bg-muted px-4 py-2 font-mono font-bold text-gold">
              {success}
            </p>
            <Button onClick={handleClose} className="bg-gold text-gold-foreground">
              ปิด
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CalendarDays className="h-5 w-5 text-gold" />
                ขอใบเสนอราคาจัดเบรค / งาน
              </DialogTitle>
              <DialogDescription>
                กรอกข้อมูล ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ci-name">ชื่อ *</Label>
                  <Input
                    id="ci-name"
                    value={form.customerName}
                    onChange={(e) => set('customerName', e.target.value)}
                    placeholder="คุณสมหญิง"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ci-phone">เบอร์โทร *</Label>
                  <Input
                    id="ci-phone"
                    value={form.customerPhone}
                    onChange={(e) => set('customerPhone', e.target.value)}
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ci-type">ประเภทงาน</Label>
                  <select
                    id="ci-type"
                    value={form.eventType}
                    onChange={(e) => set('eventType', e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ci-guests">จำนวนท่าน</Label>
                  <Input
                    id="ci-guests"
                    type="number"
                    min="1"
                    value={form.guestCount}
                    onChange={(e) => set('guestCount', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ci-date">วันที่จัดงาน</Label>
                <Input
                  id="ci-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => set('eventDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ci-notes">หมายเหตุ</Label>
                <Textarea
                  id="ci-notes"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="เช่น ต้องการขนมประเภท..., งบประมาณ..., สถานที่..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gold text-gold-foreground hover:bg-gold/90"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                ส่งคำขอ
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
