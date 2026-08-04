'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  Plus,
  Building2,
  ChevronDown,
  Store,
  Calculator,
  ShoppingCart,
  Package,
  Trash2,
  CalendarDays,
  X,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import { NotificationBell } from '@/components/admin/notification-bell'
import { cn } from '@/lib/utils'

// Map pathname → page title (Thai) for breadcrumb
const TITLE_MAP: Record<string, string> = {
  '/admin': 'แดชบอร์ดผู้บริหาร',
  '/admin/notifications': 'การแจ้งเตือน',
  '/admin/pos': 'POS หน้าร้าน',
  '/admin/orders': 'คำสั่งซื้อ',
  '/admin/deliveries': 'จัดส่ง',
  '/admin/products': 'สินค้า & เมนู',
  '/admin/recipes': 'สูตรผลิต / BOM',
  '/admin/inventory': 'คลังสินค้า',
  '/admin/waste': 'ของเสีย',
  '/admin/kitchen': 'คิวผลิต',
  '/admin/qc': 'คุณภาพ / QC',
  '/admin/catering': 'จัดงาน / เบรค',
  '/admin/customers': 'ลูกค้า & สมาชิก',
  '/admin/promotions': 'โปรโมชั่น',
  '/admin/reports': 'รายงาน / BI',
  '/admin/accounting': 'บัญชี',
  '/admin/users': 'ผู้ใช้ & สิทธิ์',
  '/admin/audit': 'บันทึก Audit',
  '/admin/settings': 'ตั้งค่า',
}

const QUICK_ACTIONS = [
  { label: 'เปิด POS', href: '/admin/pos', icon: Calculator },
  { label: 'สร้างออเดอร์', href: '/admin/orders', icon: ShoppingCart },
  { label: 'เพิ่มสินค้า', href: '/admin/products', icon: Package },
  { label: 'บันทึกของเสีย', href: '/admin/waste', icon: Trash2 },
  { label: 'จัดงานใหม่', href: '/admin/catering', icon: CalendarDays },
  { label: 'ปิดกะ', href: '/admin/pos', icon: Store },
]

export function AdminHeader() {
  const pathname = usePathname()
  const title = TITLE_MAP[pathname] ?? 'Khanom House Admin'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <SidebarTrigger className="-ml-1 h-9 w-9" />

      {/* Breadcrumb / title */}
      <div className="hidden min-w-0 flex-col md:flex">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Admin</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="truncate text-foreground/80">{title}</span>
        </div>
        <h1 className="truncate text-sm font-bold leading-tight">{title}</h1>
      </div>
      <h1 className="truncate text-sm font-bold md:hidden">{title}</h1>

      {/* Global search — decorative */}
      <div className="ml-auto hidden max-w-md flex-1 items-center lg:flex">
        <div className="group relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาออเดอร์ สินค้า ลูกค้า..."
            className="h-9 rounded-full border-muted bg-muted/40 pl-9 pr-12 text-sm"
            aria-label="ค้นหา"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1 lg:ml-2">
        {/* Branch selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-2 rounded-full border-muted px-3 sm:flex"
            >
              <Building2 className="h-4 w-4 text-[var(--forest)] dark:text-[var(--gold)]" />
              <span className="text-xs font-medium">สาขาหลัก สีลม</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              เลือกสาขา
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 bg-accent/40">
              <Building2 className="h-4 w-4 text-[var(--forest)] dark:text-[var(--gold)]" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">สาขาหลัก สีลม</span>
                <span className="text-[10px] text-muted-foreground">SIL-01</span>
              </div>
              <Badge variant="secondary" className="ml-auto bg-[var(--gold)]/20 text-[var(--gold)]">
                ปัจจุบัน
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="gap-2 opacity-50">
              <Building2 className="h-4 w-4" />
              <span>สาขา ทองหล่อ</span>
              <span className="ml-auto text-[10px]">เร็วๆ นี้</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="gap-2 opacity-50">
              <Building2 className="h-4 w-4" />
              <span>สาขา เอราวัณ</span>
              <span className="ml-auto text-[10px]">เร็วๆ นี้</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
        <NotificationBell />

        {/* Quick actions */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              className="ml-1 h-9 w-9 rounded-full bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]"
              aria-label="Quick actions"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2" sideOffset={8}>
            <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
              ดำเนินการด่วน
            </div>
            <div className="grid gap-1">
              {QUICK_ACTIONS.map((a) => {
                const Icon = a.icon
                return (
                  <Link
                    key={a.label}
                    href={a.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 text-[var(--forest)] dark:text-[var(--gold)]" />
                    <span>{a.label}</span>
                  </Link>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
