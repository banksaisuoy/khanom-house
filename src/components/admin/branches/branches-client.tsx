'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Building2, Plus, Pencil, Trash2, Phone, MapPin, Users, Warehouse, Crown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatNumber, toThaiNumerals } from '@/lib/thai-date'
import { BranchFormDialog, type BranchFormValues, type BranchRow } from './branch-form-dialog'

type Props = {
  initialBranches: BranchRow[]
  totalUserCount: number
}

export function BranchesClient({ initialBranches, totalUserCount }: Props) {
  const qc = useQueryClient()
  const [creating, setCreating] = React.useState(false)
  const [editing, setEditing] = React.useState<BranchRow | null>(null)
  const [deleting, setDeleting] = React.useState<BranchRow | null>(null)

  const { data, isLoading } = useQuery<{ branches: BranchRow[] }>({
    queryKey: ['admin-branches'],
    queryFn: async () => {
      const r = await fetch('/api/admin/branches', { cache: 'no-store' })
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { branches: initialBranches },
  })

  const branches = data?.branches ?? []
  const mainBranch = branches.find((b) => b.isMain)
  const activeBranches = branches.filter((b) => b.isActive)
  const totalUsers = branches.reduce((s, b) => s + b.userCount, 0)

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-branches'] })

  async function handleSubmit(values: BranchFormValues, id?: string) {
    try {
      const url = id ? `/api/admin/branches/${id}` : '/api/admin/branches'
      const method = id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'บันทึกไม่สำเร็จ')
      }
      toast.success(id ? `อัปเดตสาขา "${values.name}" แล้ว` : `เพิ่มสาขา "${values.name}" แล้ว`)
      setEditing(null)
      setCreating(false)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function handleDelete(b: BranchRow) {
    try {
      const res = await fetch(`/api/admin/branches/${b.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'ลบไม่สำเร็จ')
      }
      toast.success(`ปิดการใช้งานสาขา "${b.name}" แล้ว (soft delete)`)
      setDeleting(null)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Breadcrumb + header */}
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">แดชบอร์ด</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>จัดการสาขา</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
              <Building2 className="h-6 w-6 text-[var(--gold)]" />
              จัดการสาขา
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ตั้งค่าสาขาของร้าน — เฉพาะ Super Admin สามารถเพิ่ม/แก้ไขได้
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
            onClick={() => setCreating(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            เพิ่มสาขา
          </Button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="สาขาทั้งหมด" value={formatNumber(branches.length)} icon={Building2} accent="gold" loading={isLoading} />
        <StatCard
          label="สาขาหลัก"
          value={mainBranch ? mainBranch.name : '—'}
          icon={Crown}
          accent="forest"
          loading={isLoading}
        />
        <StatCard label="สาขาที่ใช้งาน" value={formatNumber(activeBranches.length)} icon={Building2} accent="cream" loading={isLoading} />
        <StatCard label="พนักงานรวม" value={formatNumber(totalUsers || totalUserCount)} icon={Users} accent="terracotta" loading={isLoading} />
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-2 h-4 w-20" />
                <Skeleton className="mt-4 h-12 w-full" />
                <Skeleton className="mt-4 h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">ยังไม่มีสาขา</p>
            <p className="mt-1 text-sm text-muted-foreground">เพิ่มสาขาแรกเพื่อเริ่มใช้งาน</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((b, idx) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.3) }}
            >
              <Card className={`h-full ${b.isMain ? 'border-[var(--gold)]/40 ring-1 ring-[var(--gold)]/20' : ''}`}>
                <CardContent className="flex h-full flex-col p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${b.isMain ? 'bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30' : 'bg-muted text-muted-foreground'}`}>
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold leading-tight">{b.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{b.code}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {b.isMain && (
                        <Badge className="bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-inset ring-[var(--gold)]/30 text-[10px]">
                          <Crown className="mr-1 h-2.5 w-2.5" />
                          สาขาหลัก
                        </Badge>
                      )}
                      {b.isActive ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400 text-[10px]">ใช้งาน</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">ปิดอยู่</Badge>
                      )}
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="mt-3 space-y-1 text-xs">
                    {b.phone && (
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {b.phone}
                      </p>
                    )}
                    {b.address && (
                      <p className="flex items-start gap-1.5 text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="line-clamp-2">{b.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Counts */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border bg-card p-2 text-center">
                      <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" /> พนักงาน
                      </p>
                      <p className="mt-0.5 text-lg font-bold">{toThaiNumerals(b.userCount)}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-2 text-center">
                      <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Warehouse className="h-3 w-3" /> สต็อก
                      </p>
                      <p className="mt-0.5 text-lg font-bold">{toThaiNumerals(b.inventoryCount)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-end gap-1 pt-4">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(b)}>
                      <Pencil className="mr-1 h-3 w-3" />
                      แก้ไข
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-700"
                      onClick={() => setDeleting(b)}
                      disabled={b.isMain}
                      title={b.isMain ? 'ไม่สามารถลบสาขาหลักได้' : 'ปิดการใช้งาน'}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      ปิด
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {(creating || editing) && (
        <BranchFormDialog
          open
          onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}
          branch={editing ?? undefined}
          onSubmit={handleSubmit}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ปิดการใช้งานสาขานี้?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.name}&quot; จะถูกปิดการใช้งาน (soft delete) — พนักงาน/สต็อกในสาขายังคงอยู่
              และสามารถเปิดใช้ใหม่ได้ภายหลัง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleting && handleDelete(deleting)}
            >
              ปิดการใช้งาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  label, value, icon: Icon, accent, loading,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'gold' | 'forest' | 'cream' | 'terracotta'
  loading: boolean
}) {
  const accentClass = {
    gold: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30',
    forest: 'bg-[var(--forest)]/10 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/20',
    cream: 'bg-amber-700/10 text-amber-700 dark:text-amber-300 ring-amber-700/20',
    terracotta: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20',
  }[accent]
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="mt-1 truncate text-xl font-bold md:text-2xl">{value}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}
