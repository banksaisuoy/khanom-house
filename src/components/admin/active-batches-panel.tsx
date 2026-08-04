import Link from 'next/link'
import { ArrowRight, Flame, Clock, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type Batch = {
  id: string
  batchNo: string
  productName: string
  status: string
  priority: number
  plannedQty: number
  producedQty: number
  progress: number
  startedAt: string | null
  elapsedMin: number
  cookName: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  QUEUED: { label: 'รอคิว', icon: Clock, cls: 'text-amber-600 dark:text-amber-400' },
  COOKING: { label: 'กำลังทำ', icon: Flame, cls: 'text-orange-600 dark:text-orange-400' },
  QC: { label: 'ตรวจ QC', icon: ShieldCheck, cls: 'text-violet-600 dark:text-violet-400' },
}

export function ActiveBatchesPanel({ batches }: { batches: Batch[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">การผลิตกำลังดำเนิน</CardTitle>
        <Link
          href="/admin/kitchen"
          className="flex items-center gap-1 text-xs font-medium text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
        >
          ครัว <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[320px] pr-2">
          <ul className="space-y-2">
            {batches.length === 0 && (
              <li className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                ไม่มีคิวผลิตในขณะนี้
              </li>
            )}
            {batches.map((b) => {
              const cfg = STATUS_CONFIG[b.status] ?? { label: b.status, icon: Clock, cls: '' }
              const StatusIcon = cfg.icon
              return (
                <li
                  key={b.id}
                  className="rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', cfg.cls)} />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{b.productName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.batchNo} · โดย {b.cookName}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {b.priority > 0 && (
                        <Badge variant="outline" className="h-4 border-red-500/30 bg-red-500/10 px-1 text-[9px] font-medium text-red-600 dark:text-red-400">
                          ด่วน {toThaiNumerals(b.priority)}
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn('h-4 border-transparent px-1 text-[9px] font-medium', cfg.cls)}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={b.progress} className="h-1.5 flex-1 [&>div]:bg-[var(--gold)]" />
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                      {toThaiNumerals(b.producedQty)}/{toThaiNumerals(b.plannedQty)}
                    </span>
                  </div>

                  {b.startedAt && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      ⏱ เริ่ม {toThaiNumerals(b.elapsedMin)} นาทีที่แล้ว
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
