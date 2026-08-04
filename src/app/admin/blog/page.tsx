import { db } from '@/lib/db'
import { BlogClient, type BlogRow } from '@/components/admin/blog/blog-client'

export const dynamic = 'force-dynamic'

export default async function BlogAdminPage() {
  const posts = await db.blogPost.findMany({
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
    take: 200,
  })

  const initial: BlogRow[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? '',
    content: p.content,
    coverEmoji: p.coverEmoji,
    category: p.category as 'article' | 'recipe' | 'news' | 'tips',
    tags: safeParseTags(p.tags),
    status: p.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    viewCount: p.viewCount,
    authorId: p.authorId,
    authorName: p.author?.name ?? '—',
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    publishedAt: p.publishedAt?.toISOString() ?? null,
  }))

  return <BlogClient initialPosts={initial} />
}

function safeParseTags(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map((x) => String(x)) : []
  } catch {
    return []
  }
}
