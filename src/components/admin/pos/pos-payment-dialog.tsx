'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle2,
  Banknote,
  QrCode,
  CreditCard,
  Wallet,
  Printer,
  Plus,
  Split,
  X,
  RefreshCw,
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
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatBaht } from '@/lib/thai-date'
import { escapeHtml, openPrintWindow } from '@/lib/print'

export interface PaymentItem {
  productId: string
  name: string
  price: number
  quantity: number
  total: number
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  total: number
  subtotal: number
  discount: number
  shiftId: string
  userId: string
  customerId?: string
  items: PaymentItem[]
  onPaid: (billNo: string) => void
}

type Method = 'CASH' | 'PROMPTPAY' | 'CARD' | 'EWALLET'
type Tab = 'single' | 'split'

export function PosPaymentDialog({
  open,
  onOpenChange,
  total,
  subtotal,
  discount,
  shiftId,
  userId,
  customerId,
  items,
  onPaid,
}: Props) {
  const [tab, setTab] = React.useState<Tab>('single')
  const [method, setMethod] = React.useState<Method>('CASH')
  const [received, setReceived] = React.useState(0)
  const [refCode, setRefCode] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState<{ billNo: string; change: number } | null>(null)

  // Split-payment state
  const [splitPayments, setSplitPayments] = React.useState<Array<{ method: Method; amount: number }>>([
    { method: 'CASH', amount: 0 },
  ])

  // PromptPay QR state
  const [qrData, setQrData] = React.useState<{ qrImageUrl: string; qrPayload: string } | null>(null)
  const [qrLoading, setQrLoading] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setTab('single')
      setMethod('CASH')
      setReceived(0)
      setRefCode('')
      setSuccess(null)
      setSplitPayments([{ method: 'CASH', amount: 0 }])
      setQrData(null)
    }
  }, [open])

  // Fetch QR when PROMPTPAY single-mode is active
  React.useEffect(() => {
    if (!open || tab !== 'single' || method !== 'PROMPTPAY') {
      setQrData(null)
      return
    }
    let cancelled = false
    setQrLoading(true)
    fetch('/api/admin/pos/promptpay-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: total }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d?.qrImageUrl) {
          setQrData({ qrImageUrl: d.qrImageUrl, qrPayload: d.qrPayload })
        } else {
          toast.error('สร้าง QR ไม่สำเร็จ', { description: d?.error })
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('สร้าง QR ไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, tab, method, total])

  const change = Math.max(0, received - total)

  // Split totals
  const splitPaid = splitPayments.reduce((s, p) => s + (p.amount || 0), 0)
  const splitRemaining = Math.max(0, total - splitPaid)

  const canSubmit =
    tab === 'split'
      ? splitRemaining === 0
      : method === 'CASH'
        ? received >= total
        : true // PROMPTPAY/CARD/EWALLET — assume approved by terminal

  const submit = async () => {
    if (tab === 'split') {
      if (splitPaid < total) {
        toast.error(`ยอดรวมยังขาด ${formatBaht(splitRemaining)}`)
        return
      }
      if (splitPaid > total + 0.01) {
        toast.error(`ยอดรวมเกิน ${formatBaht(splitPaid - total)}`)
        return
      }
    } else if (method === 'CASH' && received < total) {
      toast.error('ยอดรับไม่ครบ')
      return
    }
    setSubmitting(true)
    try {
      const payload =
        tab === 'split'
          ? {
              shiftId,
              userId,
              customerId: customerId || undefined,
              items: items.map((it) => ({
                productId: it.productId,
                name: it.name,
                price: it.price,
                quantity: it.quantity,
                total: it.total,
              })),
              subtotal,
              discount,
              total,
              payments: splitPayments
                .filter((p) => p.amount > 0)
                .map((p) => ({ method: p.method, amount: p.amount })),
              receivedAmount: splitPayments
                .filter((p) => p.method === 'CASH')
                .reduce((s, p) => s + p.amount, 0),
              change: 0,
            }
          : {
              shiftId,
              userId,
              customerId: customerId || undefined,
              items: items.map((it) => ({
                productId: it.productId,
                name: it.name,
                price: it.price,
                quantity: it.quantity,
                total: it.total,
              })),
              subtotal,
              discount,
              total,
              paymentMethod: method,
              receivedAmount: method === 'CASH' ? received : total,
              change: method === 'CASH' ? change : 0,
              refCode: refCode || undefined,
            }

      const res = await fetch('/api/admin/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const changeOut = tab === 'split' ? 0 : method === 'CASH' ? change : 0
      setSuccess({ billNo: data.billNo, change: changeOut })
      toast.success(`บันทึกบิล ${data.billNo} แล้ว`)
    } catch (e: unknown) {
      toast.error('เช็คเอาท์ไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  const printReceipt = () => {
    if (!success) return
    const methodLabel =
      tab === 'split'
        ? splitPayments.filter((p) => p.amount > 0).map((p) => `${p.method} ${formatBaht(p.amount)}`).join(' + ')
        : method
    const rows = items
      .map(
        (it) =>
          `<tr><td>${escapeHtml(it.quantity)}×</td><td>${escapeHtml(it.name)}</td><td style="text-align:right">${escapeHtml(formatBaht(it.total))}</td></tr>`
      )
      .join('')
    const bodyHtml = `
      <div class="head"><h1>Khanom House</h1><h2>ใบเสร็จรับเงิน</h2></div>
      <p><b>${escapeHtml(success.billNo)}</b> · ${escapeHtml(new Date().toLocaleString('th-TH'))}</p>
      <table>${rows}</table>
      <div class="tot">รวมทั้งสิ้น ${escapeHtml(formatBaht(total))}</div>
      <p>วิธีชำระ: ${escapeHtml(methodLabel)}</p>
      ${tab === 'single' && method === 'CASH' ? `<p>รับ ${escapeHtml(formatBaht(received))} · ทอน ${escapeHtml(formatBaht(success.change))}</p>` : ''}
      <p style="text-align:center;margin-top:12px;font-size:11px;color:#888">ขอบพระคุณที่อุดหนุน</p>
    `
    openPrintWindow(`ใบเสร็จ ${success.billNo}`, bodyHtml)
  }

  // ---------- Split handlers ----------
  const updateSplit = (idx: number, patch: Partial<{ method: Method; amount: number }>) => {
    setSplitPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  const addSplitRow = () => {
    if (splitPayments.length >= 4) return
    setSplitPayments((prev) => [...prev, { method: 'PROMPTPAY', amount: 0 }])
  }
  const removeSplitRow = (idx: number) => {
    setSplitPayments((prev) => prev.filter((_, i) => i !== idx))
  }
  const fillRemaining = (idx: number) => {
    setSplitPayments((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, amount: Math.max(0, total - prev.reduce((s, x, j) => (j === i ? s : s + (x.amount || 0)), 0)) } : p))
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { onPaid(success?.billNo ?? '') } }}>
      <DialogContent className="max-w-2xl p-0">
        {success ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">ชำระเงินสำเร็จ</h2>
              <p className="text-sm text-muted-foreground">บิลเลขที่ {success.billNo}</p>
            </div>
            <div className="grid w-full max-w-xs grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">ยอดรับ</div>
                <div className="text-lg font-bold tabular-nums">
                  {tab === 'split' ? formatBaht(splitPaid) : formatBaht(tab === 'single' && method === 'CASH' ? received : total)}
                </div>
              </div>
              <div className="rounded-lg border bg-[var(--gold)]/10 p-3">
                <div className="text-xs text-muted-foreground">เงินทอน</div>
                <div className="text-lg font-bold tabular-nums text-[var(--gold)]">
                  {formatBaht(success.change)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={printReceipt}>
                <Printer className="h-4 w-4" /> พิมพ์ใบเสร็จ
              </Button>
              <Button onClick={() => { onOpenChange(false); onPaid(success.billNo) }}>
                <Plus className="h-4 w-4" /> ออเดอร์ใหม่
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="border-b bg-[var(--forest)]/5 px-5 py-3 dark:bg-[var(--gold)]/5">
              <DialogTitle className="flex items-center justify-between">
                <span>ชำระเงิน</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTab('single')}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition',
                      tab === 'single'
                        ? 'bg-[var(--gold)]/15 text-[var(--gold)]'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    ชำระทีเดียว
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('split')}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition',
                      tab === 'split'
                        ? 'bg-[var(--gold)]/15 text-[var(--gold)]'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Split className="h-3 w-3" /> จ่ายแยก
                  </button>
                </div>
              </DialogTitle>
              <DialogDescription>
                ยอดที่ต้องชำระ
                <span className="ml-2 text-2xl font-bold text-[var(--gold)]">{formatBaht(total)}</span>
              </DialogDescription>
            </DialogHeader>

            {tab === 'single' && (
              <>
                {/* Method tabs */}
                <div className="grid grid-cols-4 gap-2 p-4">
                  <MethodButton
                    active={method === 'CASH'}
                    onClick={() => setMethod('CASH')}
                    icon={<Banknote className="h-5 w-5" />}
                    label="เงินสด"
                  />
                  <MethodButton
                    active={method === 'PROMPTPAY'}
                    onClick={() => setMethod('PROMPTPAY')}
                    icon={<QrCode className="h-5 w-5" />}
                    label="พร้อมเพย์"
                  />
                  <MethodButton
                    active={method === 'CARD'}
                    onClick={() => setMethod('CARD')}
                    icon={<CreditCard className="h-5 w-5" />}
                    label="บัตร"
                  />
                  <MethodButton
                    active={method === 'EWALLET'}
                    onClick={() => setMethod('EWALLET')}
                    icon={<Wallet className="h-5 w-5" />}
                    label="E-Wallet"
                  />
                </div>

                <div className="px-4 pb-4">
                  {method === 'CASH' && (
                    <div className="space-y-3">
                      <div>
                        <Label>ยอดรับเงินสด (฿)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={received || ''}
                          onChange={(e) => setReceived(Number(e.target.value) || 0)}
                          className="h-14 text-center text-2xl font-bold tabular-nums"
                          placeholder="0"
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[20, 50, 100, 500, 1000].map((amt) => (
                          <Button
                            key={amt}
                            size="sm"
                            variant="outline"
                            className="h-10"
                            onClick={() => setReceived((r) => r + amt)}
                          >
                            +{formatBaht(amt)}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-10"
                          onClick={() => setReceived(total)}
                        >
                          ยอดพอดี
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-muted/30 p-3 text-center">
                          <div className="text-xs text-muted-foreground">ยอดรับ</div>
                          <div className="text-xl font-bold tabular-nums">{formatBaht(received)}</div>
                        </div>
                        <div className={cn(
                          'rounded-lg border p-3 text-center',
                          change > 0 ? 'border-[var(--gold)]/30 bg-[var(--gold)]/10' : 'bg-muted/30'
                        )}>
                          <div className="text-xs text-muted-foreground">เงินทอน</div>
                          <div className="text-xl font-bold tabular-nums text-[var(--gold)]">
                            {formatBaht(change)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {method === 'PROMPTPAY' && (
                    <div className="space-y-3">
                      <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
                        <div className="flex items-center gap-2 self-start">
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
                            ⏳ รอลูกค้าสแกนชำระ…
                          </Badge>
                          {qrLoading && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <RefreshCw className="h-3 w-3 animate-spin" /> กำลังสร้าง QR…
                            </span>
                          )}
                        </div>
                        {qrData ? (
                          <div className="overflow-hidden rounded-lg border bg-white p-3">
                            <img
                              src={qrData.qrImageUrl}
                              alt="PromptPay QR"
                              className="h-48 w-48"
                            />
                          </div>
                        ) : (
                          <div className="flex h-48 w-48 items-center justify-center rounded-lg border bg-muted/30">
                            <QrCode className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="font-medium">พร้อมเพย์ · Khanom House</p>
                          <p className="text-xs text-muted-foreground">เลขบัญชี: 081-234-5678</p>
                          <p className="mt-1 text-lg font-bold text-[var(--gold)]">{formatBaht(total)}</p>
                        </div>
                      </div>
                      <Input
                        value={refCode}
                        onChange={(e) => setRefCode(e.target.value)}
                        placeholder="รหัสอ้างอิง (ถ้ามี)"
                        className="h-10"
                      />
                    </div>
                  )}

                  {(method === 'CARD' || method === 'EWALLET') && (
                    <div className="space-y-3">
                      <div className="rounded-lg border bg-muted/30 p-4 text-center">
                        <p className="text-sm text-muted-foreground">ยอดที่ต้องชำระ</p>
                        <p className="text-3xl font-bold text-[var(--gold)]">{formatBaht(total)}</p>
                      </div>
                      <div>
                        <Label>{method === 'CARD' ? 'เลขรับชำระ 4 หลักสุดท้าย' : 'เลขอ้างอิง E-Wallet'}</Label>
                        <Input
                          value={refCode}
                          onChange={(e) => setRefCode(e.target.value)}
                          placeholder="เช่น 1234"
                          className="h-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        สมมติว่าเครื่องรับชำระอนุมัติแล้ว — กดยืนยันด้านล่างเพื่อบันทึก
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'split' && (
              <div className="space-y-3 p-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ยอดรวมที่ต้องชำระ</span>
                    <span className="font-bold tabular-nums">{formatBaht(total)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ยอดที่กรอกแล้ว</span>
                    <span className="font-bold tabular-nums text-[var(--gold)]">{formatBaht(splitPaid)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ยอดที่เหลือ</span>
                    <span className={cn(
                      'font-bold tabular-nums',
                      splitRemaining === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {formatBaht(splitRemaining)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {splitPayments.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg border bg-card p-2">
                      <Select
                        value={p.method}
                        onValueChange={(v) => updateSplit(idx, { method: v as Method })}
                      >
                        <SelectTrigger className="h-10 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">💵 เงินสด</SelectItem>
                          <SelectItem value="PROMPTPAY">📱 พร้อมเพย์</SelectItem>
                          <SelectItem value="CARD">💳 บัตร</SelectItem>
                          <SelectItem value="EWALLET">👛 E-Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        value={p.amount || ''}
                        onChange={(e) => updateSplit(idx, { amount: Number(e.target.value) || 0 })}
                        className="h-10 flex-1 text-right text-lg font-bold tabular-nums"
                        placeholder="0"
                      />
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        className="h-10"
                        onClick={() => fillRemaining(idx)}
                      >
                        เต็มยอดที่เหลือ
                      </Button>
                      {splitPayments.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 text-red-500"
                          onClick={() => removeSplitRow(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {splitPayments.length < 4 && (
                  <Button variant="outline" className="w-full gap-1" onClick={addSplitRow}>
                    <Plus className="h-4 w-4" /> เพิ่มช่องทางชำระ
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  เคล็ด: กด "เต็มยอดที่เหลือ" เพื่อกรอกยอดที่ขาดให้พอดี — ใช้สำหรับผสมเงินสด + พร้อมเพย์
                </p>
              </div>
            )}

            <DialogFooter className="border-t bg-card p-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                ยกเลิก
              </Button>
              <Button
                size="lg"
                className="min-w-40"
                onClick={submit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก…</>
                ) : tab === 'split' ? (
                  <>ยืนยัน · จ่ายแยก {formatBaht(splitPaid)}</>
                ) : method === 'CASH' ? (
                  <>ยืนยันรับเงิน · ทอน {formatBaht(change)}</>
                ) : (
                  <>ยืนยันได้รับเงินแล้ว</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MethodButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-16 flex-col items-center justify-center gap-1 rounded-lg border-2 transition-all',
        active
          ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)] dark:text-[var(--gold)]'
          : 'border-border hover:border-[var(--gold)]/50'
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
