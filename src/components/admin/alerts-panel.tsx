import Link from 'next/link'
import {
  AlertTriangle,
  Package,
  Clock,
  Trash2,
  Bike,
  MessageSquareWarning,
  Flame,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { timeAgoThai } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type Alert = {
  id: string
  type: string
  title: string
  message: string
  severity: string
  isRead: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, React.ElementType> = {
  STOCK: Package,
  EXPIRY: Clock,
  WASTE: Trash2,
  DELIVERY: Bike,
  COMPLAINT: MessageSquareWarning,
  PRODUCTION: Flame,
  ORDER: AlertTriangle,
}

const SEVERITY_CONFIG: Record<string, { wrap: string; icon: string; accent: string }> = {
  critical: {
    wrap: 'border-red-500/40 bg-red-500/[0.04]',
    icon: 'bg-red-500/15 text-red-600 dark:text-red-400',
    accent: 'text-red-600 dark:text-red-400',
  },
  warning: {
    wrap: 'border-amber-500/40 bg-amber-500/[0.04]',
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    accent: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    wrap: 'border-[var(--gold)]/30 bg-[var(--gold)]/[0.04]',
    icon: 'bg-[var(--gold)]/15 text-[var(--gold)]',
    accent: 'text-[var(--gold)]',
  },
}

const TYPE_LABEL: Record<string, string> = {
  ORDER: 'ออเดอร์',
  STOCK: 'สต็อกต่ำ',
  EXPIRY: 'ใกล้หมดอายุ',
  WASTE: 'ของเสีย',
  DELIVERY: 'จัดส่ง',
  COMPLAINT: 'ร้องเรียน',
  PRODUCTION: 'การผลิต',
}

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base">แจ้งเตือนสำคัญ</CardTitle>
          {alerts.filter((a) => !a.isRead).length > 0 && (
            <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
              {alerts.filter((a) => !a.isRead).length} ยังไม่อ่าน
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ul className="space-y-2">
          {alerts.length === 0 && (
            <li className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              ✅ ไม่มีแจ้งเตือนสำคัญ
            </li>
          )}
          {alerts.map((a) => {
            const cfg = SEVERITY_CONFIG[a.severity] ?? SEVERITY_CONFIG.info
            const Icon = TYPE_ICON[a.type] ?? AlertTriangle
            return (
              <li key={a.id}>
                <Link
                  href="/admin/notifications"
                  className={cn(
                    'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all hover:shadow-sm',
                    cfg.wrap,
                    !a.isRead && 'ring-1 ring-inset ring-[var(--gold)]/20'
                  )}
                >
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cfg.icon)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold">{a.title}</span>
                      <span className={cn('text-[9px] font-semibold uppercase', cfg.accent)}>
                        {TYPE_LABEL[a.type] ?? a.type}
                      </span>
                      {!a.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                      )}
                    </div>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">{a.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70" suppressHydrationWarning>
                      {timeAgoThai(a.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
