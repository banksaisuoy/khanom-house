'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCog, Plus, Search, ShieldCheck, Mail, Phone, Building2, Pencil, Trash2,
  Crown, ChefHat, Store, Bike, Calculator, User, CheckCircle2, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/admin-page-utils'
import { UserFormDialog } from './user-form-dialog'
import { roleConfig, avatarInitials } from '@/lib/admin-ui'
import { timeAgoThai, toThaiNumerals } from '@/lib/thai-date'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Branch = { id: string; name: string; code: string }
export type UserRow = {
  id: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  role: string
  branchId: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  branch: { id: string; name: string; code: string } | null
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  SUPER_ADMIN: Crown,
  BRANCH_MANAGER: Store,
  KITCHEN: ChefHat,
  CASHIER: Calculator,
  RIDER: Bike,
  ACCOUNTANT: Calculator,
  STAFF: User,
}

const ROLE_PERMISSIONS: Record<string, { label: string; perms: string[]; icon: React.ElementType }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    icon: Crown,
    perms: [
      'เข้าถึงทุกเมนูของระบบ',
      'จัดการผู้ใช้และสิทธิ์ทั้งหมด',
      'ตั้งค่าระบบและสาขา',
      'ดูรายงานและการเงินทุกแบบ',
      'ดู Audit Logs',
    ],
  },
  BRANCH_MANAGER: {
    label: 'Branch Manager',
    icon: Store,
    perms: [
      'จัดการสินค้า สต็อก และสูตร',
      'ดูแลออเดอร์และครัว',
      'ดูรายงานของสาขา',
      'จัดการ Catering & ลูกค้า',
      'ปิดยอดประจำวัน',
    ],
  },
  KITCHEN: {
    label: 'Kitchen',
    icon: ChefHat,
    perms: [
      'ดูคิวผลิต (Kitchen Board)',
      'เริ่ม/เสร็จ การผลิต',
      'บันทึกของเสีย',
      'ดูสูตรและ BOM',
      'QC คุณภาพผลผลิต',
    ],
  },
  CASHIER: {
    label: 'Cashier',
    icon: Calculator,
    perms: [
      'เปิด/ปิดกะ POS',
      'ขายสินค้าผ่าน POS',
      'รับเงิน/ทอน/ลิ้นชัก',
      'พิมพ์ใบเสร็จ',
      'ยกเลิกบิล',
    ],
  },
  RIDER: {
    label: 'Rider',
    icon: Bike,
    perms: [
      'ดูงานจัดส่งที่มอบหมาย',
      'อัปเดตสถานะการจัดส่ง',
      'บันทึก POD',
      'เปิดแผนที่นำทาง',
    ],
  },
  ACCOUNTANT: {
    label: 'Accountant',
    icon: Calculator,
    perms: [
      'ดูรายงานการเงินทั้งหมด',
      'ปิดยอดประจำวัน',
      'ดูงบ P&L / VAT',
      'ส่งออกข้อมูล PEAK / FlowAccount',
      'ดู Audit Logs',
    ],
  },
  STAFF: {
    label: 'Staff',
    icon: User,
    perms: [
      'ดูสินค้าและสต็อก',
      'รับออเดอร์พื้นฐาน',
      'ดูข้อมูลลูกค้า',
    ],
  },
}

