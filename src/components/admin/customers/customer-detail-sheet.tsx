'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Crown, Phone, Mail, Cake, Wallet, ShoppingBag, Star, Gift, MessageSquare,
  Trophy, TrendingUp, Calendar, Sparkles, Coins,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatBaht, formatThaiDate, formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'
import { tierConfig, loyaltyTypeConfig, orderStatusConfig, avatarInitials } from '@/lib/admin-ui'
import { cn } from '@/lib/utils'
import { LoyaltyAdjustDialog } from './loyalty-adjust-dialog'
import { CustomerFormDialog, type CustomerFormValues } from './customer-form-dialog'
import { StoreCreditAdjustDialog } from './store-credit-adjust-dialog'

export type CustomerListItem = {
  id: string
  name: string
  phone: string
  email: string | null
  tier: string
  points: number
  totalSpent: number
  visitCount: number
  birthday: string | null
  notes: string | null
  createdAt: string
  lastOrder: { id: string; orderNo: string; total: number; createdAt: string; status: string } | null
}

type LoyaltyLog = {
  id: string
  type: string
  points: number
  reason: string
  orderId: string | null
  createdAt: string
}
type OrderRow = {
  id: string
  orderNo: string
  total: number
  status: string
  channel: string
  createdAt: string
  items: { productId: string; name: string; quantity: number; total: number }[]
}

type StoreCreditRow = {
  id: string
  type: string
  amount: number
  balance: number
  reason: string
  expiresAt: string | null
  userId: string | null
  userName: string | null
  createdAt: string
}

type Customer360 = CustomerListItem & {
  orders: OrderRow[]
  loyaltyLogs: LoyaltyLog[]
  favorite: { productId: string; name: string; qty: number; spent: number } | null
  stats: { totalSpent: number; visitCount: number; avgBasket: number; orderCount: number }
}

