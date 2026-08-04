'use client'

/**
 * Admin error boundary.
 *
 * WHY: Audit finding H6 — admin routes had no error boundary. A Prisma
 * error in the dashboard would crash the whole admin shell. This keeps
 * the sidebar/topbar intact and shows a recovery card in the content area.
 */
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin-error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">เกิดข้อผิดพลาดในระบบ</h2>
        <p className="text-muted-foreground">
          ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง หรือกลับหน้าแดชบอร์ด
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70 font-mono">
            รหัสอ้างอิง: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            ลองใหม่
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            หน้าแดชบอร์ด
          </Link>
        </div>
      </div>
    </div>
  )
}
