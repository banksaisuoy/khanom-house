'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Calculator, Wallet, TrendingDown, TrendingUp, Receipt, Coins, Printer,
  Lock, FileDown, Banknote, CreditCard, QrCode, Calendar as CalIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { AdminPageHeader, AdminMiniStat } from '@/components/admin/admin-page-utils'
import { formatBaht, formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ClosingData = {
  date: string
  sales: { cash: number; card: number; qr: number; other: number; total: number }
  expenses: { cogs: number; utility: number; salary: number; marketing: number; waste: number; other: number; total: number }
  net: number
  vat: { output: number; input: number; net: number }
  wasteItems: { productName: string; source: string; quantity: number; unit: string; value: number }[]
  orderCount: number
  posBillCount: number
}

export type FinanceData = {
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  expenses: { label: string; key: string; value: number }[]
  totalExpenses: number
  netProfit: number
  netMargin: number
  vat: { output: number; input: number; net: number }
  wasteValue: number
  marginTrend: { date: string; revenue: number; cogs: number; profit: number; waste: number; margin: number }[]
}

const TABS = [
  { value: 'closing', label: 'ปิดยอดประจำวัน' },
  { value: 'pnl', label: 'งบกำไรขาดทุน' },
  { value: 'vat', label: 'รายงานภาษี' },
  { value: 'ledger', label: 'สมุดบัญชี' },
] as const
type TabKey = typeof TABS[number]['value']

export function AccountingClient({ initialFinance }: { initialFinance: FinanceData }) {
  const [tab, setTab] = React.useState<TabKey>('closing')
  // Hydration-safe: server renders null (empty date input), client
  // populates today's date after mount to avoid SSR/CSR mismatch.
  const [closingDate, setClosingDate] = React.useState<string | null>(null)
  const [closingOpen, setClosingOpen] = React.useState(false)

  React.useEffect(() => {
    setClosingDate(new Date().toISOString().slice(0, 10))
  }, [])

  const finance = useQuery<FinanceData>({
    queryKey: ['accounting-finance', '30'],
    queryFn: async () => {
      const r = await fetch('/api/admin/reports/finance?range=30')
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    initialData: initialFinance,
  })

  const closing = useQuery<ClosingData>({
    queryKey: ['accounting-closing', closingDate],
    queryFn: async () => {
      const r = await fetch(`/api/admin/accounting/closing?date=${closingDate}`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    // Don't fetch until we have a real date (after hydration).
    enabled: !!closingDate,
  })

  const exportAccounting = async (format: 'peak' | 'flowaccount' | 'csv') => {
    try {
      const r = await fetch(`/api/admin/accounting/export?format=${format}&range=30`)
      if (!r.ok) throw new Error('ส่งออกไม่สำเร็จ')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = r.headers.get('Content-Disposition') ?? ''
      const m = cd.match(/filename="([^"]+)"/)
      a.download = m ? m[1] : `accounting-${format}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 500)
      toast.success(`ส่งออก ${format.toUpperCase()} สำเร็จ`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const f = finance.data ?? initialFinance

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="บัญชี & การเงิน"
        subtitle="ปิดยอดประจำวัน, งบ P&L, รายงานภาษี และสมุดบัญชี"
        icon={Calculator}
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setClosingOpen(true)}>
              <Lock className="h-4 w-4" /> ปิดยอดประจำวัน
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <FileDown className="h-4 w-4" /> ส่งออก
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>เลือกรูปแบบ</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportAccounting('csv')}>CSV (สมุดบัญชีทั่วไป)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAccounting('peak')}>PEAK Accounting</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAccounting('flowaccount')}>FlowAccount</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AdminMiniStat label="รายได้ (30 วัน)" value={formatBaht(f.revenue)} icon={Wallet} accent="gold" />
        <AdminMiniStat label="กำไรขั้นต้น" value={formatBaht(f.grossProfit)} sub={`Margin ${toThaiNumerals(f.grossMargin)}%`} icon={TrendingUp} accent="forest" />
        <AdminMiniStat label="กำไรสุทธิ" value={formatBaht(f.netProfit)} sub={`Net ${toThaiNumerals(f.netMargin)}%`} icon={Coins} accent={f.netProfit >= 0 ? 'forest' : 'red'} />
        <AdminMiniStat label="VAT สุทธิ" value={formatBaht(f.vat.net)} icon={Receipt} accent="amber" />
        <AdminMiniStat label="ของเสีย" value={formatBaht(f.wasteValue)} icon={TrendingDown} accent="red" />
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border p-0.5">
        {TABS.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant={tab === t.value ? 'default' : 'ghost'}
            className={cn('h-8 gap-1 text-xs', tab === t.value && 'bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]')}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {tab === 'closing' && (
          <ClosingTab closingDate={closingDate} setClosingDate={setClosingDate} closing={closing} />
        )}
        {tab === 'pnl' && <PnlTab finance={f} isLoading={finance.isLoading} />}
        {tab === 'vat' && <VatTab finance={f} />}
        {tab === 'ledger' && <LedgerTab finance={f} />}
      </motion.div>

      {/* Daily closing summary dialog */}
      <DailyClosingDialog
        open={closingOpen}
        onOpenChange={setClosingOpen}
        date={closingDate ?? ''}
        setDate={setClosingDate}
        data={closing.data}
        isLoading={closing.isLoading}
      />
    </div>
  )
}

// ---------------- Closing Tab ----------------
function ClosingTab({
  closingDate, setClosingDate, closing,
}: {
  closingDate: string | null
  setClosingDate: (d: string) => void
  closing: { data: ClosingData | undefined; isLoading: boolean }
}) {
  const data = closing.data
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalIcon className="h-4 w-4 text-[var(--gold)]" /> สรุปยอดประจำวัน
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">เลือกวันที่</span>
              <Input
                type="date"
                value={closingDate ?? ''}
                onChange={(e) => setClosingDate(e.target.value)}
                className="h-8 w-[160px] text-xs"
                suppressHydrationWarning
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {closing.isLoading || !data || !closingDate ? (
            <div className="grid gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SalesCard icon={Banknote} label="เงินสด" value={data.sales.cash} color="emerald" />
                <SalesCard icon={CreditCard} label="บัตรเครดิต" value={data.sales.card} color="gold" />
                <SalesCard icon={QrCode} label="QR / e-Wallet" value={data.sales.qr} color="forest" />
                <SalesCard icon={Wallet} label="ยอดขายรวม" value={data.sales.total} color="amber" />
              </div>

              <div className="mt-4 rounded-xl border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-semibold">สรุปค่าใช้จ่าย (ประมาณการ)</p>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                  <ExpenseMini label="ต้นทุนสินค้า" value={data.expenses.cogs} />
                  <ExpenseMini label="ค่าน้ำ/ไฟ" value={data.expenses.utility} />
                  <ExpenseMini label="เงินเดือน" value={data.expenses.salary} />
                  <ExpenseMini label="การตลาด" value={data.expenses.marketing} />
                  <ExpenseMini label="ของเสีย" value={data.expenses.waste} />
                  <ExpenseMini label="อื่นๆ" value={data.expenses.other} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--forest)]/30 bg-[var(--forest)]/5 p-3">
                  <p className="text-[10px] text-muted-foreground">กำไรสุทธิวันนี้</p>
                  <p className={cn('mt-1 text-xl font-bold', data.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>{formatBaht(data.net)}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-[10px] text-muted-foreground">VAT ขา output (7%)</p>
                  <p className="mt-1 text-xl font-bold text-[var(--gold)]">{formatBaht(data.vat.output)}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-[10px] text-muted-foreground">VAT สุทธิต้องชำระ</p>
                  <p className="mt-1 text-xl font-bold text-[var(--forest)] dark:text-emerald-400">{formatBaht(data.vat.net)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>ออเดอร์สำเร็จ {toThaiNumerals(data.orderCount)} บิล · POS {toThaiNumerals(data.posBillCount)} บิล</span>
                <span>วันที่ {formatThaiDate(new Date(closingDate + 'T00:00:00'), { withDay: true })}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------- P&L Tab ----------------
function PnlTab({ finance, isLoading }: { finance: FinanceData; isLoading: boolean }) {
  if (isLoading) return <Skeleton className="h-96 rounded-xl" />
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">งบกำไรขาดทุน (P&L Statement) — 30 วันล่าสุด</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">รายการ</TableHead>
              <TableHead className="text-right text-xs">จำนวนเงิน (฿)</TableHead>
              <TableHead className="text-right text-xs">% ของรายได้</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <PnlRow label="รายได้รวม" value={finance.revenue} pct={100} bold />
            <PnlRow label="(-) ต้นทุนสินค้า (COGS)" value={-finance.cogs} pct={finance.revenue > 0 ? (finance.cogs / finance.revenue) * 100 : 0} />
            <PnlRow label="กำไรขั้นต้น" value={finance.grossProfit} pct={finance.grossMargin} bold highlight />
            {finance.expenses.map((e) => (
              <PnlRow key={e.key} label={`(-) ${e.label}`} value={-e.value} pct={finance.revenue > 0 ? (e.value / finance.revenue) * 100 : 0} />
            ))}
            <PnlRow label="กำไรสุทธิ" value={finance.netProfit} pct={finance.netMargin} bold highlight={finance.netProfit >= 0 ? 'pos' : 'neg'} />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ---------------- VAT Tab ----------------
function VatTab({ finance }: { finance: FinanceData }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">VAT ขา output</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="text-2xl font-bold text-[var(--gold)]">{formatBaht(finance.vat.output)}</p>
          <p className="mt-1 text-xs text-muted-foreground">ภาษีมูลค่าเพิ่มที่เก็บจากลูกค้า 7% ของยอดขาย</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">VAT ขา input</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="text-2xl font-bold text-amber-500">{formatBaht(finance.vat.input)}</p>
          <p className="mt-1 text-xs text-muted-foreground">ภาษีมูลค่าเพิ่มที่จ่ายให้ผู้ขาย 7% ของค่าใช้จ่าย</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">VAT สุทธิต้องชำระ</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="text-2xl font-bold text-[var(--forest)] dark:text-emerald-400">{formatBaht(finance.vat.net)}</p>
          <p className="mt-1 text-xs text-muted-foreground">ยอดที่ต้องนำส่งกรมสรรพากร (output − input)</p>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">บันทึก VAT ย้อนหลัง</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">วันที่</TableHead>
                <TableHead className="text-xs">ประเภท</TableHead>
                <TableHead className="text-right text-xs">ยอดก่อน VAT</TableHead>
                <TableHead className="text-right text-xs">VAT 7%</TableHead>
                <TableHead className="text-right text-xs">ยอดรวม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finance.marginTrend.slice(-10).map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="text-xs">{d.date}</TableCell>
                  <TableCell className="text-xs"><Badge variant="outline" className="text-[9px]">ขา output</Badge></TableCell>
                  <TableCell className="text-right text-xs">{formatBaht(d.revenue / 1.07)}</TableCell>
                  <TableCell className="text-right text-xs text-[var(--gold)]">{formatBaht(d.revenue * 0.07 / 1.07)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{formatBaht(d.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------- Ledger Tab ----------------
function LedgerTab({ finance }: { finance: FinanceData }) {
  const rows = finance.marginTrend.slice().reverse().slice(0, 30)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">สมุดบัญชีรายวัน (รายการย้อนหลัง 30 วัน)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="text-xs">วันที่</TableHead>
                <TableHead className="text-right text-xs">รายได้</TableHead>
                <TableHead className="text-right text-xs">ต้นทุน</TableHead>
                <TableHead className="text-right text-xs">ของเสีย</TableHead>
                <TableHead className="text-right text-xs">กำไรสุทธิ</TableHead>
                <TableHead className="text-right text-xs">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.date}>
                  <TableCell className="text-xs">{r.date}</TableCell>
                  <TableCell className="text-right text-xs text-[var(--gold)]">{formatBaht(r.revenue)}</TableCell>
                  <TableCell className="text-right text-xs text-red-500">{formatBaht(r.cogs)}</TableCell>
                  <TableCell className="text-right text-xs text-amber-500">{formatBaht(r.waste)}</TableCell>
                  <TableCell className={cn('text-right text-xs font-semibold', r.profit - r.waste >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>{formatBaht(r.profit - r.waste)}</TableCell>
                  <TableCell className="text-right text-xs">{toThaiNumerals(r.margin)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Daily Closing Dialog ----------------
function DailyClosingDialog({
  open, onOpenChange, date, setDate, data, isLoading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  date: string
  setDate: (d: string) => void
  data: ClosingData | undefined
  isLoading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--gold)]" /> ปิดยอดประจำวัน
          </DialogTitle>
          <DialogDescription>เลือกวันที่ต้องการปิดยอดเพื่อดูสรุปการขายและการเงิน</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          {isLoading || !data ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : (
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ยอดขายรวม</span>
                <span className="font-bold text-[var(--gold)]">{formatBaht(data.sales.total)}</span>
              </div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">เงินสด</span><span>{formatBaht(data.sales.cash)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">บัตร</span><span>{formatBaht(data.sales.card)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">QR / e-Wallet</span><span>{formatBaht(data.sales.qr)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">ค่าใช้จ่ายรวม</span><span className="text-red-500">-{formatBaht(data.expenses.total)}</span></div>
              <div className="flex justify-between border-t pt-2 text-sm font-bold">
                <span>กำไรสุทธิ</span>
                <span className={data.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>{formatBaht(data.net)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ปิด</Button>
          <Button
            onClick={() => {
              toast.success(`ปิดยอดวันที่ ${formatThaiDate(new Date(date + 'T00:00:00'), { short: true })} สำเร็จ`)
              onOpenChange(false)
            }}
            className="gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> ยืนยันปิดยอด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Helpers ----------------
function SalesCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: 'gold' | 'forest' | 'amber' | 'emerald' }) {
  const colors: Record<string, string> = {
    gold: 'border-[var(--gold)]/30 bg-[var(--gold)]/5 text-[var(--gold)]',
    forest: 'border-[var(--forest)]/30 bg-[var(--forest)]/5 text-[var(--forest)] dark:text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-500',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
  }
  return (
    <div className={cn('rounded-xl border p-3', colors[color])}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-1 text-lg font-bold">{formatBaht(value)}</p>
    </div>
  )
}

function ExpenseMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold">{formatBaht(value)}</p>
    </div>
  )
}

function PnlRow({
  label, value, pct, bold, highlight,
}: {
  label: string
  value: number
  pct: number
  bold?: boolean
  highlight?: boolean | 'pos' | 'neg'
}) {
  return (
    <TableRow className={cn(bold && 'border-t-2 bg-muted/30')}>
      <TableCell className={cn('text-xs', bold && 'font-bold')}>{label}</TableCell>
      <TableCell className={cn(
        'text-right text-xs',
        bold && 'font-bold',
        highlight === true && (value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'),
        highlight === 'pos' && 'text-emerald-600 dark:text-emerald-400',
        highlight === 'neg' && 'text-red-500'
      )}>{formatBaht(value)}</TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">{toThaiNumerals(pct.toFixed(1))}%</TableCell>
    </TableRow>
  )
}
