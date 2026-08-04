import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { formatThaiDate, toThaiNumerals } from '@/lib/thai-date'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Eye } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'บทความ & สูตรขนม — Khanom House',
  description: 'บทความน่ารู้ สูตรขนมไทยโบราณ ข่าวสาร และเคล็ดลับจาก Khanom House',
}

const CATEGORY_CONFIG: Record<string, { label: string; cls: string }> = {
  article: { label: 'บทความ', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  recipe: { label: 'สูตรขนม', cls: 'bg-amber-500/15 text-amber-700 ring-amber-500/30' },
  news: { label: 'ข่าวสาร', cls: 'bg-teal-500/15 text-teal-700 ring-teal-500/30' },
  tips: { label: 'เคล็ดลับ', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] ring-[var(--forest)]/30' },
}

function parseTags(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map((x) => String(x)) : []
  } catch {
    return []
  }
}

export default async function BlogIndexPage() {
  const posts = await db.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    include: { author: { select: { name: true } } },
    take: 60,
  })

  return (
    <div className="min-h-screen bg-[var(--cream)] text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--forest)] text-[var(--gold)] text-lg ring-1 ring-[var(--gold)]/30">
              ❀
            </span>
            <div>
              <p className="font-bold leading-tight">Khanom House</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">
                Blog & Recipes
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

      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="mb-8 text-center">
          <Badge className="bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
            ❀ บทความ & สูตรขนม
          </Badge>
          <h1 className="mt-3 text-3xl font-bold text-[var(--forest)] dark:text-[var(--gold)] md:text-4xl">
            เรื่องราวน่ารู้จากครัว Khanom House
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            รวมบทความ สูตรขนมไทยโบราณ ข่าวสารร้าน และเคล็ดลับการเลือกขนม
            — อัปเดตใหม่ล่าสุดจากทีมเชฟและผู้เชี่ยวชาญของเรา
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-3xl">
              📝
            </div>
            <p className="font-semibold">ยังไม่มีบทความในขณะนี้</p>
            <p className="mt-1 text-sm text-muted-foreground">
              โปรดกลับมาเยี่ยมชมอีกครั้ง — เรากำลังเตรียมเนื้อหาใหม่ๆ อยู่
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">กลับหน้าร้าน</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => {
              const cat = CATEGORY_CONFIG[p.category] ?? CATEGORY_CONFIG.article
              const tags = parseTags(p.tags)
              return (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Cover emoji */}
                  <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-[var(--forest)] to-[var(--forest)]/80 text-5xl">
                    <span className="drop-shadow-md transition-transform group-hover:scale-110">
                      {p.coverEmoji}
                    </span>
                    <Badge
                      className={`absolute left-3 top-3 text-[10px] ring-1 ring-inset ${cat.cls}`}
                    >
                      {cat.label}
                    </Badge>
                  </div>
                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h2 className="line-clamp-2 font-bold leading-snug text-foreground group-hover:text-[var(--gold)]">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                        {p.excerpt}
                      </p>
                    )}
                    {tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((t, i) => (
                          <span
                            key={i}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      <span>
                        {p.publishedAt
                          ? formatThaiDate(p.publishedAt, { short: true })
                          : formatThaiDate(p.updatedAt, { short: true })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {toThaiNumerals(p.viewCount)}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-border bg-[var(--forest)] py-6 text-center text-xs text-[var(--gold)]/80">
        <div className="mx-auto max-w-5xl px-4">
          <p>© {new Date().getFullYear() + 543} Khanom House — ขนมไทยโบราณ สูตรตำรับช่างหลวง</p>
        </div>
      </footer>
    </div>
  )
}
