'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bell,
  Calculator,
  ShoppingCart,
  Truck,
  Package,
  ChefHat,
  Warehouse,
  Trash2,
  CookingPot,
  ShieldCheck,
  CalendarDays,
  Users,
  Ticket,
  BarChart3,
  Wallet,
  UserCog,
  ScrollText,
  Settings,
  LogOut,
  TruckIcon,
  Bot,
  FileText,
  CalendarClock,
  Receipt,
  Building2,
  Gift,
  Star,
  HelpCircle,
  RotateCcw,
  FileCheck,
  ArrowLeftRight,
  MapPin,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}
type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'ภาพรวม',
    items: [
      { title: 'แดชบอร์ด', href: '/admin', icon: LayoutDashboard },
      { title: 'การแจ้งเตือน', href: '/admin/notifications', icon: Bell },
    ],
  },
  {
    label: 'การขาย',
    items: [
      { title: 'POS หน้าร้าน', href: '/admin/pos', icon: Calculator },
      { title: 'คำสั่งซื้อ', href: '/admin/orders', icon: ShoppingCart },
      { title: 'จัดส่ง', href: '/admin/deliveries', icon: Truck },
      { title: 'พื้นที่จัดส่ง', href: '/admin/delivery-zones', icon: MapPin },
      { title: 'คืนสินค้า/คืนเงิน', href: '/admin/refunds', icon: RotateCcw },
      { title: 'ตรวจสลิป', href: '/admin/slip-verification', icon: FileCheck },
    ],
  },
  {
    label: 'สินค้า',
    items: [
      { title: 'สินค้า & เมนู', href: '/admin/products', icon: Package },
      { title: 'สูตรผลิต/BOM', href: '/admin/recipes', icon: ChefHat },
      { title: 'คลังสินค้า', href: '/admin/inventory', icon: Warehouse },
      { title: 'โอนสต็อก', href: '/admin/stock-transfer', icon: ArrowLeftRight },
      { title: 'ของเสีย', href: '/admin/waste', icon: Trash2 },
      { title: 'ซัพพลายเออร์ & PO', href: '/admin/suppliers', icon: TruckIcon },
    ],
  },
  {
    label: 'ครัว',
    items: [
      { title: 'คิวผลิต', href: '/admin/kitchen', icon: CookingPot },
      { title: 'คุณภาพ/QC', href: '/admin/qc', icon: ShieldCheck },
    ],
  },
  {
    label: 'Catering',
    items: [{ title: 'จัดงาน/เบรค', href: '/admin/catering', icon: CalendarDays }],
  },
  {
    label: 'ลูกค้า',
    items: [
      { title: 'ลูกค้า & สมาชิก', href: '/admin/customers', icon: Users },
      { title: 'บัตรของขวัญ', href: '/admin/gift-cards', icon: Gift },
      { title: 'รีวิวสินค้า', href: '/admin/reviews', icon: Star },
      { title: 'โปรโมชั่น', href: '/admin/promotions', icon: Ticket },
    ],
  },
  {
    label: 'การเงิน',
    items: [
      { title: 'รายงาน/BI', href: '/admin/reports', icon: BarChart3 },
      { title: 'บัญชี', href: '/admin/accounting', icon: Wallet },
      { title: 'ใบกำกับภาษี', href: '/admin/tax-invoices', icon: FileText },
      { title: 'ค่าใช้จ่าย', href: '/admin/expenses', icon: Receipt },
    ],
  },
  {
    label: 'เนื้อหา & AI',
    items: [
      { title: 'บทความ/Blog', href: '/admin/blog', icon: FileText },
      { title: 'FAQ', href: '/admin/faq', icon: HelpCircle },
      { title: 'ผู้ช่วย AI', href: '/admin/ai-assistant', icon: Bot },
    ],
  },
  {
    label: 'ระบบ',
    items: [
      { title: 'ผู้ใช้ & สิทธิ์', href: '/admin/users', icon: UserCog },
      { title: 'พนักงาน/ตารางกะ', href: '/admin/staff', icon: CalendarClock },
      { title: 'สาขา', href: '/admin/branches', icon: Building2 },
      { title: 'บันทึก Audit', href: '/admin/audit', icon: ScrollText },
      { title: 'ตั้งค่า', href: '/admin/settings', icon: Settings },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/40 pb-3">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gold)] to-[#a8854f] text-[var(--forest)] shadow-md ring-1 ring-[var(--gold)]/40">
            <span className="text-xl font-bold">❀</span>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold leading-tight text-sidebar-foreground">
              Khanom House
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--gold)]">
              ERP / POS
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        {NAV_GROUPS.map((group, idx) => (
          <div key={group.label}>
            <SidebarGroup key={group.label} className="py-1">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gold)]/80">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(pathname, item.href)
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={
                            active
                              ? 'bg-[var(--gold)]/15 text-[var(--gold)] font-medium ring-1 ring-[var(--gold)]/30'
                              : 'text-sidebar-foreground/80 hover:text-sidebar-foreground'
                          }
                        >
                          <Link href={item.href}>
                            <Icon className={active ? 'text-[var(--gold)]' : ''} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {idx < NAV_GROUPS.length - 1 && (
              <SidebarSeparator className="bg-sidebar-border/40" />
            )}
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="ออกจากระบบ"
              className="text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-red-300"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/login'
              }}
            >
              <LogOut />
              <span>ออกจากระบบ</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/40 p-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9 border border-[var(--gold)]/40">
            <AvatarFallback className="bg-[var(--gold)] text-xs font-bold text-[var(--forest)]">
              ผด
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-semibold text-sidebar-foreground">
              ผู้ดูแลระบบ
            </span>
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[10px] text-sidebar-foreground/60">
                admin@khanomhouse.th
              </span>
              <Badge
                variant="secondary"
                className="h-3.5 px-1 text-[9px] font-semibold uppercase bg-[var(--gold)]/20 text-[var(--gold)]"
              >
                Super Admin
              </Badge>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
