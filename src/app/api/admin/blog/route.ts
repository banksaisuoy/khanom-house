import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, created, handle, badRequest } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// GET /api/admin/blog
// List posts (admin view — all statuses). Permission: dashboard.read
// ============================================================
export const GET = handle(async (req: NextRequest) => {
  await requirePermission(req, 'dashboard.read')

  const url = new URL(req.url)
  const status = url.searchParams.get('status') // DRAFT | PUBLISHED | ARCHIVED
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')?.trim()

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (category) where.category = category
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { excerpt: { contains: q } },
      { content: { contains: q } },
    ]
  }

  const posts = await db.blogPost.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    take: 200,
  })

  const total = await db.blogPost.count({ where })
  const published = await db.blogPost.count({ where: { status: 'PUBLISHED' } })
  const draft = await db.blogPost.count({ where: { status: 'DRAFT' } })
  const archived = await db.blogPost.count({ where: { status: 'ARCHIVED' } })
  const totalViews = await db.blogPost.aggregate({ _sum: { viewCount: true } })

  return ok({
    posts: posts.map((p) => ({
      ...p,
      tags: p.tags,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      publishedAt: p.publishedAt?.toISOString() ?? null,
    })),
    stats: {
      total,
      published,
      draft,
      archived,
      totalViews: totalViews._sum.viewCount ?? 0,
    },
  })
})

// ============================================================
// POST /api/admin/blog
// Create new post. Permission: dashboard.read (any admin)
// ============================================================
interface CreatePayload {
  title: string
  slug?: string
  excerpt?: string
  content: string
  coverEmoji?: string
  category?: string
  tags?: string[]
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

const VALID_CATEGORIES = ['article', 'recipe', 'news', 'tips']
const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED']
const EMOJI_PATTERN = /^(\p{Extended_Pictographic}|\p{Emoji})(\u200d\p{Emoji})*$/u

function slugifyThai(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\u0E00-\u0E7F\s-]/g, '') // keep word chars + Thai + space + dash
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function isEmoji(s: string): boolean {
  if (!s) return false
  try {
    return EMOJI_PATTERN.test(s)
  } catch {
    // Some runtimes don't support \p{Extended_Pictographic}; fall back to length check
    return s.length <= 4
  }
}

export const POST = handle(async (req: NextRequest) => {
  const user = await requirePermission(req, 'dashboard.read')
  const body = (await req.json().catch(() => ({}))) as CreatePayload

  if (!body.title?.trim() || !body.content?.trim()) {
    return badRequest('กรุณาระบุหัวข้อและเนื้อหา')
  }

  const status = body.status && VALID_STATUSES.includes(body.status) ? body.status : 'DRAFT'
  const category =
    body.category && VALID_CATEGORIES.includes(body.category) ? body.category : 'article'

  // Emoji guard — if it isn't a single emoji, fall back to default.
  const coverEmoji = body.coverEmoji && isEmoji(body.coverEmoji) ? body.coverEmoji : '📝'

  // Slug — generate from title if not provided. Ensure uniqueness.
  let slug = body.slug?.trim() ? slugifyThai(body.slug) : slugifyThai(body.title)
  if (!slug) slug = `post-${Date.now()}`
  const existing = await db.blogPost.findUnique({ where: { slug } })
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  // Tags — sanitize to array of trimmed strings.
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
    : []

  const isPublish = status === 'PUBLISHED'

  const post = await db.blogPost.create({
    data: {
      title: body.title.trim(),
      slug,
      excerpt: body.excerpt?.trim() || null,
      content: body.content,
      coverEmoji,
      category,
      tags: JSON.stringify(tags),
      status,
      authorId: user.id,
      publishedAt: isPublish ? new Date() : null,
    },
  })

  await logAudit({
    userId: user.id,
    action: 'CREATE',
    entity: 'BlogPost',
    entityId: post.id,
    newValue: safeJson({ title: post.title, slug: post.slug, status: post.status }),
  })

  return created({
    id: post.id,
    slug: post.slug,
    status: post.status,
  })
})
