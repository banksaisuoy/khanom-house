'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  RefreshCw,
  Printer,
  ChefHat,
  RotateCcw,
  XCircle,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  CreditCard,
  StickyNote,
  Bike,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ORDER_FLOW,
  STATUS_CONFIG,
  CHANNEL_CONFIG,
  PAYMENT_STATUS_CONFIG,
  PAYMENT_METHOD_CONFIG,
  ORDER_TYPE_CONFIG,
  type OrderStatus,
} from '@/lib/order-status'
import {
  formatBaht,
  formatThaiDateTime,
  timeAgoThai,
  toThaiNumerals,
} from '@/lib/thai-date'
import { cn } from '@/lib/utils'
import { escapeHtml, openPrintWindow } from '@/lib/print'
import { OrderStatusFlow } from './order-status-flow'

export interface OrderDetailDTO {
  id: string
  orderNo: string
  channel: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customerId: string | null
  customerTier: string | null
  customerPoints: number | null
  type: string
  status: OrderStatus
  paymentStatus: string
  paymentMethod: string | null
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  deposit: number
  notes: string | null
  deliveryAddress: string | null
  wantAt: string | null
  createdAt: string
  updatedAt: string
  items: {
    id: string
    productId: string
    name: string
    price: number
    quantity: number
    total: number
    notes: string | null
  }[]
  payment: {
    id: string
    method: string
    amount: number
    refCode: string | null
    status: string
    paidAt: string
  } | null
  delivery: {
    id: string
    status: string
    riderName: string | null
    pickupAt: string | null
    deliveredAt: string | null
    eta: number | null
    notes: string | null
  } | null
  timeline: { status: string; at: string; label: string }[]
}

interface Props {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMutated?: () => void
}

