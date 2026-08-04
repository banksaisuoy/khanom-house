'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Pencil,
  Trash2,
  ChefHat,
  Star,
  Zap,
  Snowflake,
  Clock,
  Barcode,
  Tag as TagIcon,
  TrendingUp,
  Warehouse,
  ChevronRight,
} from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { getProductVisual } from '@/lib/product-emoji'
import {
  productTypeLabel,
  productTypeEmoji,
  type ProductAdminDTO,
} from '@/lib/admin-catalog'
import { formatBaht, formatNumber, formatThaiDateTime } from '@/lib/thai-date'

type Props = {
  product: ProductAdminDTO
  open: boolean
  onOpenChange: (o: boolean) => void
  onEdit: (p: ProductAdminDTO) => void
  onDelete: (p: ProductAdminDTO) => void
}

type SparkPoint = { date: string; qty: number; revenue: number }

export function ProductDetailSheet({ product, open, onOpenChange, onEdit, onDelete }: Props) {
  const [full, setFull] = React.useState<ProductAdminDTO | null>(null)
  const [spark, setSpark] = React.useState<SparkPoint[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open || !product) return
    let active = true
    setLoading(true)
    setFull(null)
    fetch(`/api/admin/products/${product.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        if (d.product) setFull(d.product)
        if (Array.isArray(d.salesSparkline)) setSpark(d.salesSparkline)
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, product])

  const visual = getProductVisual(product.slug, product.name, product.type)
  const shown = full ?? product

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl md:max-w-2xl">
        <SheetHeader className="space-y-0 border-b bg-muted/30 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${visual.gradient} text-3xl shadow-sm`}>
              {visual.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg leading-tight">{shown.name}</SheetTitle>
              {shown.nameEn && (
                <SheetDescription className="truncate">{shown.nameEn}</SheetDescription>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <Badge variant="secondary" className="font-normal">
                  {productTypeEmoji(shown.type)} {productTypeLabel(shown.type)}
                </Badge>
                {shown.category && (
                  <Badge variant="outline" className="font-normal">
                    {shown.category.icon} {shown.category.name}
                  </Badge>
                )}
                {shown.isBestSeller && (
                  <Badge className="bg-[var(--gold)]/15 text-[var(--gold)] hover:bg-[var(--gold)]/15">
                    <Star className="mr-1 h-3 w-3 fill-current" />ขายดี
                  </Badge>
                )}
                {shown.isFlashSale && (
                  <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/15">
                    <Zap className="mr-1 h-3 w-3 fill-current" />Flash Sale
                  </Badge>
                )}
                {shown.isActive ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">เปิดขาย</Badge>
                ) : (
                  <Badge variant="secondary">ปิดขาย</Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-6 py-5">
            {/* Pricing tiers */}
            <section>
              <SectionTitle icon={TrendingUp} title="ราคาและต้นทุน" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <PriceCell label="ราคาขาย" value={formatBaht(shown.price)} highlight />
                <PriceCell label="สมาชิก" value={shown.memberPrice != null ? formatBaht(shown.memberPrice) : '-'} />
                <PriceCell label="ราคาส่ง" value={shown.wholesalePrice != null ? formatBaht(shown.wholesalePrice) : '-'} />
                <PriceCell label="ต้นทุน" value={formatBaht(shown.costPrice)} muted />
              </div>
              {shown.costPrice > 0 && shown.price > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  กำไรขั้นต้น {formatBaht(shown.price - shown.costPrice)} (margin {((1 - shown.costPrice / shown.price) * 100).toFixed(0)}%)
                </p>
              )}
              {shown.isFlashSale && shown.flashSalePrice != null && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2 text-sm">
                  <Zap className="h-4 w-4 text-orange-600" />
                  <span>แฟลชเซล <strong className="text-orange-700 dark:text-orange-400">{formatBaht(shown.flashSalePrice)}</strong></span>
                  {shown.flashSaleEndAt && (
                    <span className="text-xs text-muted-foreground">
                      · สิ้นสุด {formatThaiDateTime(new Date(shown.flashSaleEndAt))}
                    </span>
                  )}
                  {shown.flashSaleStock != null && (
                    <span className="ml-auto text-xs text-muted-foreground">คงเหลือ {formatNumber(shown.flashSaleStock)} ชิ้น</span>
                  )}
                </div>
              )}
            </section>

            {/* Codes */}
            <section>
              <SectionTitle icon={Barcode} title="รหัสสินค้า" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <KV label="SKU" value={<span className="font-mono">{shown.sku}</span>} />
                <KV label="บาร์โค้ด" value={<span className="font-mono">{shown.barcode ?? '-'}</span>} />
                <KV label="หน่วย" value={shown.unit} />
                <KV label="รหัสสินค้า" value={<span className="font-mono text-xs">{shown.id.slice(-8)}</span>} />
              </div>
            </section>

            {/* Description */}
            {shown.description && (
              <section>
                <SectionTitle icon={TagIcon} title="รายละเอียด" />
                <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                  {shown.description}
                </p>
              </section>
            )}

            {/* Tags */}
            {shown.tags.length > 0 && (
              <section>
                <SectionTitle icon={TagIcon} title="แท็ก" />
                <div className="flex flex-wrap gap-1.5">
                  {shown.tags.map((t, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">{t}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Storage */}
            <section>
              <SectionTitle icon={Snowflake} title="การเก็บรักษา" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <KV label="อายุการเก็บรักษา" value={shown.shelfLifeHours != null ? `${formatNumber(shown.shelfLifeHours)} ชม.` : '-'} />
                <KV label="ตู้เย็น" value={shown.needsRefrigeration ? 'จำเป็น' : 'ไม่จำเป็น'} />
              </div>
            </section>

            {/* Sales sparkline */}
            <section>
              <SectionTitle icon={TrendingUp} title="ยอดขาย 7 วันล่าสุด" />
              <div className="rounded-lg border bg-card p-3">
                {loading ? (
                  <Skeleton className="h-20 w-full" />
                ) : spark.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มียอดขายในช่วง 7 วันล่าสุด</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={80}>
                      <AreaChart data={spark} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                          <linearGradient id="sparkGold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <YAxis hide domain={['dataMin', 'dataMax']} />
                        <Tooltip
                          contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          labelFormatter={(l) => `วันที่ ${String(l).slice(5)}`}
                          formatter={(v: number, n) => [n === 'revenue' ? `${formatBaht(v)}` : `${formatNumber(v)} ชิ้น`, n === 'revenue' ? 'ยอดขาย' : 'จำนวน']}
                        />
                        <Area type="monotone" dataKey="qty" stroke="var(--gold)" strokeWidth={2} fill="url(#sparkGold)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>รวม {formatNumber(spark.reduce((s, p) => s + p.qty, 0))} ชิ้น</span>
                      <span>ยอด {formatBaht(spark.reduce((s, p) => s + p.revenue, 0))}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Recipe link */}
            <section>
              <SectionTitle icon={ChefHat} title="สูตรผลิต / BOM" />
              {shown.recipe ? (
                <Link
                  href={`/admin/recipes?productId=${shown.id}`}
                  className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 transition-colors hover:bg-emerald-500/10"
                >
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium">มีสูตรผลิตอยู่แล้ว</p>
                      <p className="text-xs text-muted-foreground">
                        ผลผลิต {formatNumber(shown.recipe.yieldQty)} {shown.recipe.yieldUnit} ต่อสูตร
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ) : (
                <Link
                  href={`/admin/recipes?newProduct=${shown.id}`}
                  className="flex items-center justify-between rounded-lg border border-dashed border-[var(--gold)]/40 bg-[var(--gold)]/5 p-3 transition-colors hover:bg-[var(--gold)]/10"
                >
                  <div>
                    <p className="text-sm font-medium">ยังไม่มีสูตรผลิต</p>
                    <p className="text-xs text-muted-foreground">คลิกเพื่อสร้างสูตรสำหรับสินค้านี้</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--gold)]" />
                </Link>
              )}
            </section>

            {/* Inventory per branch */}
            <section>
              <SectionTitle icon={Warehouse} title="สต็อกตามสาขา" />
              <div className="space-y-2">
                {shown.inventory.length === 0 ? (
                  <p className="rounded-lg border border-dashed bg-muted/20 p-3 text-center text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลสต็อก
                  </p>
                ) : (
                  shown.inventory.map((inv) => {
                    const pct = inv.reorderPoint > 0 ? Math.min(100, (inv.quantity / (inv.reorderPoint * 2)) * 100) : 100
                    const barColor = inv.quantity <= 0 ? 'bg-red-500' : inv.quantity <= inv.reorderPoint ? 'bg-orange-500' : 'bg-emerald-500'
                    return (
                      <div key={inv.id} className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{inv.branchName}</p>
                            <p className="text-xs text-muted-foreground">
                              {inv.type === 'FINISHED' ? 'สำเร็จรูป' : inv.type === 'RAW' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์'}
                              {inv.batchNo && ` · แบตช์ ${inv.batchNo}`}
                              {inv.location && ` · ${inv.location}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${inv.quantity <= 0 ? 'text-red-600' : inv.quantity <= inv.reorderPoint ? 'text-orange-600' : 'text-emerald-600'}`}>
                              {formatNumber(inv.quantity)} <span className="text-xs font-normal text-muted-foreground">{inv.unit}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              สั่งซื้อ @ {formatNumber(inv.reorderPoint)} · ขั้นต่ำ {formatNumber(inv.safetyStock)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        {inv.expiryAt && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            หมดอายุ {formatThaiDateTime(new Date(inv.expiryAt))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            {/* Metadata */}
            <Separator />
            <section className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              <KV label="ขายแล้ว" value={`${formatNumber(shown.soldCount)} ชิ้น`} />
              <KV label="คะแนนรีวิว" value={`${shown.rating.toFixed(1)} ★ (${formatNumber(shown.reviewCount)})`} />
              <KV label="สร้างเมื่อ" value={formatThaiDateTime(new Date(shown.createdAt))} />
              <KV label="อัปเดต" value={formatThaiDateTime(new Date(shown.updatedAt))} />
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="flex-row gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-500/10 hover:text-red-700"
            onClick={() => onDelete(shown)}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            ปิดการขาย
          </Button>
          <Button
            className="ml-auto bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
            onClick={() => onEdit(shown)}
          >
            <Pencil className="mr-1 h-4 w-4" />
            แก้ไข
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--gold)]">
      <Icon className="h-4 w-4" />
      {title}
    </div>
  )
}

function PriceCell({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${highlight ? 'text-[var(--forest)] dark:text-[var(--gold)]' : muted ? 'text-muted-foreground' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  )
}
