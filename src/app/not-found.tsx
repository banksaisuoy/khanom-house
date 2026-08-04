/**
 * Custom 404 page.
 *
 * WHY: Audit finding H6 — no not-found.tsx existed. Default Next.js 404
 * was unbranded and offered no navigation back to the storefront.
 */
import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-bold text-gold">๔๐๔</div>
        <h1 className="text-2xl font-bold">ไม่พบหน้าที่คุณค้นหา</h1>
        <p className="text-muted-foreground">
          หน้าที่คุณพยายามเข้าถึงอาจถูกลบไปแล้ว หรือไม่มีอยู่ในระบบ
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            กลับหน้าแรก
          </Link>
          <Link
            href="/#products"
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 hover:bg-muted transition-colors"
          >
            <Search className="h-4 w-4" />
            ดูสินค้า
          </Link>
        </div>
      </div>
    </div>
  )
}
