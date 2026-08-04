import type { Metadata } from 'next'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/admin/app-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { AdminQueryProvider } from '@/components/admin/query-provider'

/**
 * WHY: Audit M17 — every admin page set `force-dynamic` individually.
 * Setting it once on the layout ensures all admin routes are always
 * server-rendered (never statically optimized), preventing stale data
 * when a new page is added without the export.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin — Khanom House ERP',
  description: 'ระบบหลังบ้าน Khanom House — แดชบอร์ดผู้บริหาร POS คลังสินค้า การผลิต จัดงาน',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminQueryProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset>
          <AdminHeader />
          <main className="flex-1 bg-muted/20 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AdminQueryProvider>
  )
}
