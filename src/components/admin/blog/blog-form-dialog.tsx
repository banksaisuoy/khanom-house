'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Wand2, Save, FileUp, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type BlogFormValues = {
  title: string
  slug: string
  excerpt: string
  content: string
  coverEmoji: string
  category: 'article' | 'recipe' | 'news' | 'tips'
  tags: string[]
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

const EMOJI_CHOICES = [
  '📝', '📰', '🍰', '🍮', '🥮', '🍵', '🧁', '🍪', '🥧', '🍩',
  '🍯', '🥥', '🌾', '🌿', '🌸', '🌺', '🏵️', '❀', '👑', '⭐',
  '📖', '✏️', '💡', '🔖', '📣', '🎉', '🎊', '🛍️', '📅', '🌟',
]

function slugifyThai(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\u0E00-\u0E7F\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Partial<BlogFormValues> & { id?: string }
  onSaved: () => void
}

export function BlogFormDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const isEdit = !!initial?.id
  const [title, setTitle] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [excerpt, setExcerpt] = React.useState('')
  const [content, setContent] = React.useState('')
  const [coverEmoji, setCoverEmoji] = React.useState('📝')
  const [category, setCategory] = React.useState<BlogFormValues['category']>('article')
  const [tagsInput, setTagsInput] = React.useState('')
  const [status, setStatus] = React.useState<BlogFormValues['status']>('DRAFT')
  const [saving, setSaving] = React.useState(false)

  // Reset form whenever the dialog opens (or initial changes).
  React.useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setSlug(initial?.slug ?? '')
    setSlugTouched(!!initial?.slug)
    setExcerpt(initial?.excerpt ?? '')
    setContent(initial?.content ?? '')
    setCoverEmoji(initial?.coverEmoji ?? '📝')
    setCategory((initial?.category as BlogFormValues['category']) ?? 'article')
    setTagsInput((initial?.tags ?? []).join(', '))
    setStatus((initial?.status as BlogFormValues['status']) ?? 'DRAFT')
  }, [open, initial])

  // Auto-generate slug from title unless the user has manually edited the slug.
  React.useEffect(() => {
    if (!slugTouched) {
      setSlug(slugifyThai(title))
    }
  }, [title, slugTouched])

  const parsedTags = React.useMemo(
    () =>
      tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput]
  )

  const canSave = title.trim().length > 0 && content.trim().length > 0

  const save = async () => {
    if (!canSave) {
      toast.error('กรุณาระบุหัวข้อและเนื้อหา')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || slugifyThai(title),
        excerpt: excerpt.trim(),
        content: content,
        coverEmoji,
        category,
        tags: parsedTags,
        status,
      }

      const r = isEdit
        ? await fetch(`/api/admin/blog/${initial!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data?.error || 'บันทึกไม่สำเร็จ')

      toast.success(isEdit ? 'แก้ไขบทความแล้ว' : 'สร้างบทความแล้ว')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{coverEmoji}</span>
            {isEdit ? 'แก้ไขบทความ' : 'เขียนบทความใหม่'}
          </DialogTitle>
          <DialogDescription>
            สร้างเนื้อหาบทความ สูตรขนม ข่าวสาร หรือเคล็ดลับ — เลือก emoji หน้าปกและหมวดหมู่ให้เหมาะสม
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="blog-title">หัวข้อบทความ *</Label>
            <Input
              id="blog-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น: วิธีทำทองหยิบโบราณ สูตรช่างหลวง"
              className="h-10"
            />
          </div>

          {/* Slug */}
          <div className="grid gap-1.5">
            <Label htmlFor="blog-slug" className="flex items-center justify-between">
              <span>Slug (URL)</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                onClick={() => {
                  setSlug(slugifyThai(title))
                  setSlugTouched(true)
                }}
              >
                <Wand2 className="h-3 w-3" /> สร้างใหม่
              </Button>
            </Label>
            <Input
              id="blog-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugTouched(true)
              }}
              placeholder="auto-from-title"
              className="h-10 font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              URL: /blog/{slug || 'auto-from-title'}
            </p>
          </div>

          {/* Category + Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>หมวดหมู่</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as BlogFormValues['category'])}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">📝 บทความ</SelectItem>
                  <SelectItem value="recipe">🍰 สูตรขนม</SelectItem>
                  <SelectItem value="news">📰 ข่าวสาร</SelectItem>
                  <SelectItem value="tips">💡 เคล็ดลับ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>สถานะ</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BlogFormValues['status'])}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">ร่าง (ไม่เผยแพร่)</SelectItem>
                  <SelectItem value="PUBLISHED">เผยแพร่</SelectItem>
                  <SelectItem value="ARCHIVED">เก็บถาวร์</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cover emoji picker */}
          <div className="grid gap-1.5">
            <Label>หน้าปก (Emoji)</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-3xl ring-1 ring-[var(--gold)]/30">
                {coverEmoji}
              </div>
              <div className="grid flex-1 grid-cols-10 gap-1 rounded-lg border bg-muted/20 p-2 sm:grid-cols-15">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setCoverEmoji(e)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md text-lg transition-colors hover:bg-[var(--gold)]/20',
                      coverEmoji === e && 'bg-[var(--gold)]/30 ring-1 ring-[var(--gold)]'
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Excerpt */}
          <div className="grid gap-1.5">
            <Label htmlFor="blog-excerpt">เกริ่นนำ (excerpt)</Label>
            <Textarea
              id="blog-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="สรุปสั้นๆ 1-2 บรรทัด ใช้ในการ์ดบนหน้ารวมบทความ"
              rows={2}
              maxLength={200}
            />
            <p className="text-[11px] text-muted-foreground">
              {excerpt.length}/200 ตัวอักษร
            </p>
          </div>

          {/* Content */}
          <div className="grid gap-1.5">
            <Label htmlFor="blog-content">เนื้อหา *</Label>
            <Textarea
              id="blog-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="เนื้อหาบทความ — ขึ้นบรรทัดใหม่ด้วย Enter"
              rows={10}
              className="font-sans"
            />
            <p className="text-[11px] text-muted-foreground">
              {content.length.toLocaleString()} ตัวอักษร
            </p>
          </div>

          {/* Tags */}
          <div className="grid gap-1.5">
            <Label htmlFor="blog-tags">แท็ก (คั่นด้วยจุลภาค)</Label>
            <Input
              id="blog-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ขนมไทย, สูตร, ทองหยิบ"
              className="h-10"
            />
            {parsedTags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {parsedTags.map((t, i) => (
                  <motion.div
                    key={`${t}-${i}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Badge variant="outline" className="text-[10px]">
                      #{t}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          {status !== 'PUBLISHED' && (
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('ARCHIVED')
                setTimeout(save, 0)
              }}
              disabled={saving || !canSave}
              className="gap-1.5"
            >
              <Archive className="h-4 w-4" /> บันทึกเป็นฉบับร่าง
            </Button>
          )}
          <Button
            onClick={save}
            disabled={saving || !canSave}
            className="gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]"
          >
            {saving ? (
              <Save className="h-4 w-4 animate-pulse" />
            ) : status === 'PUBLISHED' ? (
              <FileUp className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {status === 'PUBLISHED' ? 'เผยแพร่บทความ' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