export function OrderDetailSheet({ orderId, open, onOpenChange, onMutated }: Props) {
  const [detail, setDetail] = React.useState<OrderDetailDTO | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [refundOpen, setRefundOpen] = React.useState(false)
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [statusBusy, setStatusBusy] = React.useState(false)

  React.useEffect(() => {
    if (!orderId || !open) {
      setDetail(null)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    fetch(`/api/admin/orders/${orderId}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setDetail(d as OrderDetailDTO)
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') {
          toast.error('ดึงรายละเอียดไม่สำเร็จ', { description: e.message })
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [orderId, open])

  const changeStatus = async (status: OrderStatus) => {
    if (!detail) return
    setStatusBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${detail.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`เปลี่ยนสถานะเป็น "${STATUS_CONFIG[status].label}" แล้ว`)
      // refetch detail
      const fresh = await fetch(`/api/admin/orders/${detail.id}`).then((r) => r.json())
      setDetail(fresh as OrderDetailDTO)
      onMutated?.()
    } catch (e: unknown) {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ', { description: (e as Error).message })
    } finally {
      setStatusBusy(false)
    }
  }

  const handleRefund = async () => {
    setRefundOpen(false)
    await changeStatus('REFUNDED')
  }
  const handleCancel = async () => {
    setCancelOpen(false)
    await changeStatus('CANCELLED')
  }

  const printReceipt = () => {
    window.print()
  }
  const printKitchenTicket = () => {
    if (!detail) return
    const items = detail.items
      .map(
        (it) =>
          `<tr><td>${escapeHtml(it.quantity)}×</td><td>${escapeHtml(it.name)}</td><td>${it.notes ? `<br/><small>${escapeHtml(it.notes)}</small>` : ''}</td></tr>`
      )
      .join('')
    const bodyHtml = `
      <div class="head"><div><h1>Khanom House</h1><h2>Kitchen Ticket</h2></div>
      <div style="text-align:right"><b>${escapeHtml(detail.orderNo)}</b><br/>${escapeHtml(new Date(detail.createdAt).toLocaleString('th-TH'))}</div></div>
      <table>${items}</table>
      <p style="margin-top:12px"><b>ช่องทาง:</b> ${escapeHtml(detail.channel)} &nbsp; <b>ประเภท:</b> ${escapeHtml(detail.type)}</p>
      ${detail.notes ? `<p><b>หมายเหตุ:</b> ${escapeHtml(detail.notes)}</p>` : ''}
    `
    openPrintWindow(`Kitchen Ticket ${detail.orderNo}`, bodyHtml)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 sm:max-w-lg md:max-w-xl"
        >
          <SheetHeader className="border-b bg-[var(--forest)]/5 px-5 py-4 dark:bg-[var(--gold)]/5">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div>
                <SheetTitle className="text-xl">
                  {detail ? detail.orderNo : loading ? <Skeleton className="h-6 w-32" /> : '—'}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {detail ? (
                    <>
                      {CHANNEL_CONFIG[detail.channel as keyof typeof CHANNEL_CONFIG]?.icon}{' '}
                      {CHANNEL_CONFIG[detail.channel as keyof typeof CHANNEL_CONFIG]?.label} ·{' '}
                      {ORDER_TYPE_CONFIG[detail.type as keyof typeof ORDER_TYPE_CONFIG]?.label}
                    </>
                  ) : (
                    'กำลังโหลด…'
                  )}
                </SheetDescription>
              </div>
              {detail && (
                <Badge
                  variant="outline"
                  className={cn('shrink-0', STATUS_CONFIG[detail.status].cls)}
                >
                  {STATUS_CONFIG[detail.status].icon} {STATUS_CONFIG[detail.status].label}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {loading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail ? (
            <ScrollArea className="flex-1">
              <div className="space-y-5 p-5">
                {/* Status flow */}
                <div className="rounded-xl border bg-card p-4">
                  <OrderStatusFlow current={detail.status} />
                </div>

                {/* Customer info */}
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">ข้อมูลลูกค้า</h3>
                  <div className="space-y-1.5 rounded-lg border bg-card p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[var(--gold)]" />
                      <span className="font-medium">{detail.customerName}</span>
                      {detail.customerTier && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {detail.customerTier}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{detail.customerPhone}</span>
                    </div>
                    {detail.customerEmail && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{detail.customerEmail}</span>
                      </div>
                    )}
                    {detail.deliveryAddress && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{detail.deliveryAddress}</span>
                      </div>
                    )}
                    {detail.wantAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>ต้องการภายใน {formatThaiDateTime(new Date(detail.wantAt))}</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Items */}
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    รายการสินค้า ({toThaiNumerals(detail.items.length)})
                  </h3>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">สินค้า</th>
                          <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                          <th className="px-3 py-2 text-right font-medium">ราคา</th>
                          <th className="px-3 py-2 text-right font-medium">รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.map((it) => (
                          <tr key={it.id} className="border-t">
                            <td className="px-3 py-2">
                              <div className="font-medium">{it.name}</div>
                              {it.notes && (
                                <div className="text-xs text-muted-foreground">หมายเหตุ: {it.notes}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{toThaiNumerals(it.quantity)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatBaht(it.price)}</td>
                            <td className="px-3 py-2 text-right font-medium tabular-nums">{formatBaht(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Totals */}
                <section className="rounded-lg border bg-card p-4">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">รวมก่อนหัก</span>
                      <span className="tabular-nums">{formatBaht(detail.subtotal)}</span>
                    </div>
                    {detail.discount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>ส่วนลด</span>
                        <span className="tabular-nums">-{formatBaht(detail.discount)}</span>
                      </div>
                    )}
                    {detail.shipping > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ค่าจัดส่ง</span>
                        <span className="tabular-nums">{formatBaht(detail.shipping)}</span>
                      </div>
                    )}
                    <Separator className="my-1.5" />
                    <div className="flex justify-between text-base font-bold">
                      <span>รวมทั้งสิ้น</span>
                      <span className="tabular-nums text-[var(--gold)]">{formatBaht(detail.total)}</span>
                    </div>
                  </div>
                </section>

                {/* Payment */}
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">การชำระเงิน</h3>
                  <div className="rounded-lg border bg-card p-3 text-sm">
                    {detail.payment ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-[var(--gold)]" />
                            <span className="font-medium">
                              {PAYMENT_METHOD_CONFIG[detail.payment.method as keyof typeof PAYMENT_METHOD_CONFIG]?.icon}{' '}
                              {PAYMENT_METHOD_CONFIG[detail.payment.method as keyof typeof PAYMENT_METHOD_CONFIG]?.label}
                            </span>
                          </div>
                          <Badge variant="outline" className={PAYMENT_STATUS_CONFIG[detail.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG]?.cls}>
                            {PAYMENT_STATUS_CONFIG[detail.paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG]?.label}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          <div className="flex justify-between">
                            <span>จำนวน</span>
                            <span className="tabular-nums">{formatBaht(detail.payment.amount)}</span>
                          </div>
                          {detail.payment.refCode && (
                            <div className="flex justify-between">
                              <span>รหัสอ้างอิง</span>
                              <span className="font-mono">{detail.payment.refCode}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>เวลาชำระ</span>
                            <span>{formatThaiDateTime(new Date(detail.payment.paidAt))}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">ยังไม่ได้ชำระเงิน</p>
                    )}
                  </div>
                </section>

                {/* Delivery */}
                {detail.delivery && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">การจัดส่ง</h3>
                    <div className="rounded-lg border bg-card p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-[var(--gold)]" />
                          <span className="font-medium">{detail.delivery.riderName ?? 'ยังไม่กำหนด rider'}</span>
                        </div>
                        <Badge variant="outline">{detail.delivery.status}</Badge>
                      </div>
                      {detail.delivery.eta && (
                        <p className="mt-2 text-muted-foreground">
                          ETA: ประมาณ {toThaiNumerals(detail.delivery.eta)} นาที
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Notes */}
                {detail.notes && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">หมายเหตุ</h3>
                    <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-sm">
                      <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
                      <span>{detail.notes}</span>
                    </div>
                  </section>
                )}

                {/* Timeline */}
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">ไทม์ไลน์</h3>
                  <ol className="space-y-2">
                    {detail.timeline.map((t, i) => {
                      const cfg = STATUS_CONFIG[t.status as OrderStatus]
                      return (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs', cfg?.cls ?? 'bg-muted')}>
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
                </section>

                {/* Quick info footer */}
                <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>สร้างเมื่อ</span>
                    <span>{formatThaiDateTime(new Date(detail.createdAt))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>อัปเดตล่าสุด</span>
                    <span>{formatThaiDateTime(new Date(detail.updatedAt))}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              ไม่พบข้อมูล
            </div>
          )}

          {/* Action footer */}
          {detail && (
            <div className="flex flex-wrap items-center gap-2 border-t bg-card p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={statusBusy}>
                    {statusBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    เปลี่ยนสถานะ
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel>สถานะถัดไป</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ORDER_FLOW.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      disabled={s === detail.status}
                      onClick={() => changeStatus(s)}
                    >
                      <span className="mr-2">{STATUS_CONFIG[s].icon}</span>
                      {STATUS_CONFIG[s].label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCancelOpen(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> ยกเลิกออเดอร์
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setRefundOpen(true)}
                    className="text-rose-600 focus:text-rose-600"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> คืนเงิน
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" variant="outline" onClick={printReceipt}>
                <Printer className="h-4 w-4" /> ใบเสร็จ
              </Button>
              <Button size="sm" variant="outline" onClick={printKitchenTicket}>
                <ChefHat className="h-4 w-4" /> Kitchen Ticket
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการคืนเงิน?</AlertDialogTitle>
            <AlertDialogDescription>
              สถานะจะถูกเปลี่ยนเป็น “คืนเงิน” และสถานะการชำระเงินจะเป็น REFUNDED — การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              ยืนยันคืนเงิน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกออเดอร์?</AlertDialogTitle>
            <AlertDialogDescription>
              ออเดอร์นี้จะถูกยกเลิกและจะไม่แสดงในคิวดำเนินการอีก
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