export function UsersClient({
  initialUsers,
  branches,
}: {
  initialUsers: UserRow[]
  branches: Branch[]
}) {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<string>('all')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const { data, isLoading } = useQuery<{ users: UserRow[] }>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const r = await fetch('/api/admin/users?includeInactive=1')
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { users: initialUsers },
  })

  const users = data?.users ?? []

  const filtered = React.useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone ?? '').includes(q)
        )
      }
      return true
    })
  }, [users, roleFilter, search])

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (u: UserRow) => {
    setEditing(u)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const r = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? 'ลบไม่สำเร็จ')
      }
      toast.success(`ปิดการใช้งานผู้ใช้ ${deleteTarget.name} แล้ว`)
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="ผู้ใช้ & สิทธิ์"
        subtitle="จัดการบัญชีผู้ใช้งานระบบ บทบาท และสิทธิ์การเข้าถึง"
        icon={UserCog}
        actions={
          <Button size="sm" onClick={openCreate} className="gap-1.5 bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90">
            <Plus className="h-4 w-4" /> เพิ่มผู้ใช้
          </Button>
        }
      />

      {/* Role permissions card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-[var(--gold)]" /> บทบาท & สิทธิ์ในระบบ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {Object.entries(ROLE_PERMISSIONS).map(([key, info]) => {
              const Icon = info.icon
              const cfg = roleConfig(key)
              return (
                <div key={key} className="rounded-xl border bg-card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <Badge className={cn('text-[9px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {info.perms.map((p, i) => (
                      <li key={i} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-500" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / อีเมล / เบอร์"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <div className="inline-flex rounded-lg border p-0.5">
              {['all', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'KITCHEN', 'CASHIER', 'RIDER', 'ACCOUNTANT', 'STAFF'].map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={roleFilter === r ? 'default' : 'ghost'}
                  className={cn('h-7 text-[10px]', roleFilter === r && 'bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]')}
                  onClick={() => setRoleFilter(r)}
                >
                  {r === 'all' ? 'ทั้งหมด' : roleConfig(r).label}
                </Button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {toThaiNumerals(filtered.length)} / {toThaiNumerals(users.length)} คน
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <AdminEmptyState
              icon={UserCog}
              title="ไม่พบผู้ใช้"
              description="ลองเปลี่ยนตัวกรองหรือเพิ่มผู้ใช้ใหม่"
              action={
                <Button size="sm" onClick={openCreate} className="gap-1.5">
                  <Plus className="h-4 w-4" /> เพิ่มผู้ใช้ใหม่
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ผู้ใช้</TableHead>
                    <TableHead className="text-xs">อีเมล / เบอร์</TableHead>
                    <TableHead className="text-xs">บทบาท</TableHead>
                    <TableHead className="text-xs">สาขา</TableHead>
                    <TableHead className="text-xs">เข้าล่าสุด</TableHead>
                    <TableHead className="text-center text-xs">สถานะ</TableHead>
                    <TableHead className="text-right text-xs">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((u, i) => {
                      const cfg = roleConfig(u.role)
                      const Icon = ROLE_ICONS[u.role] ?? User
                      return (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.15) }}
                          className="hover:bg-muted/40"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-[var(--gold)]/15 text-[10px] font-bold text-[var(--gold)]">
                                  {avatarInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{u.name}</p>
                                <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                  <Icon className="h-2.5 w-2.5" />
                                  {cfg.label}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="flex items-center gap-1 text-[11px]"><Mail className="h-3 w-3 text-muted-foreground" />{u.email}</p>
                            {u.phone && <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Phone className="h-2.5 w-2.5" />{u.phone}</p>}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[10px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {u.branch ? (
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {u.branch.name}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
                            {u.lastLoginAt ? timeAgoThai(new Date(u.lastLoginAt)) : <span className="text-amber-600 dark:text-amber-400">ยังไม่เคยเข้า</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {u.isActive ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30 text-[9px]">
                                <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> ใช้งาน
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/30 text-[9px]">
                                <XCircle className="mr-1 h-2.5 w-2.5" /> ปิดอยู่
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon" variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                onClick={() => setDeleteTarget(u)}
                                disabled={u.role === 'SUPER_ADMIN'}
                                title={u.role === 'SUPER_ADMIN' ? 'ไม่สามารถลบ Super Admin' : 'ปิดการใช้งาน'}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null) }}
        editing={editing}
        branches={branches}
        onSaved={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันปิดการใช้งานผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              ผู้ใช้ <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) จะไม่สามารถเข้าสู่ระบบได้
              บัญชีจะถูกปิดการใช้งาน (soft delete) — ประวัติการใช้งานยังคงอยู่ในระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="gap-1.5 bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'กำลังปิด...' : 'ปิดการใช้งาน'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
