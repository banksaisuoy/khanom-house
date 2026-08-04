'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { timeAgoThai } from '@/lib/thai-date'

type NotifItem = {
  id: string
  type: string
  title: string
  message: string
  severity: string
  isRead: boolean
  createdAt: string
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-[var(--gold)]',
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

export function NotificationBell() {
  const qc = useQueryClient()
  const [open, setOpen] = React.useState(false)

  const { data } = useQuery<{ items: NotifItem[]; unreadCount: number; criticalCount: number }>({
    queryKey: ['admin-notifications-bell'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notifications?filter=all')
      if (!res.ok) throw new Error('fetch failed')
      return res.json()
    },
    refetchInterval: 30_000,
  })

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/notifications/${id}/read`, { method: 'POST' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications-bell'] })
      qc.invalidateQueries({ queryKey: ['admin-notifications-list'] })
    },
  })

  const unread = data?.unreadCount ?? 0
  const items = (data?.items ?? []).slice(0, 8)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label="การแจ้งเตือน"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">การแจ้งเตือน</h3>
            {unread > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-500/10 text-red-600 dark:text-red-400"
              >
                {unread} ใหม่
              </Badge>
            )}
          </div>
          <Link
            href="/admin/notifications"
            className="text-xs font-medium text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
            onClick={() => setOpen(false)}
          >
            ดูทั้งหมด
          </Link>
        </div>
        <ScrollArea className="h-[360px]">
          {items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              ไม่มีการแจ้งเตือน
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'group relative flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40',
                    !n.isRead && 'bg-[var(--gold)]/[0.04]'
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      SEVERITY_DOT[n.severity] ?? 'bg-muted-foreground'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70" suppressHydrationWarning>
                      {timeAgoThai(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                      aria-label="ทำเครื่องหมายว่าอ่านแล้ว"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
