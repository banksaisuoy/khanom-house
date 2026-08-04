import Link from 'next/link'
import { ArrowRight, Bike, MapPin, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type Delivery = {
  id: string
  status: string
  eta: number | null
  riderName: string
  orderNo: string
  customerName: string
  address: string
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  ASSIGNED: { label: 'มอบหมายแล้ว', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  PICKED_UP: { label: 'รับสินค้าแล้ว', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  ON_THE_WAY: { label: 'กำลังไปส่ง', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  DELIVERED: { label: 'ส่งแล้ว', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  FAILED: { label: 'ส่งไม่สำเร็จ', cls: 'bg-red-500/10 text-red-700 dark:text-red-300', dot: 'bg-red-500' },
}

export function DeliveriesPanel({ deliveries }: { deliveries: Delivery[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">การจัดส่งวันนี้</CardTitle>
        <Link
          href="/admin/deliveries"
          className="flex items-center gap-1 text-xs font-medium text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
        >
          ทั้งหมด <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[320px] pr-2">
          <ul className="space-y-2">
            {deliveries.length === 0 && (
              <li className="flex h-32 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Bike className="h-8 w-8 opacity-30" />
                ยังไม่มีงานจัดส่งวันนี้
              </li>
            )}
            {deliveries.map((d) => {
              const cfg = STATUS_CONFIG[d.status] ?? { label: d.status, cls: '', dot: 'bg-muted' }
              return (
                <li
                  key={d.id}
                  className="rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Bike className="h-4 w-4 text-[var(--forest)] dark:text-[var(--gold)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{d.orderNo}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {d.customerName}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn('h-5 shrink-0 px-1.5 text-[9px] font-medium', cfg.cls)}>
                      <span className={cn('mr-1 h-1.5 w-1.5 rounded-full', cfg.dot)} />
                      {cfg.label}
                    </Badge>
                  </div>

                  {d.address && (
                    <p className="mt-1.5 flex items-start gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">{d.address}</span>
                    </p>
                  )}

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>🛵 {d.riderName}</span>
                    {d.eta != null && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        ETA {toThaiNumerals(d.eta)} นาที
                      </span>
                    )}
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
