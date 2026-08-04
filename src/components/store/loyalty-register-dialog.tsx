'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Loader2, Sparkles } from 'lucide-react'
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

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function LoyaltyRegisterDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{
    memberCode: string
    name: string
  } | null>(null)

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      toast.error('กรุณากรอกชื่อและเบอร์โทร')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'สมัครไม่สำเร็จ')
      }
      setSuccess({ memberCode: data.memberCode, name: data.customer.name })
      toast.success(`ยินดีต้อนรับคุณ ${data.customer.name}!`, {
        description: `รหัสสมาชิก ${data.memberCode}`,
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
      setForm({ name: '', phone: '', email: '' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="grid h-16 w-16 place-items-center rounded-full bg-gold text-gold-foreground"
            >
              <Crown className="h-8 w-8" />
            </motion.div>
            <h2 className="text-xl font-bold">ยินดีต้อนรับสมาชิกใหม่!</h2>
            <p className="text-muted-foreground">คุณ {success.name}</p>
            <p className="rounded-md bg-muted px-4 py-2 font-mono font-bold text-gold">
              {success.memberCode}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              เริ่มต้นเป็นสมาชิกระดับ BRONZE • สะสมแต้ม 1 บาท = 1 แต้ม
            </p>
            <Button onClick={handleClose} className="bg-gold text-gold-foreground">
              เริ่มช้อปเลย
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-gold" />
                สมัครสมาชิก Khanom House Club
              </DialogTitle>
              <DialogDescription>
                สะสมแต้มทุกยอดซื้อ รับสิทธิพิเศษมากมาย
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="lr-name">ชื่อ-นามสกุล *</Label>
                <Input
                  id="lr-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="คุณสมหญิง ใจดี"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lr-phone">เบอร์โทร *</Label>
                <Input
                  id="lr-phone"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="08x-xxx-xxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lr-email">อีเมล (ไม่บังคับ)</Label>
                <Input
                  id="lr-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@email.com"
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
                  <Crown className="h-4 w-4 mr-1" />
                )}
                สมัครสมาชิก
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