export function CustomerDetailSheet({
  customer, open, onOpenChange, onChanged,
}: {
  customer: CustomerListItem | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onChanged: () => void
}) {
  const [data, setData] = React.useState<Customer360 | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [adjustOpen, setAdjustOpen] = React.useState(false)
  const [creditOpen, setCreditOpen] = React.useState(false)
  const [creditBalance, setCreditBalance] = React.useState<number | null>(null)
  const [creditHistory, setCreditHistory] = React.useState<StoreCreditRow[]>([])
  const [creditLoading, setCreditLoading] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Partial<CustomerFormValues> & { id?: string } | undefined>(undefined)

  React.useEffect(() => {
    if (open && customer) {
      setLoading(true)
      setData(null)
      fetch(`/api/admin/customers/${customer.id}`)
        .then((r) => r.json())
        .then((j) => setData(j))
        .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
        .finally(() => setLoading(false))
      // Also fetch store credit
      setCreditLoading(true)
      fetch(`/api/admin/customers/${customer.id}/credit`)
        .then((r) => r.json())
        .then((j) => {
          setCreditBalance(j.balance ?? 0)
          setCreditHistory(j.history ?? [])
        })
        .catch(() => {
          setCreditBalance(null)
          setCreditHistory([])
        })
        .finally(() => setCreditLoading(false))
    }
  }, [open, customer?.id])

  if (!customer) return null
  const tier = tierConfig(customer.tier)

  const refresh = async () => {
    const r = await fetch(`/api/admin/customers/${customer.id}`)
    if (r.ok) {
      const j = await r.json()
      setData(j)
    }
    // Also refresh store credit
    const cr = await fetch(`/api/admin/customers/${customer.id}/credit`)
    if (cr.ok) {
      const cj = await cr.json()
      setCreditBalance(cj.balance ?? 0)
      setCreditHistory(cj.history ?? [])
    }
    onChanged()
  }

  const openEdit = () => {
    setEditTarget({
      id: customer.id, name: customer.name, phone: customer.phone,
      email: customer.email ?? '', tier: customer.tier, points: customer.points,
      birthday: customer.birthday ?? '', notes: customer.notes ?? '',
    })
    setEditOpen(true)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-2xl">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-[var(--gold)]/30">
                <AvatarFallback className={cn('font-bold', tier.cls)}>
                  {avatarInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-lg">{customer.name}</SheetTitle>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <Badge className={cn('gap-1 ring-1 ring-inset', tier.cls)}>
                    {customer.tier === 'VIP' && <Crown className="h-3 w-3" />}
                    {tier.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    แต้ม {toThaiNumerals(customer.points)} · สมาชิกตั้งแต่ {formatThaiDate(new Date(customer.createdAt), { short: true })}
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          {loading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : data ? (
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="orders" className="flex h-full flex-col">
                <div className="border-b px-4 pt-3">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="orders" className="text-xs">ออเดอร์</TabsTrigger>
                    <TabsTrigger value="loyalty" className="text-xs">ประวัติแต้ม</TabsTrigger>
                    <TabsTrigger value="credit" className="text-xs">เครดิตร้าน</TabsTrigger>
                    <TabsTrigger value="info" className="text-xs">ข้อมูล</TabsTrigger>
                    <TabsTrigger value="marketing" className="text-xs">การตลาด</TabsTrigger>
                  </TabsList>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {/* Stats overview */}
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Stat icon={Wallet} label="ยอดซื้อรวม" value={formatBaht(data.stats.totalSpent)} accent="gold" />
                      <Stat icon={ShoppingBag} label="เข้ามาแล้ว" value={`${toThaiNumerals(data.stats.visitCount)} ครั้ง`} accent="forest" />
                      <Stat icon={TrendingUp} label="ยอดเฉลี่ย/ครั้ง" value={formatBaht(data.stats.avgBasket)} accent="teal" />
                      <Stat icon={Star} label="สินค้าโปรด" value={data.favorite?.name ?? '—'} accent="amber" />
                    </div>

                    <TabsContent value="orders" className="mt-0 space-y-2">
                      {data.orders.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีประวัติออเดอร์</p>
                      ) : (
                        data.orders.map((o) => {
                          const cfg = orderStatusConfig(o.status)
                          return (
                            <div key={o.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-sm">{o.orderNo}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatThaiDateTime(new Date(o.createdAt))}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm">{formatBaht(o.total)}</p>
                                  <Badge className={cn('text-[9px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                                </div>
                              </div>
                              {o.items.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {o.items.slice(0, 4).map((it, i) => (
                                    <span key={i} className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px]">
                                      {it.name} ×{toThaiNumerals(it.quantity)}
                                    </span>
                                  ))}
                                  {o.items.length > 4 && (
                                    <span className="text-[10px] text-muted-foreground">+{toThaiNumerals(o.items.length - 4)}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </TabsContent>

                    <TabsContent value="loyalty" className="mt-0 space-y-2">
                      {data.loyaltyLogs.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีประวัติแต้ม</p>
                      ) : (
                        <div className="relative space-y-3 pl-4">
                          <div className="absolute bottom-2 left-1.5 top-2 w-px bg-border" />
                          {data.loyaltyLogs.map((l) => {
                            const cfg = loyaltyTypeConfig(l.type)
                            const isAdd = l.type === 'EARN' || l.type === 'BONUS'
                            return (
                              <div key={l.id} className="relative">
                                <span className={cn('absolute -left-2.5 top-1 h-2 w-2 rounded-full', isAdd ? 'bg-emerald-500' : 'bg-red-500')} />
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <Badge className={cn('text-[9px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                                      <span className="text-xs text-muted-foreground">{formatThaiDateTime(new Date(l.createdAt))}</span>
                                    </div>
                                    <p className="mt-0.5 text-sm">{l.reason}</p>
                                  </div>
                                  <span className={cn('text-sm font-bold', isAdd ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                    {isAdd ? '+' : '−'}{toThaiNumerals(l.points)}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="credit" className="mt-0 space-y-3">
                      <div className="rounded-xl bg-gradient-to-br from-[var(--forest)] to-[var(--forest)]/85 p-4 text-center text-[var(--gold)]">
                        <Coins className="mx-auto h-6 w-6" />
                        <p className="mt-1 text-[10px] uppercase tracking-wider opacity-80">เครดิตร้านคงเหลือ</p>
                        {creditLoading ? (
                          <p className="mt-1 text-2xl font-bold">—</p>
                        ) : creditBalance === null ? (
                          <p className="mt-1 text-sm">ไม่สามารถโหลดได้</p>
                        ) : (
                          <p className="mt-1 text-2xl font-bold">{formatBaht(creditBalance)}</p>
                        )}
                        <Button
                          size="sm"
                          className="mt-3 bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90"
                          onClick={() => setCreditOpen(true)}
                        >
                          <Coins className="mr-1 h-3.5 w-3.5" /> ปรับเครดิต
                        </Button>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] uppercase text-muted-foreground">ประวัติเครดิตล่าสุด</p>
                        {creditLoading ? (
                          <Skeleton className="h-16 w-full" />
                        ) : creditHistory.length === 0 ? (
                          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                            ยังไม่มีประวัติเครดิต
                          </p>
                        ) : (
                          <div className="relative space-y-3 pl-4">
                            <div className="absolute bottom-2 left-1.5 top-2 w-px bg-border" />
                            {creditHistory.map((c) => {
                              const isAdd = c.amount > 0
                              const typeLabel: Record<string, string> = {
                                REFUND: 'คืนเงิน',
                                TOPUP: 'เติมเครดิต',
                                REWARD: 'รางวัล',
                                ADJUST: 'ปรับยอด',
                              }
                              return (
                                <div key={c.id} className="relative">
                                  <span className={cn('absolute -left-2.5 top-1 h-2 w-2 rounded-full', isAdd ? 'bg-emerald-500' : 'bg-red-500')} />
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <Badge className={cn(
                                          'text-[9px] ring-1 ring-inset',
                                          isAdd
                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30'
                                            : 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30'
                                        )}>
                                          {typeLabel[c.type] ?? c.type}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{formatThaiDateTime(new Date(c.createdAt))}</span>
                                      </div>
                                      <p className="mt-0.5 text-sm">{c.reason}</p>
                                      {c.userName && (
                                        <p className="text-[10px] text-muted-foreground">โดย {c.userName}</p>
                                      )}
                                    </div>
                                    <span className={cn('text-sm font-bold whitespace-nowrap', isAdd ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                      {isAdd ? '+' : ''}{formatBaht(c.amount)}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="info" className="mt-0 space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <InfoRow icon={Phone} label="เบอร์โทร" value={customer.phone} />
                        <InfoRow icon={Mail} label="อีเมล" value={customer.email || '—'} />
                        <InfoRow icon={Cake} label="วันเกิด" value={customer.birthday ? formatThaiDate(new Date(customer.birthday), { withDay: true }) : '—'} />
                        <InfoRow icon={Calendar} label="สมาชิกตั้งแต่" value={formatThaiDate(new Date(customer.createdAt), { withDay: true })} />
                        <InfoRow icon={Trophy} label="Tier" value={customer.tier} />
                        <InfoRow icon={Star} label="แต้มสะสม" value={`${toThaiNumerals(customer.points)} แต้ม`} />
                      </div>
                      {customer.notes && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3">
                          <p className="text-[10px] uppercase text-amber-600">หมายเหตุ</p>
                          <p className="mt-1 text-sm">{customer.notes}</p>
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={openEdit} className="w-full">แก้ไขข้อมูล</Button>
                    </TabsContent>

                    <TabsContent value="marketing" className="mt-0 space-y-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-[10px] uppercase text-muted-foreground">ความชื่นชอบ</p>
                        {data.favorite ? (
                          <p className="mt-1 text-sm">
                            สั่ง <span className="font-semibold">{data.favorite.name}</span> บ่อยที่สุด ({toThaiNumerals(data.favorite.qty)} ครั้ง · {formatBaht(data.favorite.spent)})
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success(`ส่งคูปองให้ ${customer.name} เรียบร้อย (mock)`)}>
                          <Gift className="h-3.5 w-3.5" /> ส่งคูปอง
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success(`ส่ง SMS ให้ ${customer.name} เรียบร้อย (mock)`)}>
                          <MessageSquare className="h-3.5 w-3.5" /> ส่ง SMS
                        </Button>
                      </div>
                      <div className="rounded-lg border border-dashed p-3 text-center">
                        <Sparkles className="mx-auto h-4 w-4 text-[var(--gold)]" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          การติดต่อล่าสุด: ยังไม่มีบันทึก
                        </p>
                      </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          ) : null}

          <SheetFooter className="border-t bg-muted/30 p-3">
            <div className="flex w-full flex-wrap items-center gap-2">
              <Button size="sm" variant="default" className="gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]" onClick={() => setAdjustOpen(true)}>
                <Trophy className="h-3.5 w-3.5" /> ปรับแต้ม
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
                แก้ไขข้อมูล
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.success('ส่งคูปองเรียบร้อย (mock)')}>
                <Gift className="h-3.5 w-3.5" /> ส่งคูปอง
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <LoyaltyAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        customer={customer ? { id: customer.id, name: customer.name, points: customer.points, tier: customer.tier } : null}
        onSaved={refresh}
      />
      <StoreCreditAdjustDialog
        open={creditOpen}
        onOpenChange={setCreditOpen}
        customer={customer ? { id: customer.id, name: customer.name, balance: creditBalance ?? 0 } : null}
        onSaved={refresh}
      />
      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={editTarget}
        onSaved={refresh}
      />
    </>
  )
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  const accents: Record<string, string> = {
    gold: 'text-[var(--gold)]',
    forest: 'text-[var(--forest)] dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    teal: 'text-teal-600 dark:text-teal-400',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card p-2.5"
    >
      <Icon className={cn('h-3.5 w-3.5', accents[accent])} />
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </motion.div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
