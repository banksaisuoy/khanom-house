'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, ShieldCheck, Loader2, CheckCircle2, User, LogOut, Crown } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator,
} from '@/components/ui/input-otp'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  tier: string
  points: number
}

type Step = 'phone' | 'otp' | 'register' | 'success'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onLoggedIn?: (c: Customer) => void
}

export function OtpLoginDialog({ open, onOpenChange, onLoggedIn }: Props) {
  const [step, setStep] = React.useState<Step>('phone')
  const [phone, setPhone] = React.useState('')
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [demoCode, setDemoCode] = React.useState<string | null>(null)
  const [resendTimer, setResendTimer] = React.useState(0)
  const [customer, setCustomer] = React.useState<Customer | null>(null)

  // Load existing customer session on open
  React.useEffect(() => {
    if (open) {
      setStep('phone')
      setPhone('')
      setName('')
      setCode('')
      setDemoCode(null)
      setResendTimer(0)
      // Try fetch existing session
      fetch('/api/customer/me', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.customer) {
            setCustomer(j.customer)
            setStep('success')
          } else {
            setCustomer(null)
          }
        })
        .catch(() => {
          // ignore
        })
    }
  }, [open])

  // Resend timer countdown
  React.useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const sendOtp = async (purpose: 'LOGIN' | 'REGISTER') => {
    // Validate Thai mobile phone
    const normalized = phone.replace(/[^\d]/g, '')
    if (!/^0[689]\d{8}$/.test(normalized)) {
      toast.error('เบอร์โทรไม่ถูกต้อง (ต้องเป็นเบอร์มือถือไทย 10 หลัก)')
      return
    }
    setSending(true)
    try {
      const r = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, purpose }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'ส่งรหัสไม่สำเร็จ')
      setDemoCode(j.code ?? null)
      setStep('otp')
      setResendTimer(60)
      if (j.code) {
        toast.success(`ส่งรหัส OTP แล้ว (demo: ${j.code})`)
      } else {
        toast.success('ส่งรหัส OTP ไปยังเบอร์โทรศัพท์ของคุณแล้ว')
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const verify = async (purpose: 'LOGIN' | 'REGISTER') => {
    if (code.length !== 6) {
      toast.error('กรุณากรอกรหัส OTP 6 หลักให้ครบ')
      return
    }
    setVerifying(true)
    try {
      const body: Record<string, unknown> = {
        phone: phone.replace(/[^\d]/g, ''),
        code,
        purpose,
      }
      if (purpose === 'REGISTER') body.name = name.trim()
      const r = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'ยืนยันรหัสไม่สำเร็จ')
      setCustomer(j.customer)
      setStep('success')
      if (j.isNewCustomer) {
        toast.success(`ยินดีต้อนรับสมาชิกใหม่ "${j.customer.name}"!`)
      } else {
        toast.success(`เข้าสู่ระบบสำเร็จ — สวัสดี ${j.customer.name}`)
      }
      onLoggedIn?.(j.customer)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setVerifying(false)
    }
  }

  const logout = async () => {
    try {
      // Clear the customer session cookie by setting max-age 0
      document.cookie = 'kh_customer_session=; path=/; max-age=0'
      setCustomer(null)
      setStep('phone')
      toast.success('ออกจากระบบแล้ว')
    } catch {
      // ignore
    }
  }

  const tierLabel: Record<string, string> = {
    BRONZE: 'บรอนซ์',
    SILVER: 'ซิลเวอร์',
    GOLD: 'โกลด์',
    VIP: 'ไอพี',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold" />
            {customer ? 'บัญชีสมาชิก' : 'เข้าสู่ระบบสมาชิก'}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? 'เข้าสู่ระบบสำเร็จแล้ว — สะสมแต้มและรับสิทธิพิเศษ'
              : 'เข้าสู่ระบบด้วยเบอร์โทร + OTP — รับสิทธิสมาชิกและสะสมแต้มทุกยอดซื้อ'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'success' && customer ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="rounded-xl bg-gradient-to-br from-[var(--forest)] to-[var(--forest)]/85 p-5 text-center text-[var(--gold)]">
                <Crown className="mx-auto h-7 w-7" />
                <p className="mt-1 text-lg font-bold">{customer.name}</p>
                <p className="text-xs opacity-80">{customer.phone}</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Badge className="bg-[var(--gold)]/20 text-[var(--gold)] ring-1 ring-[var(--gold)]/40">
                    {tierLabel[customer.tier] ?? customer.tier}
                  </Badge>
                  <Badge className="bg-[var(--gold)]/20 text-[var(--gold)] ring-1 ring-[var(--gold)]/40">
                    {customer.points} แต้ม
                  </Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full gap-1.5" onClick={logout}>
                <LogOut className="h-4 w-4" /> ออกจากระบบ
              </Button>
            </motion.div>
          ) : step === 'phone' ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="otp-phone">เบอร์โทรศัพท์มือถือ</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="otp-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendOtp('LOGIN')
                    }}
                    placeholder="08X-XXX-XXXX"
                    className="pl-9"
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  กรอกเบอร์มือถือ 10 หลัก — เราจะส่งรหัส OTP ไปยังเบอร์นี้
                </p>
              </div>
            </motion.div>
          ) : step === 'register' ? (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="otp-name">ชื่อ-นามสกุล</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="otp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น คุณสมหญิง"
                    className="pl-9"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                เบอร์ {phone} ยังไม่เป็นสมาชิก — ระบุชื่อเพื่อสมัครฟรีและรับสิทธิทันที
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label>รหัส OTP (6 หลัก)</Label>
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(v) => setCode(v)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {demoCode && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    demo mode · รหัสคือ <span className="font-mono font-bold text-gold">{demoCode}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← เปลี่ยนเบอร์
                </button>
                <button
                  type="button"
                  disabled={resendTimer > 0}
                  onClick={() => sendOtp('LOGIN')}
                  className={cn(
                    'font-medium',
                    resendTimer > 0 ? 'text-muted-foreground' : 'text-gold hover:underline'
                  )}
                >
                  {resendTimer > 0 ? `ขอรหัสใหม่ใน ${resendTimer}s` : 'ขอรหัสใหม่'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="gap-2">
          {step === 'phone' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('register')}
                className="gap-1.5"
              >
                <User className="h-4 w-4" /> สมัครสมาชิกใหม่
              </Button>
              <Button
                onClick={() => sendOtp('LOGIN')}
                disabled={sending || phone.length < 10}
                className="gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {sending ? 'กำลังส่ง...' : 'ขอรหัส OTP'}
              </Button>
            </>
          )}
          {step === 'register' && (
            <>
              <Button variant="outline" onClick={() => setStep('phone')}>ย้อนกลับ</Button>
              <Button
                onClick={() => sendOtp('REGISTER')}
                disabled={sending || !name.trim() || phone.length < 10}
                className="gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                {sending ? 'กำลังส่ง...' : 'สมัครและขอรหัส'}
              </Button>
            </>
          )}
          {step === 'otp' && (
            <Button
              onClick={() => verify('LOGIN')}
              disabled={verifying || code.length !== 6}
              className="gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {verifying ? 'กำลังยืนยัน...' : 'ยืนยันรหัส'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
