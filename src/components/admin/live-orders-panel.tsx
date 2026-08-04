import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { timeAgoThai, formatBaht, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type Order = {
  id: string
  orderNo: string
  channel: string
  status: string
  total: number
  customerName: string
  type: string
  createdAt: string
  itemCount: number
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'รอดำเนินการ', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  PAID: { label: 'ชำระแล้ว', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  PREPARING: { label: 'กำลังเตรียม', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  COOKING: { label: 'กำลังทำ', cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  PACKING: { label: 'กำลังแพ็ค', cls: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' },
  OUT_FOR_DELIVERY: { label: 'กำลังจัดส่ง', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  COMPLETED: { label: 'สำเร็จ', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  DELIVERED: { label: 'จัดส่งแล้ว', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  CANCELLED: { label: 'ยกเลิก', cls: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30' },
  REFUNDED: { label: 'คืนเงิน', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' },
}

const CHANNEL_ICON: Record<string, string> = {
  POS: '🏪',
  WEBSITE: '🌐',
  LINE: '💬',
  GRAB: '🛵',
  PHONE: '📞',
}

export function LiveOrdersPanel({ orders }: { orders: Order[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <CardTitle className="text-base">ออเดอร์ล่าสุด</CardTitle>
        </div>
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-xs font-medium text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
        >
          ดูทั้งหมด <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[320px] pr-2">
          <ul className="space-y-2">
            {orders.length === 0 && (
              <li className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                ยังไม่มีออเดอร์
              </li>
            )}
            {orders.map((o) => {
              const cfg = STATUS_CONFIG[o.status] ?? { label: o.status, cls: '' }
              return (
                <li
                  key={o.id}
                  className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
                    {CHANNEL_ICON[o.channel] ?? '📦'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold">{o.orderNo}</span>
                      <span className="text-[10px] text-muted-foreground">
                        · {toThaiNumerals(o.itemCount)} ชิ้น
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{o.customerName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-[var(--gold)]">
                      {formatBaht(o.total)}
                    </span>
                    <Badge variant="outline" className={cn('h-4 px-1 text-[9px] font-medium', cfg.cls)}>
                      {cfg.label}
                    </Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
