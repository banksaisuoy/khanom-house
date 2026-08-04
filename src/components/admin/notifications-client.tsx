'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Check,
  Package,
  Clock,
  Trash2,
  Bike,
  MessageSquareWarning,
  Flame,
  ShoppingCart,
  AlertTriangle,
  Filter,
  CheckCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { timeAgoThai, formatThaiDateTime } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type NotifItem = {
  id: string
  type: string
  title: string
  message: string
  severity: string
  isRead: boolean
  refType?: string | null
  refId?: string | null
  createdAt: string
}

type FilterKey = 'all' | 'unread' | 'critical'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'unread', label: 'ยังไม่อ่าน' },
  { key: 'critical', label: 'วิกฤต' },
]

const TYPE_ICON: Record<string, React.ElementType> = {
  ORDER: ShoppingCart,
  STOCK: Package,
  EXPIRY: Clock,
  WASTE: Trash2,
  DELIVERY: Bike,
  COMPLAINT: MessageSquareWarning,
  PRODUCTION: Flame,
}

const TYPE_LABEL: Record<string, string> = {
  ORDER: 'ออเดอร์',
  STOCK: 'สต็อก',
  EXPIRY: 'หมดอายุ',
  WASTE: 'ของเสีย',
  DELIVERY: 'จัดส่ง',
  COMPLAINT: 'ร้องเรียน',
  PRODUCTION: 'การผลิต',
}

const SEVERITY_CONFIG: Record<string, { wrap: string; icon: string; label: string; dot: string }> = {
  critical: {
    wrap: 'border-red-500/40 bg-red-500/[0.04]',
    icon: 'bg-red-500/15 text-red-600 dark:text-red-400',
    label: 'วิกฤต',
    dot: 'bg-red-500',
  },
  warning: {
    wrap: 'border-amber-500/40 bg-amber-500/[0.04]',
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    label: 'เตือน',
    dot: 'bg-amber-500',
  },
  info: {
    wrap: 'border-[var(--gold)]/30 bg-[var(--gold)]/[0.03]',
    icon: 'bg-[var(--gold)]/15 text-[var(--gold)]',
    label: 'ข้อมูล',
    dot: 'bg-[var(--gold)]',
  },
}

export function NotificationsClient() {
  const qc = useQueryClient()
  const [filter, setFilter] = React.useState<FilterKey>('all')

  const { data, isLoading } = useQuery<{
    items: NotifItem[]
    unreadCount: number
    criticalCount: number
    total: number
  }>({
    queryKey: ['admin-notifications-list', filter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/notifications?filter=${filter}`)
      if (!res.ok) throw new Error('fetch failed')
      return res.json()
    },
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/notifications/${id}/read`, { method: 'POST' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications-list'] })
      qc.invalidateQueries({ queryKey: ['admin-notifications-bell'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = (data?.items ?? []).filter((n) => !n.isRead)
      await Promise.all(
        unread.map((n) =>
          fetch(`/api/admin/notifications/${n.id}/read`, { method: 'POST' })
        )
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications-list'] })
      qc.invalidateQueries({ queryKey: ['admin-notifications-bell'] })
    },
  })

  const items = data?.items ?? []
  const unreadCount = data?.unreadCount ?? 0
  const criticalCount = data?.criticalCount ?? 0

  return (
    <div className="space-y-4">
      {/* Header / stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
              <Bell className="h-5 w-5 text-[var(--forest)] dark:text-[var(--gold)]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ทั้งหมด</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/15">
              <Bell className="h-5 w-5 text-[var(--gold)]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ยังไม่อ่าน</p>
              <p className="text-2xl font-bold text-[var(--gold)]">{unreadCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">วิกฤต</p>
              <p className="text-2xl font-bold text-red-500">{criticalCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">ตัวกรอง</CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
            className="h-8 gap-1.5 text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            อ่านทั้งหมด
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                className={cn(
                  'h-8 gap-1.5 text-xs',
                  filter === f.key
                    ? 'bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]'
                    : ''
                )}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key === 'unread' && unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 bg-background/30 px-1 text-[9px]">
                    {unreadCount}
                  </Badge>
                )}
                {f.key === 'critical' && criticalCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 bg-background/30 px-1 text-[9px]">
                    {criticalCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">รายการแจ้งเตือน</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[600px] pr-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                ไม่มีการแจ้งเตือน
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((n) => {
                  const cfg = SEVERITY_CONFIG[n.severity] ?? SEVERITY_CONFIG.info
                  const Icon = TYPE_ICON[n.type] ?? Bell
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'group relative flex gap-3 rounded-xl border p-3 transition-all hover:shadow-sm',
                        cfg.wrap,
                        !n.isRead && 'ring-1 ring-inset ring-[var(--gold)]/30'
                      )}
                    >
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', cfg.icon)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold">{n.title}</p>
                          <Badge variant="outline" className="h-4 px-1 text-[9px] font-medium">
                            {TYPE_LABEL[n.type] ?? n.type}
                          </Badge>
                          <Badge variant="secondary" className={cn('h-4 px-1 text-[9px] font-medium', cfg.icon)}>
                            {cfg.label}
                          </Badge>
                          {!n.isRead && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--gold)]">
                              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                              ใหม่
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/70" suppressHydrationWarning>
                          {formatThaiDateTime(new Date(n.createdAt))} · {timeAgoThai(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 shrink-0 gap-1 text-xs"
                          onClick={() => markRead.mutate(n.id)}
                          disabled={markRead.isPending}
                        >
                          <Check className="h-3 w-3" />
                          อ่านแล้ว
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
