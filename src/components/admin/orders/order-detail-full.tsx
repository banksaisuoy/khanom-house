'use client'

import { toast } from 'sonner'
import {
  Printer,
  ChefHat,
  RotateCcw,
  XCircle,
  RefreshCw,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  CreditCard,
  StickyNote,
  Bike,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import * as React from 'react'
import {
  ORDER_FLOW,
  STATUS_CONFIG,
  CHANNEL_CONFIG,
  PAYMENT_STATUS_CONFIG,
  PAYMENT_METHOD_CONFIG,
  ORDER_TYPE_CONFIG,
  type OrderStatus,
} from '@/lib/order-status'
import { formatBaht, formatThaiDateTime, timeAgoThai, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'
import { escapeHtml, openPrintWindow } from '@/lib/print'
import { OrderStatusFlow } from './order-status-flow'
import type { OrderDetailDTO } from './order-detail-sheet'

export function OrderDetailFull({ order: initialOrder }: { order: OrderDetailDTO }) {
  const [order, setOrder] = React.useState<OrderDetailDTO>(initialOrder)
  const [busy, setBusy] = React.useState(false)
  const [refundOpen, setRefundOpen] = React.useState(false)
  const [cancelOpen, setCancelOpen] = React.useState(false)

  const changeStatus = async (status: OrderStatus) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`เปลี่ยนสถานะเป็น "${STATUS_CONFIG[status].label}" แล้ว`)
      const fresh = await fetch(`/api/admin/orders/${order.id}`).then((r) => r.json())
      setOrder(fresh as OrderDetailDTO)
    } catch (e: unknown) {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const printKitchenTicket = () => {
    const items = order.items
      .map(
        (it) =>
          `<tr><td>${escapeHtml(it.quantity)}×</td><td>${escapeHtml(it.name)}</td><td>${it.notes ? `<br/><small>${escapeHtml(it.notes)}</small>` : ''}</td></tr>`
      )
      .join('')
    const bodyHtml = `
      <h1>Khanom House</h1><h2>Kitchen Ticket</h2>
      <p><b>${escapeHtml(order.orderNo)}</b> · ${escapeHtml(new Date(order.createdAt).toLocaleString('th-TH'))}</p>
      <table>${items}</table>
      <p style="margin-top:12px"><b>ช่องทาง:</b> ${escapeHtml(order.channel)} · <b>ประเภท:</b> ${escapeHtml(order.type)}</p>
      ${order.notes ? `<p><b>หมายเหตุ:</b> ${escapeHtml(order.notes)}</p>` : ''}
    `
    openPrintWindow(`Kitchen Ticket ${order.orderNo}`, bodyHtml)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {order.orderNo}
            <Badge variant="outline" className={cn(STATUS_CONFIG[order.status].cls)}>
              {STATUS_CONFIG[order.status].icon} {STATUS_CONFIG[order.status].label}
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {CHANNEL_CONFIG[order.channel as keyof typeof CHANNEL_CONFIG]?.icon}{' '}
            {CHANNEL_CONFIG[order.channel as keyof typeof CHANNEL_CONFIG]?.label} ·{' '}
            {ORDER_TYPE_CONFIG[order.type as keyof typeof ORDER_TYPE_CONFIG]?.label} · สร้างเมื่อ {formatThaiDateTime(new Date(order.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                เปลี่ยนสถานะ
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>สถานะถัดไป</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ORDER_FLOW.map((s) => (
                <DropdownMenuItem key={s} disabled={s === order.status} onClick={() => changeStatus(s)}>
                  <span className="mr-2">{STATUS_CONFIG[s].icon}</span>
                  {STATUS_CONFIG[s].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCancelOpen(true)} className="text-red-600 focus:text-red-600">
                <XCircle className="mr-2 h-4 w-4" /> ยกเลิก
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRefundOpen(true)} className="text-rose-600 focus:text-rose-600">
                <RotateCcw className="mr-2 h-4 w-4" /> คืนเงิน
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> ใบเสร็จ
          </Button>
          <Button size="sm" variant="outline" onClick={printKitchenTicket}>
            <ChefHat className="h-4 w-4" /> Kitchen Ticket
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">สถานะคำสั่งซื้อ</CardTitle></CardHeader>
        <CardContent>
          <OrderStatusFlow current={order.status} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">รายการสินค้า</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">สินค้า</th>
                  <th className="px-4 py-2 text-right font-medium">จำนวน</th>
                  <th className="px-4 py-2 text-right font-medium">ราคา/หน่วย</th>
                  <th className="px-4 py-2 text-right font-medium">รวม</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{it.name}</div>
                      {it.notes && <div className="text-xs text-muted-foreground">หมายเหตุ: {it.notes}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{toThaiNumerals(it.quantity)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatBaht(it.price)}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatBaht(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t bg-muted/30 p-4">
              <div className="ml-auto max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">รวมก่อนหัก</span><span className="tabular-nums">{formatBaht(order.subtotal)}</span></div>
                {order.discount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>ส่วนลด</span><span className="tabular-nums">-{formatBaht(order.discount)}</span></div>}
                {order.shipping > 0 && <div className="flex justify-between"><span className="text-muted-foreground">ค่าจัดส่ง</span><span className="tabular-nums">{formatBaht(order.shipping)}</span></div>}
                <Separator className="my-1.5" />
                <div className="flex justify-between text-base font-bold"><span>รวมทั้งสิ้น</span><span className="tabular-nums text-[var(--gold)]">{formatBaht(order.total)}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">ลูกค้า</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--gold)]" />
                <span className="font-medium">{order.customerName}</span>
                {order.customerTier && <Badge variant="secondary" className="ml-auto text-[10px]">{order.customerTier}</Badge>}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span>{order.customerPhone}</span></div>
              {order.customerEmail && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /><span className="truncate">{order.customerEmail}</span></div>}
              {order.deliveryAddress && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{order.deliveryAddress}</span></div>}
              {order.wantAt && <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /><span>ต้องการภายใน {formatThaiDateTime(new Date(order.wantAt))}</span></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">การชำระเงิน</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {order.payment ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>{PAYMENT_METHOD_CONFIG[order.payment.method as keyof typeof PAYMENT_METHOD_CONFIG]?.icon} {PAYMENT_METHOD_CONFIG[order.payment.method as keyof typeof PAYMENT_METHOD_CONFIG]?.label}</span>
                    <Badge variant="outline" className={PAYMENT_STATUS_CONFIG[order.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG]?.cls}>
                      {PAYMENT_STATUS_CONFIG[order.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG]?.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-muted-foreground"><span>จำนวน</span><span className="tabular-nums">{formatBaht(order.payment.amount)}</span></div>
                  {order.payment.refCode && <div className="flex justify-between text-muted-foreground"><span>รหัสอ้างอิง</span><span className="font-mono">{order.payment.refCode}</span></div>}
                  <div className="flex justify-between text-muted-foreground"><span>เวลาชำระ</span><span>{formatThaiDateTime(new Date(order.payment.paidAt))}</span></div>
                </div>
              ) : (
                <p className="text-muted-foreground">ยังไม่ได้ชำระเงิน</p>
              )}
            </CardContent>
          </Card>

          {order.delivery && (
            <Card>
              <CardHeader><CardTitle className="text-sm">การจัดส่ง</CardTitle></CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Bike className="h-4 w-4 text-[var(--gold)]" />{order.delivery.riderName ?? 'ยังไม่กำหนด rider'}</span>
                  <Badge variant="outline">{order.delivery.status}</Badge>
                </div>
                {order.delivery.eta && <div className="text-muted-foreground">ETA: ~{toThaiNumerals(order.delivery.eta)} นาที</div>}
              </CardContent>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">หมายเหตุ</CardTitle></CardHeader>
              <CardContent className="flex items-start gap-2 text-sm">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
                <span>{order.notes}</span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">ไทม์ไลน์</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {order.timeline.map((t, i) => {
              const cfg = STATUS_CONFIG[t.status as OrderStatus]
              return (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-base', cfg?.cls ?? 'bg-muted')}>
                    {cfg?.icon ?? '•'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{cfg?.label ?? t.status}</div>
                    <div className="text-xs text-muted-foreground">{formatThaiDateTime(new Date(t.at))}</div>
                  </div>
                  <div className="text-xs text-muted-foreground" suppressHydrationWarning>{timeAgoThai(new Date(t.at))}</div>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการคืนเงิน?</AlertDialogTitle>
            <AlertDialogDescription>สถานะจะถูกเปลี่ยนเป็น “คืนเงิน” — การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setRefundOpen(false); changeStatus('REFUNDED') }} className="bg-rose-600 text-white hover:bg-rose-700">ยืนยันคืนเงิน</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิก?</AlertDialogTitle>
            <AlertDialogDescription>ออเดอร์นี้จะถูกยกเลิก</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCancelOpen(false); changeStatus('CANCELLED') }} className="bg-red-600 text-white hover:bg-red-700">ยืนยันยกเลิก</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
