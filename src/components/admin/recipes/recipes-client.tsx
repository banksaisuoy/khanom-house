'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ChefHat,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  TrendingUp,
  AlertCircle,
  Search,
} from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
import { getProductVisual } from '@/lib/product-emoji'
import {
  productTypeLabel,
  productTypeEmoji,
  type RecipeDTO,
} from '@/lib/admin-catalog'
import { formatBaht, formatNumber } from '@/lib/thai-date'
import { RecipeFormDialog } from './recipe-form-dialog'

type ProductLite = { id: string; name: string; slug: string; type: string; unit: string }

type LoadResult = {
  recipes: RecipeDTO[]
  productsWithoutRecipe: ProductLite[]
  ingredientNames: string[]
}

export function RecipesClient() {
  const sp = useSearchParams()
  const initialProductId = sp.get('productId') || sp.get('newProduct') || ''

  const [data, setData] = React.useState<LoadResult | null>(null)
  const [view, setView] = React.useState<'grid' | 'table'>('grid')
  const [search, setSearch] = React.useState('')
  const [editing, setEditing] = React.useState<RecipeDTO | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [initialProduct, setInitialProduct] = React.useState<ProductLite | null>(null)

  const load = React.useCallback(async () => {
    setData(null)
    try {
      const res = await fetch('/api/admin/recipes', { cache: 'no-store' })
      if (!res.ok) throw new Error('fetch failed')
      const d = (await res.json()) as LoadResult
      setData(d)
    } catch (e) {
      console.error(e)
      toast.error('ดึงข้อมูลสูตรไม่สำเร็จ')
      setData({ recipes: [], productsWithoutRecipe: [], ingredientNames: [] })
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  // Open create dialog if ?newProduct=ID was provided
  React.useEffect(() => {
    if (!data || !initialProductId || creating) return
    const p = data.productsWithoutRecipe.find((x) => x.id === initialProductId)
    if (p) {
      setInitialProduct(p)
      setCreating(true)
    }
  }, [data, initialProductId, creating])

  const filtered = React.useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data.recipes
    const s = search.toLowerCase()
    return data.recipes.filter(
      (r) => r.productName.toLowerCase().includes(s) || r.items.some((it) => it.ingredientName.toLowerCase().includes(s))
    )
  }, [data, search])

  const stats = React.useMemo(() => {
    if (!data) return { total: 0, avgCost: 0, noRecipe: 0 }
    const total = data.recipes.length
    const sumCost = data.recipes.reduce((s, r) => s + r.costPerUnit, 0)
    const avgCost = total > 0 ? sumCost / total : 0
    return { total, avgCost, noRecipe: data.productsWithoutRecipe.length }
  }, [data])

  // chart data: cost per unit by recipe (top 8)
  const chartData = React.useMemo(() => {
    if (!data) return []
    return [...data.recipes]
      .sort((a, b) => b.costPerUnit - a.costPerUnit)
      .slice(0, 8)
      .map((r) => ({ name: r.productName.length > 12 ? r.productName.slice(0, 12) + '…' : r.productName, cost: Math.round(r.costPerUnit), fullName: r.productName }))
  }, [data])

  function openCreateFor(productId?: string) {
    if (productId) {
      const p = data?.productsWithoutRecipe.find((x) => x.id === productId) ?? null
      setInitialProduct(p)
    } else {
      setInitialProduct(null)
    }
    setCreating(true)
  }

  function handleDone() {
    setCreating(false)
    setEditing(null)
    setInitialProduct(null)
    load()
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
              <BreadcrumbPage>สูตรผลิต / BOM</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
              <ChefHat className="h-6 w-6 text-[var(--gold)]" />
              สูตรผลิต / BOM
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              สูตรการผลิตและต้นทุนวัตถุดิบต่อหน่วย · Recipe-to-Product 1:1
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
            onClick={() => openCreateFor()}
            disabled={!data}
          >
            <Plus className="mr-1 h-4 w-4" />
            สร้างสูตรใหม่
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">สูตรทั้งหมด</p>
              {data ? (
                <p className="mt-1 text-2xl font-bold">{formatNumber(stats.total)}</p>
              ) : (
                <Skeleton className="mt-1 h-7 w-12" />
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
              <ChefHat className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">ต้นทุนเฉลี่ย / หน่วย</p>
              {data ? (
                <p className="mt-1 text-2xl font-bold text-[var(--forest)] dark:text-[var(--gold)]">
                  {formatBaht(stats.avgCost)}
                </p>
              ) : (
                <Skeleton className="mt-1 h-7 w-20" />
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <button
          type="button"
          onClick={() => openCreateFor()}
          disabled={!data || data.productsWithoutRecipe.length === 0}
          className="text-left disabled:opacity-50"
        >
          <Card className="h-full transition-colors hover:border-[var(--gold)]/40">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">สินค้ายังไม่มีสูตร</p>
                {data ? (
                  <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{formatNumber(stats.noRecipe)}</p>
                ) : (
                  <Skeleton className="mt-1 h-7 w-12" />
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground">คลิกเพื่อสร้างสูตร →</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20">
                <AlertCircle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Yield vs Cost chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--gold)]">
                <TrendingUp className="h-4 w-4" />
                ต้นทุน / หน่วยเทียบสูตร (8 อันดับแรก)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `฿${v}`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--foreground)' }} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatBaht(v), 'ต้นทุน/หน่วย']}
                  labelFormatter={(_l, p) => (p?.[0]?.payload?.fullName as string) ?? ''}
                />
                <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Toolbar: search + view toggle */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสูตร / วัตถุดิบ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as 'grid' | 'table')}>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="mr-1 h-4 w-4" />
              การ์ด
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view">
              <TableIcon className="mr-1 h-4 w-4" />
              ตาราง
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      {/* Content */}
      {!data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold)]/10 text-4xl">
                🍳
              </div>
              <div>
                <p className="font-semibold">ยังไม่มีสูตรตามเงื่อนไข</p>
                <p className="text-sm text-muted-foreground">
                  {data.productsWithoutRecipe.length > 0
                    ? `มีสินค้า ${formatNumber(data.productsWithoutRecipe.length)} รายการที่ยังไม่มีสูตร — สร้างเลย!`
                    : 'ทุกสินค้ามีสูตรผลิตแล้ว 🎉'}
                </p>
              </div>
              {data.productsWithoutRecipe.length > 0 && (
                <Button
                  size="sm"
                  className="mt-2 bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
                  onClick={() => openCreateFor()}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  สร้างสูตรแรก
                </Button>
              )}
            </motion.div>
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => setEditing(r)} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="hidden md:table-cell">ประเภท</TableHead>
                    <TableHead className="text-right">ผลผลิต</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">วัตถุดิบ</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">เวลาเตรียม+ทำ</TableHead>
                    <TableHead className="text-right">ต้นทุน/หน่วย</TableHead>
                    <TableHead className="text-right">ต้นทุนรวม/สูตร</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const visual = getProductVisual(r.productSlug ?? undefined, r.productName, r.productType ?? undefined)
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer focus-visible:bg-muted/40 focus-visible:outline-none"
                        onClick={() => setEditing(r)}
                        tabIndex={0}
                        role="button"
                        aria-label={`แก้ไขสูตร ${r.productName}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setEditing(r)
                          }
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${visual.gradient} text-lg shadow-sm`}>
                              {visual.emoji}
                            </div>
                            <span className="font-medium">{r.productName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="font-normal">
                            {productTypeEmoji(r.productType ?? '')} {productTypeLabel(r.productType ?? '')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatNumber(r.yieldQty)} {r.yieldUnit}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-sm">
                          {formatNumber(r.items.length)} รายการ
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right text-sm text-muted-foreground">
                          {formatNumber(r.prepTimeMin)}+{formatNumber(r.cookTimeMin)} นาที
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[var(--forest)] dark:text-[var(--gold)]">
                          {formatBaht(r.costPerUnit)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatBaht(r.totalCost)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      {(creating || editing) && (
        <RecipeFormDialog
          open
          onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); setInitialProduct(null) } }}
          recipe={editing ?? undefined}
          productsWithoutRecipe={data?.productsWithoutRecipe ?? []}
          ingredientNames={data?.ingredientNames ?? []}
          initialProduct={initialProduct ?? undefined}
          onDone={handleDone}
        />
      )}
    </div>
  )
}

