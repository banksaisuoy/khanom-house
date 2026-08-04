import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatThaiDate, formatThaiDateTime, toThaiNumerals } from '@/lib/thai-date'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Eye, CalendarDays, User } from 'lucide-react'

export const dynamic = 'force-dynamic'

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

interface PageProps {
  params: Promise<{ slug: string }>
}

// Step 1: fetch the post (for metadata + the page itself).
async function getPost(slug: string) {
  const post = await db.blogPost.findUnique({
    where: { slug },
    include: { author: { select: { name: true, email: true } } },
  })
  return post
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = (() => {
    try {
      return decodeURIComponent(rawSlug)
    } catch {
      return rawSlug
    }
  })()
  const post = await getPost(slug)
  if (!post || post.status !== 'PUBLISHED') {
    return { title: 'ไม่พบบทความ — Khanom House' }
  }
  return {
    title: `${post.title} — Khanom House`,
    description: post.excerpt ?? 'บทความจาก Khanom House',
    openGraph: {
      title: post.title,
      description: post.excerpt ?? '',
      type: 'article',
    },
  }
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params
  // Next.js 16 sometimes returns URL-encoded path params; decode defensively.
  const slug = (() => {
    try {
      return decodeURIComponent(rawSlug)
    } catch {
      return rawSlug
    }
  })()
  const post = await getPost(slug)

  if (!post || post.status !== 'PUBLISHED') {
    notFound()
  }

  // Increment view count — awaited so the count is reliable. Failures
  // here are swallowed (the page still renders).
  try {
    await db.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    })
  } catch {
    /* ignore — view count is best-effort */
  }

  const cat = CATEGORY_CONFIG[post.category] ?? CATEGORY_CONFIG.article
  const tags = parseTags(post.tags)

  // Render plain text content with line breaks preserved.
  const paragraphs = post.content.split(/\n{2,}/)

  return (
    <div className="min-h-screen bg-[var(--cream)] text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--forest)] text-[var(--gold)] text-lg ring-1 ring-[var(--gold)]/30">
              ❀
            </span>
            <span className="font-bold">Khanom House</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/blog">
              <ArrowLeft className="h-4 w-4" /> บทความทั้งหมด
            </Link>
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        {/* Back link */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground"
        >
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4" /> กลับไปหน้ารวมบทความ
          </Link>
        </Button>

        {/* Cover */}
        <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--forest)] to-[var(--forest)]/80 text-7xl shadow-md md:h-64">
          <span className="drop-shadow-lg">{post.coverEmoji}</span>
          <Badge
            className={`absolute left-4 top-4 text-[11px] ring-1 ring-inset ${cat.cls}`}
          >
            {cat.label}
          </Badge>
        </div>

        {/* Title + meta */}
        <div className="mt-6 space-y-3">
          <h1 className="text-3xl font-bold leading-tight text-[var(--forest)] dark:text-[var(--gold)] md:text-4xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-base text-muted-foreground md:text-lg">{post.excerpt}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {post.author?.name ?? 'ทีมงาน Khanom House'}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {post.publishedAt
                ? formatThaiDate(post.publishedAt, { withDay: true })
                : formatThaiDate(post.updatedAt, { withDay: true })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              เข้าชม {toThaiNumerals(post.viewCount + 1)} ครั้ง
            </span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[10px] text-muted-foreground"
                >
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent" />

        {/* Content — plain text, paragraphs separated by blank lines */}
        <div className="space-y-4">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90 md:text-base md:leading-8"
            >
              {p}
            </p>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-6 text-center">
          <p className="text-2xl">🍰</p>
          <h3 className="mt-2 text-lg font-bold">ลองชิมขนมไทยสดใหม่จากร้านเรา</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ขนมสดทำทุกวัน ส่งไวถึงที่หมาย — สั่งออนไลน์ได้เลย
          </p>
          <Button
            asChild
            className="mt-4 gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
          >
            <Link href="/">
              ดูสินค้าทั้งหมด <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          อัปเดตล่าสุด {formatThaiDateTime(post.updatedAt)}
        </p>
      </article>

      <footer className="mt-12 border-t border-border bg-[var(--forest)] py-6 text-center text-xs text-[var(--gold)]/80">
        <div className="mx-auto max-w-5xl px-4">
          <p>© {new Date().getFullYear() + 543} Khanom House — ขนมไทยโบราณ สูตรตำรับช่างหลวง</p>
        </div>
      </footer>
    </div>
  )
}
