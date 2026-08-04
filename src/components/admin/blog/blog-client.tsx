'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText, Plus, Pencil, Trash2, Eye, EyeOff, Globe, TrendingUp, Save,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  AdminPageHeader,
  AdminKpiStrip,
  AdminMiniStat,
  AdminEmptyState,
} from '@/components/admin/admin-page-utils'
import { BlogFormDialog, type BlogFormValues } from './blog-form-dialog'
import { formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type BlogRow = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverEmoji: string
  category: 'article' | 'recipe' | 'news' | 'tips'
  tags: string[]
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  viewCount: number
  authorId: string | null
  authorName: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

const CATEGORY_CONFIG: Record<string, { label: string; cls: string }> = {
  article: { label: 'บทความ', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  recipe: { label: 'สูตรขนม', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  news: { label: 'ข่าวสาร', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  tips: { label: 'เคล็ดลับ', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/30' },
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'ร่าง', cls: 'bg-muted text-muted-foreground ring-border' },
  PUBLISHED: { label: 'เผยแพร่', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  ARCHIVED: { label: 'เก็บถาว', cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30' },
}

export function BlogClient({ initialPosts }: { initialPosts: BlogRow[] }) {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Partial<BlogFormValues> & { id?: string } | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = React.useState<BlogRow | null>(null)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('ALL')

  const { data, isLoading } = useQuery<{ posts: BlogRow[] }>({
    queryKey: ['admin-blog'],
    queryFn: async () => {
      const r = await fetch('/api/admin/blog')
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: { posts: initialPosts },
  })

  const posts = data?.posts ?? []

  const filtered = React.useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [posts, statusFilter, categoryFilter, search])

  const stats = React.useMemo(() => {
    return {
      total: posts.length,
      published: posts.filter((p) => p.status === 'PUBLISHED').length,
      draft: posts.filter((p) => p.status === 'DRAFT').length,
      totalViews: posts.reduce((s, p) => s + p.viewCount, 0),
    }
  }, [posts])

  const openCreate = () => {
    setEditTarget(undefined)
    setFormOpen(true)
  }
  const openEdit = (p: BlogRow) => {
    setEditTarget({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      coverEmoji: p.coverEmoji,
      category: p.category,
      tags: p.tags,
      status: p.status,
    })
    setFormOpen(true)
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-blog'] })

  const togglePublish = async (p: BlogRow) => {
    const newStatus = p.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      const r = await fetch(`/api/admin/blog/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!r.ok) throw new Error('อัปเดตไม่สำเร็จ')
      toast.success(newStatus === 'PUBLISHED' ? 'เผยแพร่บทความแล้ว' : 'เปลี่ยนเป็นร่างแล้ว')
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const r = await fetch(`/api/admin/blog/${deleteTarget.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('ลบไม่สำเร็จ')
      toast.success('ลบบทความแล้ว')
      setDeleteTarget(null)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="บทความ & Blog"
        subtitle="จัดการเนื้อหา บทความ สูตรขนม ข่าวสาร และเคล็ดลับ"
        icon={FileText}
        actions={
          <Button
            size="sm"
            onClick={openCreate}
            className="gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]"
          >
            <Plus className="h-4 w-4" /> เขียนบทความ
          </Button>
        }
      />

      <AdminKpiStrip>
        <AdminMiniStat label="บทความทั้งหมด" value={toThaiNumerals(stats.total)} icon={FileText} accent="gold" />
        <AdminMiniStat label="เผยแพร่แล้ว" value={toThaiNumerals(stats.published)} icon={Globe} accent="forest" />
        <AdminMiniStat label="ร่าง" value={toThaiNumerals(stats.draft)} icon={Save} accent="amber" />
        <AdminMiniStat label="ยอดเข้าชมรวม" value={toThaiNumerals(stats.totalViews)} icon={TrendingUp} accent="teal" />
      </AdminKpiStrip>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="ค้นหาบทความ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกสถานะ</SelectItem>
            <SelectItem value="DRAFT">ร่าง</SelectItem>
            <SelectItem value="PUBLISHED">เผยแพร่</SelectItem>
            <SelectItem value="ARCHIVED">เก็บถาวร์</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="หมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกหมวด</SelectItem>
            <SelectItem value="article">บทความ</SelectItem>
            <SelectItem value="recipe">สูตรขนม</SelectItem>
            <SelectItem value="news">ข่าวสาร</SelectItem>
            <SelectItem value="tips">เคล็ดลับ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={FileText}
          title="ยังไม่มีบทความ"
          description="คลิก 'เขียนบทความ' เพื่อเริ่มสร้างเนื้อหา"
          action={
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> เขียนบทความ
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">บทความ</th>
                  <th className="px-3 py-2.5 text-left font-medium">หมวดหมู่</th>
                  <th className="px-3 py-2.5 text-center font-medium">สถานะ</th>
                  <th className="px-3 py-2.5 text-right font-medium">เข้าชม</th>
                  <th className="px-3 py-2.5 text-left font-medium">วันที่เผยแพร่</th>
                  <th className="px-3 py-2.5 text-left font-medium">ผู้เขียน</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const cat = CATEGORY_CONFIG[p.category] ?? CATEGORY_CONFIG.article
                  const st = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="border-t hover:bg-muted/30"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-lg ring-1 ring-[var(--gold)]/20">
                            {p.coverEmoji}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.title}</p>
                            <p className="truncate text-[11px] text-muted-foreground">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge className={cn('text-[9px] ring-1 ring-inset', cat.cls)}>
                          {cat.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge className={cn('text-[9px] ring-1 ring-inset', st.cls)}>
                          {st.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-semibold">{toThaiNumerals(p.viewCount)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {p.publishedAt ? formatThaiDate(new Date(p.publishedAt), { short: true }) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.authorName}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === 'PUBLISHED' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="ดูบนเว็บ"
                              asChild
                            >
                              <Link href={`/blog/${p.slug}`} target="_blank">
                                <Globe className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title={p.status === 'PUBLISHED' ? 'ยกเลิกเผยแพร่' : 'เผยแพร่'}
                            onClick={() => togglePublish(p)}
                          >
                            {p.status === 'PUBLISHED' ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="แก้ไข"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            title="ลบ"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BlogFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        onSaved={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบบทความ "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบนี้ไม่สามารถยกเลิกได้ บทความและยอดเข้าชมทั้งหมดจะถูกลบออกจากระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
