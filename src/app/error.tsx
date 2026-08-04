'use client'

/**
 * Global error boundary for the storefront.
 *
 * WHY: Audit finding H6 — no `error.tsx` anywhere in the app. Any
 * uncaught error in a Server Component rendered the default Next.js
 * 500 page with no recovery path. This boundary catches and offers
 * a retry.
 */
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[storefront-error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">เกิดข้อผิดพลาด</h2>
        <p className="text-muted-foreground">
          ไม่สามารถโหลดหน้านี้ได้ กรุณาลองใหม่อีกครั้ง
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70 font-mono">
            รหัสอ้างอิง: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          ลองใหม่
        </button>
      </div>
    </div>
  )
}
