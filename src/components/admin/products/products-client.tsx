'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Package,
  Plus,
  Search,
  Star,
  Zap,
  AlertTriangle,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Tag,
  Boxes,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
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
import { getProductVisual } from '@/lib/product-emoji'
import {
  PRODUCT_TYPES,
  productTypeLabel,
  productTypeEmoji,
  type ProductAdminDTO,
  type CategoryDTO,
} from '@/lib/admin-catalog'
import { formatBaht, formatNumber } from '@/lib/thai-date'
import { ProductFormDialog, type ProductFormValues } from './product-form-dialog'
import { ProductDetailSheet } from './product-detail-sheet'

type Branch = { id: string; name: string; isMain: boolean }

type Filters = {
  search: string
  categoryId: string
  type: string
  status: string
  best: boolean
  flash: boolean
}

type SortKey = 'name' | 'price' | 'sold' | 'stock' | 'updated'

const PAGE_SIZES = [10, 20, 50]

export function ProductsClient({
  categories,
  branches,
}: {
  categories: CategoryDTO[]
  branches: Branch[]
}) {
  const [products, setProducts] = React.useState<ProductAdminDTO[] | null>(null)
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
    categoryId: 'all',
    type: 'all',
    status: 'all',
    best: false,
    flash: false,
  })
  const [sortKey, setSortKey] = React.useState<SortKey>('sold')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  const [editing, setEditing] = React.useState<ProductAdminDTO | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [detail, setDetail] = React.useState<ProductAdminDTO | null>(null)
  const [deleting, setDeleting] = React.useState<ProductAdminDTO | null>(null)

  // Memoized so we don't re-run the find() on every render. The branches
  // prop is stable from the server component, but this is still a derived
  // value that other callbacks/handlers close over.
  const branch = React.useMemo(
    () => branches.find((b) => b.isMain) ?? branches[0],
    [branches]
  )

  const fetchProducts = React.useCallback(async (signal?: AbortSignal) => {
    setProducts(null)
    try {
      const sp = new URLSearchParams()
      if (filters.search) sp.set('search', filters.search)
      if (filters.categoryId !== 'all') sp.set('categoryId', filters.categoryId)
      if (filters.type !== 'all') sp.set('type', filters.type)
      if (filters.status !== 'all') sp.set('status', filters.status)
      if (filters.best) sp.set('best', '1')
      if (filters.flash) sp.set('flash', '1')
      const res = await fetch(`/api/admin/products?${sp.toString()}`, {
        cache: 'no-store',
        signal,
      })
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setProducts(data.products as ProductAdminDTO[])
    } catch (e) {
      // Ignore abort errors — they happen on rapid filter changes.
      if ((e as Error).name === 'AbortError') return
      console.error(e)
      toast.error('ดึงรายการสินค้าไม่สำเร็จ')
      setProducts([])
    }
  }, [filters])

  React.useEffect(() => {
    const ac = new AbortController()
    fetchProducts(ac.signal)
    return () => ac.abort()
  }, [fetchProducts])

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1)
  }, [filters, sortKey, sortDir, pageSize])

  const sorted = React.useMemo(() => {
    if (!products) return []
    const arr = [...products]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'th')
      else if (sortKey === 'price') cmp = a.price - b.price
      else if (sortKey === 'sold') cmp = a.soldCount - b.soldCount
      else if (sortKey === 'stock') cmp = a.totalStock - b.totalStock
      else if (sortKey === 'updated') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [products, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize)

  const stats = React.useMemo(() => {
    if (!products) return { total: 0, fresh: 0, flash: 0, low: 0 }
    return {
      total: products.length,
      fresh: products.filter((p) => p.type === 'FRESH').length,
      flash: products.filter((p) => p.isFlashSale).length,
      low: products.filter((p) => p.lowStock).length,
    }
  }, [products])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  async function handleSave(values: ProductFormValues, id?: string) {
    try {
      if (id) {
        const res = await fetch(`/api/admin/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => null)
          throw new Error(e?.error || 'อัปเดตไม่สำเร็จ')
        }
        toast.success(`อัปเดต "${values.name}" แล้ว`)
      } else {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => null)
          throw new Error(e?.error || 'สร้างไม่สำเร็จ')
        }
        toast.success(`สร้าง "${values.name}" แล้ว`)
      }
      setEditing(null)
      setCreating(false)
      fetchProducts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function handleDelete(p: ProductAdminDTO) {
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('ลบไม่สำเร็จ')
      toast.success(`ปิดการขาย "${p.name}" แล้ว (soft delete)`)
      setDeleting(null)
      if (detail?.id === p.id) setDetail(null)
      fetchProducts()
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
              <BreadcrumbPage>สินค้า & เมนู</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
              <Package className="h-6 w-6 text-[var(--gold)]" />
              สินค้า & เมนู
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              จัดการสินค้าและเมนูขนมไทย · {branch.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/inventory">
                <Boxes className="mr-1 h-4 w-4" />
                คลังสินค้า
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
              onClick={() => setCreating(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              เพิ่มสินค้า
            </Button>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="สินค้าทั้งหมด"
          value={stats.total}
          icon={Package}
          accent="gold"
          loading={!products}
        />
        <StatCard
          label="สินค้าสด"
          value={stats.fresh}
          icon={Star}
          accent="cream"
          loading={!products}
        />
        <StatCard
          label="แฟลชเซล"
          value={stats.flash}
          icon={Zap}
          accent="terracotta"
          loading={!products}
        />
        <Link href="/admin/inventory?status=low">
          <Card className="cursor-pointer border-red-500/30 transition-colors hover:border-red-500/50">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">สต็อกต่ำ</p>
                {products ? (
                  <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatNumber(stats.low)}
                  </p>
                ) : (
                  <Skeleton className="mt-1 h-7 w-12" />
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 ring-1 ring-red-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยชื่อ / SKU / บาร์โค้ด..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
              <Select
                value={filters.categoryId}
                onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue placeholder="หมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ''}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.type}
                onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="ประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger className="w-full lg:w-[130px]">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="active">เปิดขาย</SelectItem>
                  <SelectItem value="inactive">ปิดขาย</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t pt-3">
            <ToggleChip
              label="สินค้าขายดี"
              icon={Star}
              active={filters.best}
              onClick={() => setFilters((f) => ({ ...f, best: !f.best }))}
            />
            <ToggleChip
              label="แฟลชเซล"
              icon={Zap}
              active={filters.flash}
              onClick={() => setFilters((f) => ({ ...f, flash: !f.flash }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[60px]">รูป</TableHead>
                  <TableHead>
                    <SortButton label="ชื่อสินค้า" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                  </TableHead>
                  <TableHead className="hidden md:table-cell">SKU/บาร์โค้ด</TableHead>
                  <TableHead className="hidden lg:table-cell">หมวดหมู่</TableHead>
                  <TableHead className="hidden xl:table-cell">ประเภท</TableHead>
                  <TableHead className="text-right">
                    <SortButton label="ราคา" active={sortKey === 'price'} dir={sortDir} onClick={() => toggleSort('price')} align="right" />
                  </TableHead>
                  <TableHead className="hidden xl:table-cell text-right">ต้นทุน</TableHead>
                  <TableHead className="text-right">
                    <SortButton label="สต็อก" active={sortKey === 'stock'} dir={sortDir} onClick={() => toggleSort('stock')} align="right" />
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    <SortButton label="ขายแล้ว" active={sortKey === 'sold'} dir={sortDir} onClick={() => toggleSort('sold')} align="right" />
                  </TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products === null ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-10 rounded-lg" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-5 w-16" /></TableCell>
                      <TableCell className="hidden xl:table-cell"><Skeleton className="ml-auto h-5 w-14" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-5 w-14" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="ml-auto h-5 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-48 text-center">
                      <EmptyState
                        emoji="🍡"
                        title="ยังไม่มีสินค้าตามเงื่อนไข"
                        desc="ลองปรับตัวกรอง หรือเพิ่มสินค้าใหม่"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((p) => {
                    const visual = getProductVisual(p.slug, p.name, p.type)
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer focus-visible:bg-muted/40 focus-visible:outline-none"
                        onClick={() => setDetail(p)}
                        tabIndex={0}
                        role="button"
                        aria-label={`ดูรายละเอียดสินค้า ${p.name}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setDetail(p)
                          }
                        }}
                      >
                        <TableCell>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${visual.gradient} text-xl shadow-sm`}>
                            {visual.emoji}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium leading-tight">{p.name}</span>
                            {p.nameEn && (
                              <span className="text-xs text-muted-foreground">{p.nameEn}</span>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {p.isBestSeller && (
                                <Badge variant="outline" className="border-[var(--gold)]/40 bg-[var(--gold)]/10 px-1.5 py-0 text-[10px] text-[var(--gold)]">
                                  <Star className="mr-0.5 h-2.5 w-2.5 fill-current" />ขายดี
                                </Badge>
                              )}
                              {p.isFlashSale && (
                                <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 px-1.5 py-0 text-[10px] text-orange-600">
                                  <Zap className="mr-0.5 h-2.5 w-2.5 fill-current" />Flash
                                </Badge>
                              )}
                              {p.recipe && (
                                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600">
                                  <ChefHat className="mr-0.5 h-2.5 w-2.5" />มีสูตร
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{p.sku}</span>
                            {p.barcode && <span className="font-mono text-[10px] text-muted-foreground">{p.barcode}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {p.category && (
                            <Badge variant="secondary" className="font-normal">
                              {p.category.icon ? `${p.category.icon} ` : ''}
                              {p.category.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <span className="text-sm">
                            {productTypeEmoji(p.type)} {productTypeLabel(p.type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold">{formatBaht(p.price)}</span>
                            {p.memberPrice != null && (
                              <span className="text-[10px] text-muted-foreground">สมาชิก {formatBaht(p.memberPrice)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-right text-sm text-muted-foreground">
                          {formatBaht(p.costPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          <StockBadge qty={p.totalStock} low={p.lowStock} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right text-sm">
                          {formatNumber(p.soldCount)}
                        </TableCell>
                        <TableCell>
                          {p.isActive ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">เปิดขาย</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">ปิดขาย</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setDetail(p) }}
                              title="ดูรายละเอียด"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setEditing(p) }}
                              title="แก้ไข"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                              onClick={(e) => { e.stopPropagation(); setDeleting(p) }}
                              title="ปิดการขาย"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {products && sorted.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>แสดง</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger size="sm" className="h-7 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>รายการ · ทั้งหมด {formatNumber(sorted.length)} รายการ</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />ก่อนหน้า
                </Button>
                <span className="text-xs text-muted-foreground">
                  หน้า {formatNumber(page)} / {formatNumber(totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ถัดไป<ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {(creating || editing) && (
        <ProductFormDialog
          open
          onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}
          product={editing ?? undefined}
          categories={categories}
          onSubmit={handleSave}
        />
      )}

      {detail && (
        <ProductDetailSheet
          product={detail}
          open
          onOpenChange={(o) => { if (!o) setDetail(null) }}
          onEdit={(p) => { setDetail(null); setEditing(p) }}
          onDelete={(p) => { setDetail(null); setDeleting(p) }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ปิดการขายสินค้านี้?</AlertDialogTitle>
            <AlertDialogDescription>
              สินค้า "{deleting?.name}" จะถูกตั้งค่าเป็น "ปิดขาย" (soft delete) — ยังคงเก็บประวัติการขายไว้
              และสามารถเปิดขายอีกครั้งได้ในภายหลัง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleting && handleDelete(deleting)}
            >
              ปิดการขาย
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------- Sub-components ----------------

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string
  value: number
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
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-12" />
          ) : (
            <p className="mt-1 text-2xl font-bold">{formatNumber(value)}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function ToggleChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <Switch checked={active} className="scale-75" />
    </button>
  )
}

function SortButton({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-medium hover:text-foreground ${
        align === 'right' ? 'flex-row-reverse' : ''
      } ${active ? 'text-[var(--gold)]' : 'text-muted-foreground'}`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-50'}`} />
    </button>
  )
}

function StockBadge({ qty, low }: { qty: number; low: boolean }) {
  if (qty <= 0) {
    return <span className="font-semibold text-red-600 dark:text-red-400">หมด</span>
  }
  if (low) {
    return <span className="font-semibold text-orange-600 dark:text-orange-400">{formatNumber(qty)}</span>
  }
  return <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatNumber(qty)}</span>
}

function EmptyState({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold)]/10 text-4xl">
        {emoji}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  )
}
