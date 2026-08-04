import Link from 'next/link'
import {
  Calculator,
  ShoppingCart,
  Package,
  Trash2,
  CalendarDays,
  Store,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Action = {
  label: string
  href: string
  icon: LucideIcon
  desc: string
}

const ACTIONS: Action[] = [
  { label: 'เปิด POS', href: '/admin/pos', icon: Calculator, desc: 'หน้าขายหน้าร้าน' },
  { label: 'สร้างออเดอร์', href: '/admin/orders', icon: ShoppingCart, desc: 'รับออเดอร์ใหม่' },
  { label: 'เพิ่มสินค้า', href: '/admin/products', icon: Package, desc: 'เพิ่มเมนูใหม่' },
  { label: 'บันทึกของเสีย', href: '/admin/waste', icon: Trash2, desc: 'ลงบันทึกเสียหาย' },
  { label: 'จัดงานใหม่', href: '/admin/catering', icon: CalendarDays, desc: 'สร้างใบเสนอราคา' },
  { label: 'ปิดกะ', href: '/admin/pos', icon: Store, desc: 'สรุปยอดประจำกะ' },
]

export function QuickActions() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ดำเนินการด่วน</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.label}
                href={a.href}
                className="group flex min-h-[88px] flex-col items-start gap-2 rounded-xl border bg-gradient-to-br from-card to-muted/30 p-3 transition-all hover:border-[var(--gold)]/50 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/20 transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
