'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Wallet, Clock, User, Loader2, Lock, AlertCircle, Delete, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatBaht, formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

export interface ShiftInfo {
  id: string
  shiftNo: string
  openedAt: string
  openingCash: number
  cashIn: number
  cashOut: number
  totalSales: number
  cashSales: number
  cardSales: number
  qrSales: number
  user: { id: string; name: string; email: string; role: string }
  billsCount: number
}

export interface ShiftScreenProps {
  mode: 'open' | 'close'
  shift?: ShiftInfo | null
  cashier?: { id: string; name: string; email: string } | null
  branch?: { id: string; name: string; code: string }
  onOpened?: () => void
  onClosed?: () => void
}

// ============================================================
// PIN Pad — used inside ShiftOpenCard for quick cashier login
// ============================================================
function PinPad({
  onSubmit,
  submitting,
}: {
  onSubmit: (pin: string) => Promise<void>
  submitting: boolean
}) {
  const [pin, setPin] = React.useState('')
  const router = useRouter()

  const press = (digit: string) => {
    setPin((p) => (p.length >= 4 ? p : p + digit))
  }
  const backspace = () => setPin((p) => p.slice(0, -1))
  const clear = () => setPin('')

  // Auto-submit when 4 digits entered
  React.useEffect(() => {
    if (pin.length === 4) {
      void onSubmit(pin)
    }
  }, [pin, onSubmit])

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="mb-3 flex items-center justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-4 w-4 rounded-full border-2 transition-all',
              i < pin.length
                ? 'border-[var(--gold)] bg-[var(--gold)]'
                : 'border-muted-foreground/30 bg-transparent'
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={submitting}
            onClick={() => press(d)}
            className="h-14 rounded-lg border bg-card text-2xl font-bold transition-all hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 active:scale-95 disabled:opacity-50"
          >
            {toThaiNumerals(Number(d))}
          </button>
        ))}
        <button
          type="button"
          disabled={submitting}
          onClick={clear}
          className="h-14 rounded-lg border bg-card text-xs font-medium text-muted-foreground transition-all hover:bg-muted/30 disabled:opacity-50"
        >
          ล้าง
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => press('0')}
          className="h-14 rounded-lg border bg-card text-2xl font-bold transition-all hover:border-[var(--gold)] hover:bg-[var(--gold)]/5 active:scale-95 disabled:opacity-50"
        >
          ๐
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={backspace}
          className="h-14 rounded-lg border bg-card transition-all hover:bg-muted/30 active:scale-95 disabled:opacity-50"
        >
          <Delete className="mx-auto h-5 w-5 text-muted-foreground" />
        </button>
      </div>
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        PIN = เลข 4 หลักสุดท้ายของเบอร์โทรพนักงาน
      </p>
      <button
        type="button"
        onClick={() => router.push('/login')}
        className="mt-2 w-full text-center text-[11px] text-[var(--gold)] hover:underline"
      >
        เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน →
      </button>
    </div>
  )
}

