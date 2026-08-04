import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OrderTracking } from '@/components/store/order-tracking'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ติดตามออเดอร์ — Khanom House',
  description: 'ตรวจสอบสถานะคำสั่งซื้อขนมไทยของคุณ — กรอกหมายเลขออเดอร์เพื่อดูสถานะล่าสุด',
}

interface PageProps {
  searchParams: Promise<{ order?: string }>
}

export default async function TrackingPage({ searchParams }: PageProps) {
  const { order: initialOrderNo } = await searchParams

  // Pre-fetch the order if ?order=XXX is provided so SSR can render
  // the timeline immediately (better UX + SEO for share links from
  // email/LINE). The client component will refetch when the user
  // submits a new query.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let initialOrder: any = null
  if (initialOrderNo) {
    initialOrder = await db.order.findFirst({
      where: {
        OR: [
          { orderNo: { equals: initialOrderNo } },
          { customerPhone: { equals: initialOrderNo } },
        ],
      },
      include: {
        items: { include: { product: { select: { name: true, slug: true } } } },
        payment: true,
        delivery: { include: { rider: { select: { name: true } } } },
      },
      take: 1,
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--forest)] text-[var(--gold)] text-lg ring-1 ring-[var(--gold)]/30">
              ❀
            </span>
            <div>
              <p className="font-bold leading-tight">Khanom House</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">
                Order Tracking
              </p>
            </div>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> หน้าร้าน
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
            <span className="text-2xl">📦</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--forest)] dark:text-[var(--gold)] md:text-3xl">
            ติดตามออเดอร์
          </h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            กรอกหมายเลขออเดอร์ (เช่น KH00001) หรือเบอร์โทรศัพท์ที่ใช้สั่งซื้อ
            เพื่อตรวจสอบสถานะล่าสุด
          </p>
        </div>

        <OrderTracking initialOrderNo={initialOrderNo ?? null} initialOrder={initialOrder} />
      </main>

      <footer className="mt-8 border-t border-border bg-[var(--forest)] py-6 text-center text-xs text-[var(--gold)]/80">
        <div className="mx-auto max-w-5xl px-4">
          <p>© {new Date().getFullYear() + 543} Khanom House — ขนมไทยโบราณ สูตรตำรับช่างหลวง</p>
        </div>
      </footer>
    </div>
  )
}
