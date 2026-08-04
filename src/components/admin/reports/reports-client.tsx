'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPageHeader } from '@/components/admin/admin-page-utils'
import { toast } from 'sonner'

// Lazy-load the report panels — each one pulls in recharts (~400KB gzipped).
// They are only rendered when their tab is active, so deferring the import
// keeps the initial bundle smaller and the dashboard paint faster.
const SalesReport = dynamic(
  () => import('./sales-report').then((m) => m.SalesReport),
  { ssr: false, loading: () => <ReportSkeleton /> }
)
const ProductReport = dynamic(
  () => import('./product-report').then((m) => m.ProductReport),
  { ssr: false, loading: () => <ReportSkeleton /> }
)
const CustomerReport = dynamic(
  () => import('./customer-report').then((m) => m.CustomerReport),
  { ssr: false, loading: () => <ReportSkeleton /> }
)
const FinanceReport = dynamic(
  () => import('./finance-report').then((m) => m.FinanceReport),
  { ssr: false, loading: () => <ReportSkeleton /> }
)

function ReportSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

type TabKey = 'sales' | 'products' | 'customers' | 'finance'

const RANGES = [
  { value: '7', label: '7 วัน' },
  { value: '30', label: '30 วัน' },
  { value: '90', label: '90 วัน' },
]

export function ReportsClient({ initialTab = 'sales' }: { initialTab?: TabKey }) {
  const [tab, setTab] = React.useState<TabKey>(initialTab)
  const [range, setRange] = React.useState('30')

  const sales = useQuery({
    queryKey: ['report-sales', range],
    queryFn: async () => {
      const r = await fetch(`/api/admin/reports/sales?range=${range}&groupBy=day`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
  })

  const products = useQuery({
    queryKey: ['report-products', range],
    queryFn: async () => {
      const r = await fetch(`/api/admin/reports/products?range=${range}`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    enabled: tab === 'products',
  })

  const customers = useQuery({
    queryKey: ['report-customers', range],
    queryFn: async () => {
      const r = await fetch(`/api/admin/reports/customers?range=${range}`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    enabled: tab === 'customers',
  })

  const finance = useQuery({
    queryKey: ['report-finance', range],
    queryFn: async () => {
      const r = await fetch(`/api/admin/reports/finance?range=${range}`)
      if (!r.ok) throw new Error('fetch failed')
      return r.json()
    },
    enabled: tab === 'finance',
  })

  const exportCsv = async (type: string) => {
    try {
      const r = await fetch(`/api/admin/reports/export?type=${type}&range=${range}`)
      if (!r.ok) throw new Error('ส่งออกไม่สำเร็จ')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = r.headers.get('Content-Disposition') ?? ''
      const m = cd.match(/filename="([^"]+)"/)
      a.download = m ? m[1] : `${type}-${range}d.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 500)
      toast.success(`ส่งออก CSV (${type}) สำเร็จ`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="รายงาน & BI"
        subtitle="วิเคราะห์ยอดขาย สินค้า ลูกค้า และการเงินของร้าน"
        icon={BarChart3}
        actions={
          <>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Download className="h-4 w-4" /> ส่งออก CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>เลือกประเภทรายงาน</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportCsv('sales')}>ยอดขาย</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv('products')}>สินค้า</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv('customers')}>ลูกค้า</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv('finance')}>การเงิน</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="sales" className="text-xs">ยอดขาย</TabsTrigger>
          <TabsTrigger value="products" className="text-xs">สินค้า</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs">ลูกค้า</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs">การเงิน</TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {tab === 'sales' && <SalesReport data={sales.data ?? null} isLoading={sales.isLoading} />}
        {tab === 'products' && <ProductReport data={products.data ?? null} isLoading={products.isLoading} />}
        {tab === 'customers' && <CustomerReport data={customers.data ?? null} isLoading={customers.isLoading} />}
        {tab === 'finance' && <FinanceReport data={finance.data ?? null} isLoading={finance.isLoading} />}
      </motion.div>
    </div>
  )
}