// ============================================================
// Open shift card
// ============================================================
export function ShiftOpenCard({
  cashier,
  branch,
  onOpened,
}: Omit<ShiftScreenProps, 'mode' | 'shift'>) {
  const [openingCash, setOpeningCash] = React.useState(2000)
  const [submitting, setSubmitting] = React.useState(false)
  const [tab, setTab] = React.useState<'pin' | 'cash'>('pin')
  const [authedUser, setAuthedUser] = React.useState<{ id: string; name: string; role: string } | null>(null)
  const [pinSubmitting, setPinSubmitting] = React.useState(false)

  const handlePin = async (pin: string) => {
    setPinSubmitting(true)
    try {
      const res = await fetch('/api/admin/pos/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, branchId: branch?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'PIN ไม่ถูกต้อง')
      toast.success(`เข้าสู่ระบบในชื่อ ${data.user.name}`)
      setAuthedUser({ id: data.user.id, name: data.user.name, role: data.user.role })
      setTab('cash')
    } catch (e: unknown) {
      toast.error('เข้าสู่ระบบด้วย PIN ไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setPinSubmitting(false)
    }
  }

  const submit = async () => {
    if (openingCash < 0) {
      toast.error('เงินทุนต้องไม่ติดลบ')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/pos/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingCash, userId: authedUser?.id ?? cashier?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`เปิดกะ ${data.shiftNo} แล้ว`)
      onOpened?.()
    } catch (e: unknown) {
      toast.error('เปิดกะไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[var(--forest)] via-[var(--gold)] to-[var(--forest)]" />
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
            <Wallet className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">เปิดกะขาย</CardTitle>
          <p className="text-sm text-muted-foreground">
            {authedUser ? `ยินดีต้อนรับ ${authedUser.name}` : 'เข้าสู่ระบบเพื่อเริ่มขาย'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--gold)]" />
              <span>{branch?.name ?? 'สาขา'}</span>
            </div>
            <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>

          {!authedUser ? (
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'pin' | 'cash')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pin" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> PIN
                </TabsTrigger>
                <TabsTrigger value="cash">ข้าม (demo)</TabsTrigger>
              </TabsList>
              <TabsContent value="pin" className="pt-3">
                <PinPad onSubmit={handlePin} submitting={pinSubmitting} />
              </TabsContent>
              <TabsContent value="cash" className="pt-3 space-y-3">
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--gold)]" />
                    <span>{cashier?.name ?? 'พนักงานคิดเงิน'}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">CASHIER</Badge>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  โหมดสาธิต — ใช้พนักงาน CASHIER เริ่มกะทันทีโดยไม่ต้อง PIN
                </p>
                <Button className="w-full" onClick={() => setAuthedUser({ id: cashier?.id ?? '', name: cashier?.name ?? 'Cashier', role: 'CASHIER' })}>
                  เข้าสู่ระบบในชื่อ {cashier?.name ?? 'Cashier'}
                </Button>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border bg-emerald-500/5 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{authedUser.name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">{authedUser.role}</Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">เงินทุนตั้งต้น (฿)</Label>
                <Input
                  type="number"
                  min={0}
                  step={20}
                  value={openingCash}
                  onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
                  className="h-14 text-center text-2xl font-bold tabular-nums"
                />
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setOpeningCash(amt)}
                    >
                      {formatBaht(amt)}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                className="h-14 w-full text-base font-bold"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> กำลังเปิดกะ…</>
                ) : (
                  <>เปิดกะขาย · {formatBaht(openingCash)}</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Close shift dialog
// ============================================================
export function CloseShiftDialog({
  open,
  onOpenChange,
  shift,
  onClosed,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  shift: ShiftInfo | null
  onClosed?: () => void
}) {
  const [countedCash, setCountedCash] = React.useState(0)
  const [notes, setNotes] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<{ expectedCash: number; countedCash: number; difference: number; totalSales: number } | null>(null)

  React.useEffect(() => {
    if (open && shift) {
      // Prefill countedCash with expected
      const expected = shift.openingCash + shift.cashSales + shift.cashIn - shift.cashOut
      setCountedCash(expected)
    }
    if (!open) setResult(null)
  }, [open, shift])

  if (!shift) return null
  const expectedCash = shift.openingCash + shift.cashSales + shift.cashIn - shift.cashOut
  const difference = countedCash - expectedCash

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/pos/shift/${shift.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countedCash, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({
        expectedCash: data.expectedCash,
        countedCash: data.countedCash,
        difference: data.difference,
        totalSales: data.totalSales,
      })
      toast.success(`ปิดกะ ${shift.shiftNo} แล้ว`)
    } catch (e: unknown) {
      toast.error('ปิดกะไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v && result) onClosed?.() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5 text-[var(--gold)]" /> ปิดกะ {shift.shiftNo}
          </DialogTitle>
          <DialogDescription>
            เปิดเมื่อ {formatThaiDateTime(new Date(shift.openedAt))}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
              <p className="text-xs text-muted-foreground">ปิดกะสำเร็จ</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {result.difference >= 0 ? '+' : ''}{formatBaht(result.difference)}
              </p>
              <p className="text-[11px] text-muted-foreground">ส่วนต่าง</p>
            </div>
            <div className="space-y-1.5 text-sm">
              <Row label="ยอดขายรวม" value={formatBaht(result.totalSales)} />
              <Row label="เงินสดคาดไว้" value={formatBaht(result.expectedCash)} />
              <Row label="เงินสดนับได้" value={formatBaht(result.countedCash)} />
            </div>
            <Button className="w-full" size="lg" onClick={() => { onOpenChange(false); onClosed?.() }}>
              เสร็จสิ้น
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <Row label="เปิดด้วยเงินทุน" value={formatBaht(shift.openingCash)} />
              <Row label="ขายเงินสด" value={formatBaht(shift.cashSales)} />
              <Row label="รับเข้าลิ้นชัก" value={formatBaht(shift.cashIn)} tone="emerald" />
              <Row label="จ่ายออกลิ้นชัก" value={formatBaht(shift.cashOut)} tone="red" />
              <Separator className="my-1" />
              <Row label="เงินสดคาดไว้" value={formatBaht(expectedCash)} strong />
              <Row label="ยอดขายรวมทั้งหมด" value={formatBaht(shift.totalSales)} />
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="rounded bg-card p-2">
                  <div className="text-muted-foreground">บัตร</div>
                  <div className="font-bold tabular-nums">{formatBaht(shift.cardSales)}</div>
                </div>
                <div className="rounded bg-card p-2">
                  <div className="text-muted-foreground">QR/E-Wallet</div>
                  <div className="font-bold tabular-nums">{formatBaht(shift.qrSales)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>เงินสดที่นับได้จริง (฿)</Label>
              <Input
                type="number"
                min={0}
                value={countedCash}
                onChange={(e) => setCountedCash(Number(e.target.value) || 0)}
                className="h-12 text-center text-xl font-bold tabular-nums"
              />
            </div>

            <div className={cn(
              'flex items-center justify-between rounded-lg border p-3 text-sm font-medium',
              difference === 0
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                : difference > 0
                  ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                  : 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400'
            )}>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {difference === 0 ? 'ตรงยอด — สมบูรณ์' : difference > 0 ? 'เกิน (เผื่อ)' : 'ขาด'}
              </span>
              <span className="tabular-nums">
                {difference >= 0 ? '+' : ''}{formatBaht(difference)}
              </span>
            </div>

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="หมายเหตุ (ถ้ามี)"
              className="min-h-16"
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                ยกเลิก
              </Button>
              <Button onClick={submit} disabled={submitting} size="lg">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                ยืนยันปิดกะ
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'emerald' | 'red'
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        'tabular-nums',
        strong && 'font-bold',
        tone === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
        tone === 'red' && 'text-red-600 dark:text-red-400'
      )}>
        {value}
      </span>
    </div>
  )
}
