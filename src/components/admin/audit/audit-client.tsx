'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText, Search, Filter, Download, ChevronDown, ChevronRight,
  ShieldCheck, Activity, History, User as UserIcon, Globe, Monitor,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination'
import { AdminPageHeader, AdminMiniStat, AdminEmptyState } from '@/components/admin/admin-page-utils'
import { avatarInitials, toCsv, downloadCsv } from '@/lib/admin-ui'
import { formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

const ACTION_CONFIG: Record<string, { label: string; cls: string }> = {
  CREATE: { label: 'สร้าง', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  UPDATE: { label: 'แก้ไข', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  DELETE: { label: 'ลบ', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
  LOGIN: { label: 'เข้าสู่ระบบ', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  LOGOUT: { label: 'ออกจากระบบ', cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30' },
  APPROVE: { label: 'อนุมัติ', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-300 ring-[var(--forest)]/30' },
  STATUS_CHANGE: { label: 'เปลี่ยนสถานะ', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  EXPORT: { label: 'ส่งออก', cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/30' },
  ADJUST: { label: 'ปรับยอด', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
}

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  BRANCH_MANAGER: { label: 'Manager', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-300 ring-[var(--forest)]/30' },
  KITCHEN: { label: 'Kitchen', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  CASHIER: { label: 'Cashier', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  RIDER: { label: 'Rider', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30' },
  ACCOUNTANT: { label: 'Accountant', cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30' },
  STAFF: { label: 'Staff', cls: 'bg-muted text-muted-foreground ring-border' },
}

const ACTIONS = [
  { value: 'all', label: 'ทุกการกระทำ' },
  { value: 'CREATE', label: 'สร้าง' },
  { value: 'UPDATE', label: 'แก้ไข' },
  { value: 'DELETE', label: 'ลบ' },
  { value: 'LOGIN', label: 'เข้าสู่ระบบ' },
  { value: 'LOGOUT', label: 'ออกจากระบบ' },
  { value: 'APPROVE', label: 'อนุมัติ' },
  { value: 'STATUS_CHANGE', label: 'เปลี่ยนสถานะ' },
  { value: 'EXPORT', label: 'ส่งออก' },
  { value: 'ADJUST', label: 'ปรับยอด' },
]

const ENTITIES = [
  { value: 'all', label: 'ทุกเอนทิตี' },
  { value: 'Product', label: 'Product' },
  { value: 'Order', label: 'Order' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Customer', label: 'Customer' },
  { value: 'CateringEvent', label: 'Catering' },
  { value: 'Promotion', label: 'Promotion' },
  { value: 'WasteLog', label: 'Waste' },
  { value: 'User', label: 'User' },
]

type AuditRow = {
  id: string
  userId: string | null
  user: { id: string; name: string; email: string; role: string; avatarUrl: string | null } | null
  action: string
  entity: string
  entityId: string | null
  oldValue: string | null
  newValue: string | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export function AuditClient({ initialUsers }: { initialUsers: { id: string; name: string; role: string }[] }) {
  const qc = useQueryClient()
  const [userId, setUserId] = React.useState('all')
  const [action, setAction] = React.useState('all')
  const [entity, setEntity] = React.useState('all')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [expanded, setExpanded] = React.useState<string | null>(null)

  const queryKey = React.useMemo(
    () => ['admin-audit', userId, action, entity, from, to, q, page],
    [userId, action, entity, from, to, q, page]
  )

  const { data, isLoading, isFetching } = useQuery<{ logs: AuditRow[]; total: number; totalPages: number }>({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (userId !== 'all') sp.set('userId', userId)
      if (action !== 'all') sp.set('action', action)
      if (entity !== 'all') sp.set('entity', entity)
      if (from) sp.set('from', from)
      if (to) sp.set('to', to)
      if (q) sp.set('q', q)
      sp.set('page', String(page))
      sp.set('pageSize', '20')
      const r = await fetch(`/api/admin/audit?${sp.toString()}`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  // Reset to page 1 when filters change
  React.useEffect(() => { setPage(1) }, [userId, action, entity, from, to, q])

  const exportCsv = async () => {
    try {
      const sp = new URLSearchParams()
      if (userId !== 'all') sp.set('userId', userId)
      if (action !== 'all') sp.set('action', action)
      if (entity !== 'all') sp.set('entity', entity)
      if (from) sp.set('from', from)
      if (to) sp.set('to', to)
      if (q) sp.set('q', q)
      sp.set('format', 'csv')
      const r = await fetch(`/api/admin/audit?${sp.toString()}`)
      if (!r.ok) throw new Error('ส่งออกไม่สำเร็จ')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audit-logs.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 500)
    } catch {
      // Fallback: client-side export from current page
      const rows = logs.map((l) => ({
        timestamp: l.createdAt,
        user: l.user?.name ?? '—',
        action: l.action,
        entity: l.entity,
        entityId: l.entityId ?? '',
        ip: l.ip ?? '',
      }))
      downloadCsv('audit-logs.csv', toCsv(rows, [
        { key: 'timestamp', label: 'วันที่' },
        { key: 'user', label: 'ผู้ใช้' },
        { key: 'action', label: 'การกระทำ' },
        { key: 'entity', label: 'เอนทิตี' },
        { key: 'entityId', label: 'ID' },
        { key: 'ip', label: 'IP' },
      ]))
    }
  }

  // KPIs (rough, based on current page — total counts via API would be more accurate)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayCount = logs.filter((l) => new Date(l.createdAt) >= today).length
  const createCount = logs.filter((l) => l.action === 'CREATE').length
  const deleteCount = logs.filter((l) => l.action === 'DELETE').length
  const updateCount = logs.filter((l) => l.action === 'UPDATE').length

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Audit Logs"
        subtitle="บันทึกการเปลี่ยนแปลงและการกระทำทั้งหมดในระบบ"
        icon={ScrollText}
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv}>
            <Download className="h-4 w-4" /> ส่งออก CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminMiniStat label="ทั้งหมดในหน้านี้" value={toThaiNumerals(logs.length)} icon={History} accent="gold" />
        <AdminMiniStat label="วันนี้ (ในหน้า)" value={toThaiNumerals(todayCount)} icon={Activity} accent="forest" />
        <AdminMiniStat label="การสร้าง" value={toThaiNumerals(createCount)} icon={ShieldCheck} accent="teal" />
        <AdminMiniStat label="การลบ/แก้ไข" value={toThaiNumerals(deleteCount + updateCount)} icon={ShieldCheck} accent="red" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> ตัวกรอง
            </div>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="ผู้ใช้" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกผู้ใช้</SelectItem>
                {initialUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">จาก</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">ถึง</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[140px] text-xs" />
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา entity, ID, IP, ผู้ใช้"
                className="h-8 w-[240px] pl-7 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : logs.length === 0 ? (
            <AdminEmptyState
              icon={ScrollText}
              title="ไม่พบบันทึกการกระทำ"
              description="ลองเปลี่ยนตัวกรองหรือล้างการค้นหา"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-xs">วันที่/เวลา</TableHead>
                    <TableHead className="text-xs">ผู้ใช้</TableHead>
                    <TableHead className="text-xs">การกระทำ</TableHead>
                    <TableHead className="text-xs">เอนทิตี</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l, i) => {
                    const act = ACTION_CONFIG[l.action] ?? { label: l.action, cls: 'bg-muted text-muted-foreground ring-border' }
                    const isOpen = expanded === l.id
                    return (
                      <React.Fragment key={l.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => setExpanded(isOpen ? null : l.id)}
                        >
                          <TableCell className="p-2">
                            <motion.button
                              initial={false}
                              animate={{ rotate: isOpen ? 90 : 0 }}
                              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted"
                            >
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </motion.button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatThaiDateTime(new Date(l.createdAt))}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-[var(--gold)]/15 text-[9px] font-bold text-[var(--gold)]">
                                  {l.user ? avatarInitials(l.user.name) : '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium">{l.user?.name ?? 'ระบบ'}</p>
                                <p className="truncate text-[9px] text-muted-foreground">{l.user?.email ?? '—'}</p>
                              </div>
                              {l.user?.role && (
                                <Badge className={cn('ml-1 text-[9px] ring-1 ring-inset', ROLE_CONFIG[l.user.role]?.cls ?? 'bg-muted text-muted-foreground ring-border')}>
                                  {ROLE_CONFIG[l.user.role]?.label ?? l.user.role}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[10px] ring-1 ring-inset', act.cls)}>{act.label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-mono">{l.entity}</span>
                            {l.entityId && <span className="ml-1.5 text-[9px] text-muted-foreground">#{l.entityId.slice(-6)}</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {l.ip ? (
                              <span className="inline-flex items-center gap-1">
                                <Globe className="h-3 w-3" /> {l.ip}
                              </span>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <TableCell colSpan={6} className="bg-muted/30 p-4">
                                <div className="grid gap-3 lg:grid-cols-2">
                                  <div>
                                    <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                                      <span className="text-red-500">Old Value</span>
                                    </p>
                                    <pre className="overflow-x-auto rounded-lg border bg-card p-2 text-[10px] font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto scrollbar-thin">
                                      {l.oldValue ? prettyJson(l.oldValue) : '— ไม่มี —'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                                      <span className="text-emerald-500">New Value</span>
                                    </p>
                                    <pre className="overflow-x-auto rounded-lg border bg-card p-2 text-[10px] font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto scrollbar-thin">
                                      {l.newValue ? prettyJson(l.newValue) : '— ไม่มี —'}
                                    </pre>
                                  </div>
                                  {l.userAgent && (
                                    <div className="lg:col-span-2">
                                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                                        <Monitor className="h-3 w-3" /> User Agent
                                      </p>
                                      <p className="text-[10px] text-muted-foreground break-words">{l.userAgent}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {logs.length > 0 && (
            <div className="flex items-center justify-between border-t p-3">
              <p className="text-xs text-muted-foreground">
                หน้า {toThaiNumerals(page)} / {toThaiNumerals(totalPages)} · ทั้งหมด {toThaiNumerals(total)} รายการ
                {isFetching && <span className="ml-2 text-[10px]">กำลังอัปเดต...</span>}
              </p>
              <Pagination className="justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)) }}
                      aria-disabled={page === 1}
                      className={cn(page === 1 && 'pointer-events-none opacity-50')}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3 text-xs">{toThaiNumerals(page)} / {toThaiNumerals(totalPages)}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)) }}
                      aria-disabled={page === totalPages}
                      className={cn(page === totalPages && 'pointer-events-none opacity-50')}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function prettyJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}
