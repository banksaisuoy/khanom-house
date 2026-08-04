import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, noContent, handle, badRequest, NotFoundError } from '@/lib/api-response'
import { requirePermission } from '@/lib/auth'
import { logAudit, safeJson } from '@/lib/audit'

// ============================================================
// GET /api/admin/blog/[id]
// ============================================================
export const GET = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requirePermission(req, 'dashboard.read')
  const { id } = await ctx.params

  const post = await db.blogPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  })
  if (!post) throw new NotFoundError('ไม่พบบทความ')

  return ok({
    ...post,
    tags: post.tags,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
  })
})

// ============================================================
// PATCH /api/admin/blog/[id]
// ============================================================
interface PatchPayload {
  title?: string
  slug?: string
  excerpt?: string | null
  content?: string
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
    .replace(/[^\w\u0E00-\u0E7F\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function isEmoji(s: string): boolean {
  if (!s) return false
  try {
    return EMOJI_PATTERN.test(s)
  } catch {
    return s.length <= 4
  }
}

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requirePermission(req, 'dashboard.read')
  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as PatchPayload

  const existing = await db.blogPost.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('ไม่พบบทความ')

  const data: Record<string, unknown> = {}

  if (body.title !== undefined) {
    if (!body.title.trim()) return badRequest('หัวข้อห้ามว่าง')
    data.title = body.title.trim()
  }
  if (body.slug !== undefined && body.slug.trim() !== existing.slug) {
    const newSlug = slugifyThai(body.slug) || slugifyThai(existing.title)
    if (newSlug && newSlug !== existing.slug) {
      const clash = await db.blogPost.findUnique({ where: { slug: newSlug } })
      if (clash && clash.id !== id) return badRequest('slug ซ้ำกับบทความอื่น')
      data.slug = newSlug
    }
  }
  if (body.excerpt !== undefined) data.excerpt = body.excerpt?.trim() || null
  if (body.content !== undefined) {
    if (!body.content.trim()) return badRequest('เนื้อหาห้ามว่าง')
    data.content = body.content
  }
  if (body.coverEmoji !== undefined && isEmoji(body.coverEmoji)) data.coverEmoji = body.coverEmoji
  if (body.category !== undefined && VALID_CATEGORIES.includes(body.category)) {
    data.category = body.category
  }
  if (body.tags !== undefined) {
    data.tags = JSON.stringify(
      Array.isArray(body.tags)
        ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
        : []
    )
  }
  if (body.status !== undefined && VALID_STATUSES.includes(body.status)) {
    data.status = body.status
    // Set publishedAt when transitioning to PUBLISHED for the first time
    if (body.status === 'PUBLISHED' && !existing.publishedAt) {
      data.publishedAt = new Date()
    }
    // Clear if going back to DRAFT? Keep publishedAt — useful record.
  }

  const updated = await db.blogPost.update({
    where: { id },
    data,
  })

  await logAudit({
    userId: user.id,
    action: 'UPDATE',
    entity: 'BlogPost',
    entityId: id,
    oldValue: safeJson({
      title: existing.title,
      slug: existing.slug,
      status: existing.status,
    }),
    newValue: safeJson({
      title: updated.title,
      slug: updated.slug,
      status: updated.status,
    }),
  })

  return ok({
    id: updated.id,
    slug: updated.slug,
    status: updated.status,
  })
})

// ============================================================
// DELETE /api/admin/blog/[id]
// ============================================================
export const DELETE = handle(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requirePermission(req, 'dashboard.read')
    const { id } = await ctx.params

    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('ไม่พบบทความ')

    await db.blogPost.delete({ where: { id } })

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'BlogPost',
      entityId: id,
      oldValue: safeJson({ title: existing.title, slug: existing.slug }),
    })

    return noContent()
  }
)
