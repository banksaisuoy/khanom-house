import Link from 'next/link'
import { Activity, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { timeAgoThai } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type AuditEntry = {
  id: string
  action: string
  entity: string
  entityId: string | null
  userName: string
  userRole: string
  ip: string | null
  createdAt: string
}

const ACTION_CONFIG: Record<string, { label: string; cls: string }> = {
  CREATE: { label: 'สร้าง', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  UPDATE: { label: 'แก้ไข', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  DELETE: { label: 'ลบ', cls: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  LOGIN: { label: 'เข้าสู่ระบบ', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  LOGOUT: { label: 'ออกจากระบบ', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  APPROVE: { label: 'อนุมัติ', cls: 'bg-[var(--gold)]/15 text-[var(--gold)]' },
}

const ENTITY_TH: Record<string, string> = {
  Product: 'สินค้า',
  Order: 'ออเดอร์',
  Inventory: 'คลังสินค้า',
  User: 'ผู้ใช้',
}

function initials(name: string): string {
  if (!name) return '?'
  // Use first 2 Thai chars
  return name.slice(0, 2)
}

export function AuditFeed({ entries }: { entries: AuditEntry[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--forest)] dark:text-[var(--gold)]" />
          <CardTitle className="text-base">Activity Feed</CardTitle>
        </div>
        <Link
          href="/admin/audit"
          className="flex items-center gap-1 text-xs font-medium text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
        >
          บันทึกทั้งหมด <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[300px] pr-2">
          <ul className="space-y-3">
            {entries.length === 0 && (
              <li className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                ยังไม่มีบันทึกกิจกรรม
              </li>
            )}
            {entries.map((a) => {
              const cfg = ACTION_CONFIG[a.action] ?? { label: a.action, cls: '' }
              return (
                <li key={a.id} className="flex gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0 border border-[var(--gold)]/20">
                    <AvatarFallback className="bg-muted text-[9px] font-bold text-[var(--forest)] dark:text-[var(--gold)]">
                      {initials(a.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-tight">
                      <span className="font-semibold">{a.userName}</span>{' '}
                      <Badge variant="secondary" className={cn('mx-0.5 h-4 px-1 align-middle text-[9px] font-medium', cfg.cls)}>
                        {cfg.label}
                      </Badge>{' '}
                      <span className="text-muted-foreground">
                        {ENTITY_TH[a.entity] ?? a.entity}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground" suppressHydrationWarning>
                      {timeAgoThai(a.createdAt)}
                      {a.ip && ` · ${a.ip}`}
                    </p>
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