function RecipeCard({ recipe, onClick }: { recipe: RecipeDTO; onClick: () => void }) {
  const visual = getProductVisual(recipe.productSlug ?? undefined, recipe.productName, recipe.productType ?? undefined)
  // cost breakdown mini bar: top 4 ingredients by cost
  const topItems = [...recipe.items].sort((a, b) => b.lineCost - a.lineCost).slice(0, 4)
  const maxCost = Math.max(...topItems.map((i) => i.lineCost), 1)
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="text-left"
    >
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className={`flex items-center gap-3 bg-gradient-to-r ${visual.gradient} px-4 py-3`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/60 text-2xl shadow-sm backdrop-blur">
            {visual.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--forest)]">{recipe.productName}</p>
            <p className="text-xs text-[var(--forest)]/70">
              {productTypeLabel(recipe.productType ?? '')} · ผลผลิต {formatNumber(recipe.yieldQty)} {recipe.yieldUnit}
            </p>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-1 text-right backdrop-blur">
            <p className="text-[10px] text-[var(--forest)]/70">ต้นทุน/หน่วย</p>
            <p className="text-sm font-bold text-[var(--forest)]">{formatBaht(recipe.costPerUnit)}</p>
          </div>
        </div>
        <CardContent className="space-y-3 p-4">
          {/* times */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              เตรียม {formatNumber(recipe.prepTimeMin)} นาที
            </span>
            <span className="flex items-center gap-1">
              <ChefHat className="h-3 w-3" />
              ทำ {formatNumber(recipe.cookTimeMin)} นาที
            </span>
            <span className="ml-auto">{formatNumber(recipe.items.length)} วัตถุดิบ</span>
          </div>

          {/* cost breakdown mini bars */}
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              ต้นทุนวัตถุดิบ (สูงสุด 4)
            </p>
            <div className="space-y-1">
              {topItems.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-xs">{it.ingredientName}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-amber-600"
                      style={{ width: `${(it.lineCost / maxCost) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs font-medium text-muted-foreground">
                    {formatBaht(it.lineCost)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-xs text-muted-foreground">ต้นทุนรวม / สูตร</span>
            <span className="text-sm font-bold">{formatBaht(recipe.totalCost)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.button>
  )
}
