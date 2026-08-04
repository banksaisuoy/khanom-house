'use client'

import * as React from 'react'
import {
  CalendarDays, MapPin, Phone, Mail, Users, Wallet, Truck, User, StickyNote,
  CheckCircle2, Circle, Printer, FileText, Pencil, MoreVertical, ExternalLink,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { formatBaht, formatThaiDateTime, toThaiNumerals, formatThaiDate } from '@/lib/thai-date'
import { eventTypeConfig, eventStatusConfig, countdownLabel, googleMapsUrl, normalizeChecklist, type ChecklistItem } from '@/lib/admin-ui'
import { cn } from '@/lib/utils'
import type { EventFormValues } from './event-form-dialog'

export type CateringEventDetail = {
  id: string
  eventNo: string
  title: string
  type: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  guestCount: number
  eventDate: string
  setupTime: string | null
  location: string
  mapUrl: string | null
  theme: string | null
  packagingType: string | null
  budget: number
  totalQuote: number
  deposit: number
  status: string
  assignedUserId: string | null
  assignedUser: { id: string; name: string; role: string } | null
  vehicle: string | null
  items: { productId?: string; name: string; qty: number; price: number }[]
  checklist: ChecklistItem[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

const STATUSES = [
  { value: 'DRAFT', label: 'ร่าง' },
  { value: 'QUOTED', label: 'ส่งใบเสนอราคา' },
  { value: 'CONFIRMED', label: 'ยืนยันแล้ว' },
  { value: 'PREPARING', label: 'กำลังเตรียม' },
  { value: 'DELIVERED', label: 'จัดส่งแล้ว' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

function InfoRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

export function EventDetailSheet({
  event, open, onOpenChange, onEdit, onChanged,
}: {
  event: CateringEventDetail | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onEdit: (e: CateringEventDetail) => void
  onChanged: () => void
}) {
  const [checkedMap, setCheckedMap] = React.useState<Record<number, boolean>>({})
  const [savingIdx, setSavingIdx] = React.useState<number | null>(null)
  const [items, setItems] = React.useState<ChecklistItem[]>([])

  React.useEffect(() => {
    if (event) {
      const normalized = normalizeChecklist(event.checklist)
      setItems(normalized)
      setCheckedMap(Object.fromEntries(normalized.map((_, i) => [i, normalized[i].done])))
    }
  }, [event?.id, event?.checklist])

  if (!event) return null
  const tCfg = eventTypeConfig(event.type)
  const sCfg = eventStatusConfig(event.status)
  const balance = Math.max(0, event.totalQuote - event.deposit)

  const toggleChecklist = async (idx: number) => {
    if (!event) return
    const next = !checkedMap[idx]
    setSavingIdx(idx)
    setCheckedMap((m) => ({ ...m, [idx]: next }))
    // Build updated checklist array (with new done state) and PATCH it.
    const updated: ChecklistItem[] = items.map((it, i) =>
      i === idx ? { text: it.text, done: next } : it
    )
    setItems(updated)
    try {
      const r = await fetch(`/api/admin/catering/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: updated }),
      })
      if (!r.ok) throw new Error('บันทึกไม่สำเร็จ')
      toast.success(next ? 'ทำเครื่องหมายเสร็จแล้ว' : 'ยกเลิกเครื่องหมาย')
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
      setCheckedMap((m) => ({ ...m, [idx]: !next }))
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, done: !next } : it)))
    } finally {
      setSavingIdx(null)
    }
  }

  const changeStatus = async (status: string) => {
    try {
      const r = await fetch(`/api/admin/catering/${event.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!r.ok) throw new Error('ไม่สำเร็จ')
      toast.success('เปลี่ยนสถานะเรียบร้อย')
      onChanged()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const printQuote = () => {
    window.print()
    toast.info('เปิดหน้าต่างพิมพ์ใบเสนอราคา')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="space-y-2 border-b pb-4">
          <div className="flex items-center gap-2">
            <Badge className={cn('ring-1 ring-inset', tCfg.cls)}>{tCfg.label}</Badge>
            <Badge className={cn('ring-1 ring-inset', sCfg.cls)}>{sCfg.label}</Badge>
            <span className="text-xs text-muted-foreground">{event.eventNo}</span>
          </div>
          <SheetTitle className="text-xl">{event.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            <CalendarDays className="mr-1 inline h-3 w-3" />
            {formatThaiDateTime(new Date(event.eventDate))} · {countdownLabel(event.eventDate)}
          </p>
        </SheetHeader>

        <div className="flex-1 space-y-5 p-4">
          {/* Customer + schedule */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"
          >
            <InfoRow icon={User} label="ลูกค้า">
              <p className="font-semibold">{event.customerName}</p>
            </InfoRow>
            <InfoRow icon={Phone} label="เบอร์โทร">
              <a href={`tel:${event.customerPhone}`} className="hover:underline">{event.customerPhone}</a>
            </InfoRow>
            {event.customerEmail && (
              <InfoRow icon={Mail} label="อีเมล">
                <a href={`mailto:${event.customerEmail}`} className="hover:underline truncate block">{event.customerEmail}</a>
              </InfoRow>
            )}
            <InfoRow icon={Users} label="จำนวนแขก">
              {toThaiNumerals(event.guestCount)} ท่าน
            </InfoRow>
            <InfoRow icon={CalendarDays} label="วันที่จัดงาน">
              {formatThaiDate(new Date(event.eventDate), { withDay: true })}
            </InfoRow>
            {event.setupTime && (
              <InfoRow icon={CalendarDays} label="เวลาติดตั้ง">
                {formatThaiDateTime(new Date(event.setupTime))}
              </InfoRow>
            )}
            <InfoRow icon={MapPin} label="สถานที่">
              <div className="flex flex-wrap items-center gap-2">
                <span>{event.location}</span>
                <a
                  href={event.mapUrl || googleMapsUrl(event.location)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
                >
                  เปิด Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </InfoRow>
            {event.theme && (
              <InfoRow icon={StickyNote} label="ธีม">{event.theme}</InfoRow>
            )}
            {event.packagingType && (
              <InfoRow icon={StickyNote} label="บรรจุภัณฑ์">{event.packagingType}</InfoRow>
            )}
          </motion.div>

          {/* Pricing */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border bg-card p-4"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Wallet className="h-4 w-4 text-[var(--gold)]" /> การเงิน
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">งบประมาณ</p>
                <p className="font-semibold">{formatBaht(event.budget)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">ราคาเสนอ</p>
                <p className="font-semibold">{formatBaht(event.totalQuote)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">มัดจำ</p>
                <p className="font-semibold text-[var(--gold)]">{formatBaht(event.deposit)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">คงเหลือ</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatBaht(balance)}</p>
              </div>
            </div>
          </motion.div>

          {/* Items */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border bg-card p-4"
          >
            <div className="mb-3 flex items-center justify-between text-sm font-semibold">
              <span>รายการสินค้า / เมนู</span>
              <span className="text-xs text-muted-foreground">{toThaiNumerals(event.items.length)} รายการ</span>
            </div>
            {event.items.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">ยังไม่มีรายการสินค้า</p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">รายการ</th>
                      <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                      <th className="px-3 py-2 text-right font-medium">ราคา/หน่วย</th>
                      <th className="px-3 py-2 text-right font-medium">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.items.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{it.name}</td>
                        <td className="px-3 py-2 text-right">{toThaiNumerals(it.qty)}</td>
                        <td className="px-3 py-2 text-right">{formatBaht(it.price)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatBaht(it.qty * it.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/40">
                      <td colSpan={3} className="px-3 py-2 text-right font-medium">รวมทั้งสิ้น</td>
                      <td className="px-3 py-2 text-right font-bold text-[var(--gold)]">
                        {formatBaht(event.items.reduce((s, it) => s + it.qty * it.price, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </motion.div>

          {/* Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border bg-card p-4"
          >
            <div className="mb-3 text-sm font-semibold">รายการตรวจสอบ (Checklist)</div>
            <ul className="space-y-1.5">
              {items.map((c, i) => (
                <li
                  key={i}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 transition-colors hover:bg-muted/40"
                  onClick={() => toggleChecklist(i)}
                >
                  {checkedMap[i] ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={cn('text-sm', checkedMap[i] && 'text-muted-foreground line-through')}>{c.text}</span>
                  {savingIdx === i && <span className="ml-auto text-[10px] text-muted-foreground">กำลังบันทึก...</span>}
                </li>
              ))}
              {items.length === 0 && (
                <li className="py-3 text-center text-xs text-muted-foreground">ยังไม่มีรายการตรวจสอบ</li>
              )}
            </ul>
          </motion.div>

          {/* Assignment */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"
          >
            <InfoRow icon={User} label="พนักงานรับผิดชอบ">
              {event.assignedUser ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.assignedUser.name}</span>
                  <Badge variant="outline" className="text-[9px]">{event.assignedUser.role}</Badge>
                </div>
              ) : (
                <span className="text-muted-foreground">ยังไม่มอบหมาย</span>
              )}
            </InfoRow>
            <InfoRow icon={Truck} label="ยานพาหนะ">
              {event.vehicle || '—'}
            </InfoRow>
          </motion.div>

          {event.notes && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4"
            >
              <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                <StickyNote className="h-4 w-4 text-amber-500" /> หมายเหตุ
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.notes}</p>
            </motion.div>
          )}

          <Separator />
          <p className="text-[10px] text-muted-foreground">
            สร้างเมื่อ {formatThaiDateTime(new Date(event.createdAt))} · อัปเดต {formatThaiDateTime(new Date(event.updatedAt))}
          </p>
        </div>

        <SheetFooter className="border-t bg-muted/30 p-3">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(event)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> แก้ไข
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  เปลี่ยนสถานะ <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>เลือกสถานะ</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STATUSES.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => changeStatus(s.value)}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={printQuote} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> ใบเสนอราคา
            </Button>
            <Button variant="outline" size="sm" onClick={() => { window.print(); toast.info('พิมพ์ใบยืนยัน') }} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> ใบยืนยัน
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export type { EventFormValues }
