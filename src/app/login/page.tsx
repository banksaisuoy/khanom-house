'use client'

/**
 * Admin login page.
 *
 * WHY: Audit fix C-1 — admin routes now require auth. This page lets the
 * admin sign in with email+password. On success, sets the `kh_session`
 * cookie and redirects to /admin.
 *
 * Demo accounts (seeded):
 *   admin@khanomhouse.th / <your-password> (SUPER_ADMIN)
 *   manager@khanomhouse.th / <your-password> (BRANCH_MANAGER)
 *   kitchen@khanomhouse.th / <your-password> (KITCHEN)
 *   cashier@khanomhouse.th / <your-password> (CASHIER)
 *   rider@khanomhouse.th / <your-password> (RIDER)
 *   account@khanomhouse.th / <your-password> (ACCOUNTANT)
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ')
      toast.success(`ยินดีต้อนรับ, ${data.user.name}`)
      router.push('/admin')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-cream px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าร้าน
        </Link>

        <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold text-gold-foreground text-3xl mb-3">
              ❀
            </div>
            <h1 className="text-2xl font-bold">Khanom House ERP</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">
              เข้าสู่ระบบจัดการร้านขนมไทย
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="p-8 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                อีเมล
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="admin@khanomhouse.th"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              เข้าสู่ระบบ
            </button>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">บัญชีทดลอง (ดูรหัสผ่านใน README)</p>
              <p>• admin@khanomhouse.th — Super Admin</p>
              <p>• manager@khanomhouse.th — Branch Manager</p>
              <p>• cashier@khanomhouse.th — Cashier</p>
              <p>• kitchen@khanomhouse.th — Kitchen</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
