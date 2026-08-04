'use client'

import * as React from 'react'
import { Star, MessageSquare, BadgeCheck, Reply, Send } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatTHB, formatNumber, type ProductDTO } from '@/lib/types'

interface ReviewItem {
  id: string
  customerName: string
  rating: number
  title: string | null
  comment: string | null
  images: string[]
  isVerified: boolean
  reply: string | null
  repliedAt: string | null
  helpfulCount: number
  createdAt: string
}

interface ReviewSummary {
  average: number
  count: number
  distribution: Record<number, number>
}

interface Props {
  product: ProductDTO | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ height: size, width: size }}
          className={i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/40'}
        />
      ))}
    </div>
  )
}

export function ProductReviewsDialog({ product, open, onOpenChange }: Props) {
  const [reviews, setReviews] = React.useState<ReviewItem[]>([])
  const [summary, setSummary] = React.useState<ReviewSummary | null>(null)
  const [loading, setLoading] = React.useState(false)

  // Submit form
  const [name, setName] = React.useState('')
  const [rating, setRating] = React.useState(5)
  const [title, setTitle] = React.useState('')
  const [comment, setComment] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [showForm, setShowForm] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!product) return
    setLoading(true)
    try {
      const r = await fetch(`/api/reviews?productId=${product.id}`, { cache: 'no-store' })
      if (!r.ok) throw new Error('fetch failed')
      const j = await r.json()
      setReviews(j.reviews ?? [])
      setSummary(j.summary ?? null)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [product])

  React.useEffect(() => {
    if (open && product) {
      load()
      // reset form
      setName('')
      setRating(5)
      setTitle('')
      setComment('')
      setShowForm(false)
    }
  }, [open, product, load])

  const submit = async () => {
    if (!product) return
    if (!name.trim()) {
      toast.error('กรุณาระบุชื่อ')
      return
    }
    if (!rating || rating < 1 || rating > 5) {
      toast.error('กรุณาให้คะแนน 1-5 ดาว')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerName: name.trim(),
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'ส่งรีวิวไม่สำเร็จ')
      toast.success(j.message || 'ขอบคุณสำหรับรีวิว!')
      setName('')
      setTitle('')
      setComment('')
      setRating(5)
      setShowForm(false)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-gold" />
            รีวิว: {product?.name}
          </DialogTitle>
          {summary && summary.count > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{summary.average.toFixed(1)}</span>
                <div>
                  <Stars value={summary.average} size={14} />
                  <p className="text-[10px] text-muted-foreground">
                    {formatNumber(summary.count)} รีวิว
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex flex-1 flex-col gap-0.5">
                {[5, 4, 3, 2, 1].map((s) => {
                  const c = summary.distribution[s] ?? 0
                  const pct = summary.count > 0 ? (c / summary.count) * 100 : 0
                  return (
                    <div key={s} className="flex items-center gap-2 text-[10px]">
                      <span className="w-4 text-muted-foreground">{s}★</span>
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="absolute inset-y-0 left-0 bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right tabular-nums text-muted-foreground">{c}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="max-h-[55vh] flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="font-medium">ยังไม่มีรีวิวสำหรับสินค้านี้</p>
              <p className="text-xs text-muted-foreground">เป็นคนแรกที่รีวิวสินค้าชิ้นนี้สิ!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                        {r.customerName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{r.customerName}</span>
                          {r.isVerified && (
                            <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-400 text-[9px] gap-0.5">
                              <BadgeCheck className="h-2.5 w-2.5" /> ซื้อจริง
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Stars value={r.rating} size={11} />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
                  {r.comment && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{r.comment}</p>}
                  {r.images.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {r.images.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt={`รูปที่ ${i + 1}`}
                          className="h-16 w-16 rounded-md border object-cover"
                        />
                      ))}
                    </div>
                  )}
                  {r.reply && (
                    <div className="mt-2 rounded-md border-l-2 border-gold bg-gold/5 p-2">
                      <p className="text-[10px] uppercase text-gold">ตอบกลับจากร้าน</p>
                      <p className="mt-0.5 text-xs text-foreground/80 whitespace-pre-wrap">{r.reply}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Submit form */}
        {showForm ? (
          <div className="border-t p-3 space-y-2">
            <p className="text-sm font-semibold">เขียนรีวิวของคุณ</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">ชื่อ *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อของคุณ" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">คะแนน *</Label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      aria-label={`${i + 1} ดาว`}
                    >
                      <Star
                        className={cn(
                          'h-6 w-6 transition',
                          i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หัวข้อ</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น อร่อยมาก!" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ความคิดเห็น</Label>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="แชร์ประสบการณ์ของคุณ..."
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t pt-3">
          {showForm ? (
            <>
              <Button variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
              <Button
                onClick={submit}
                disabled={submitting}
                className="gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
              className="gap-1.5"
            >
              <Reply className="h-3.5 w-3.5" /> เขียนรีวิว
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
