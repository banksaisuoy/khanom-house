'use client'

import * as React from 'react'
import { Gift, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type GiftCardFormValues = {
  amount: number
  buyerName?: string
  buyerPhone?: string
  buyerEmail?: string
  recipientName?: string
  recipientEmail?: string
  message?: string
  expiresAt?: string
}

const AMOUNT_PRESETS = [200, 500, 1000, 2000]
const COVER_EMOJIS = ['🎁', '❀', '👑', '🌹', '🎊', '⭐', '🪙', '🎀']

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}

export function GiftCardFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [amount, setAmount] = React.useState<number>(500)
  const [customAmount, setCustomAmount] = React.useState('')
  const [buyerName, setBuyerName] = React.useState('')
  const [buyerPhone, setBuyerPhone] = React.useState('')
  const [buyerEmail, setBuyerEmail] = React.useState('')
  const [recipientName, setRecipientName] = React.useState('')
  const [recipientEmail, setRecipientEmail] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [cover, setCover] = React.useState('🎁')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setAmount(500)
    setCustomAmount('')
    setBuyerName('')
    setBuyerPhone('')
    setBuyerEmail('')
    setRecipientName('')
    setRecipientEmail('')
    setMessage('')
    setExpiresAt('')
    setCover('🎁')
  }, [open])

  const finalAmount = customAmount ? Number(customAmount) : amount

  const submit = async () => {
    if (!finalAmount || finalAmount <= 0) {
      toast.error('กรุณาระบุมูลค่าบัตร (มากกว่า 0)')
      return
    }
    if (finalAmount > 100000) {
      toast.error('มูลค่าสูงสุด 100,000 บาท')
      return
    }
    setSaving(true)
    try {
      const payload: GiftCardFormValues = {
        amount: finalAmount,
        buyerName: buyerName.trim() || undefined,
        buyerPhone: buyerPhone.trim() || undefined,
        buyerEmail: buyerEmail.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        message: message.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }
      const r = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'สร้างบัตรไม่สำเร็จ')
      toast.success(`สร้างบัตร ${j.giftCard.code} มูลค่า ${finalAmount.toLocaleString()} บาท แล้ว`)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{cover}</span>
            สร้างบัตรของขวัญ
          </DialogTitle>
          <DialogDescription>
            สร้างบัตรของขวัญดิจิทัล — ระบบจะสุ่มรหัสให้อัตโนมัติ ผู้รับสามารถนำไปใช้จ่ายได้ทันที
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cover */}
          <div className="space-y-1.5">
            <Label>หน้าปก</Label>
            <div className="flex flex-wrap gap-1.5">
              {COVER_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setCover(e)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg text-xl ring-1 transition',
                    cover === e
                      ? 'bg-[var(--gold)]/20 ring-[var(--gold)]'
                      : 'ring-border hover:bg-muted'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--forest)] to-[var(--forest)]/85 p-5 text-center text-[var(--gold)]">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--gold)]/15 blur-2xl" />
            <p className="relative text-3xl">{cover}</p>
            <p className="relative mt-1 text-2xl font-bold">
              ฿{finalAmount.toLocaleString()}
            </p>
            <p className="relative text-[10px] uppercase tracking-[0.2em] opacity-80">
              Khanom House Gift Card
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>มูลค่าบัตร</Label>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNT_PRESETS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAmount(a)
                    setCustomAmount('')
                  }}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-sm font-semibold transition',
                    !customAmount && amount === a
                      ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  ฿{a.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="relative mt-1">
              <Input
                type="number"
                min={1}
                placeholder="หรือระบุมูลค่าเอง..."
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pl-9"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
            </div>
          </div>

          {/* Buyer */}
          <div className="space-y-1.5">
            <Label>ข้อมูลผู้ซื้อ</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="ชื่อผู้ซื้อ" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              <Input placeholder="เบอร์โทร" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
            </div>
            <Input placeholder="อีเมลผู้ซื้อ" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
          </div>

          {/* Recipient */}
          <div className="space-y-1.5">
            <Label>ข้อมูลผู้รับ</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="ชื่อผู้รับ" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              <Input placeholder="อีเมลผู้รับ" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="gift-msg">ข้อความแนบ (ไม่บังคับ)</Label>
            <Textarea
              id="gift-msg"
              rows={2}
              maxLength={500}
              placeholder="เช่น สุขสันต์วันเกิดนะคะ!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Expires */}
          <div className="space-y-1.5">
            <Label htmlFor="gift-exp">วันหมดอายุ (ไม่บังคับ)</Label>
            <Input
              id="gift-exp"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]"
          >
            {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Gift className="h-4 w-4" />}
            {saving ? 'กำลังสร้าง...' : 'สร้างบัตร'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
