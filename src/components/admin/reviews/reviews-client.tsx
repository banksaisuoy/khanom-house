'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function ReviewsClient() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['reviews'], queryFn: async () => fetch('/api/reviews').then(r => r.json()) })
  const reply = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => fetch(`/api/admin/reviews/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply: text }), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()),
    onSuccess: () => { toast.success('ตอบกลับแล้ว'); qc.invalidateQueries({ queryKey: ['reviews'] }) },
  })
  const reviews = data?.reviews ?? []
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-primary" /> รีวิวสินค้า</h1><p className="text-sm text-muted-foreground">จัดการรีวิวจากลูกค้า</p></div>
      {isLoading ? <Skeleton className="h-32" /> : reviews.length === 0 ? <div className="text-center py-12 text-muted-foreground">ยังไม่มีรีวิว</div> : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.customerName}</span>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-muted'}`} />)}</div>
                  {r.isVerified && <Badge variant="secondary" className="bg-green-100 text-green-700">ซื้อแล้ว</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('th-TH')}</span>
              </div>
              {r.title && <p className="font-medium">{r.title}</p>}
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              {r.reply && <div className="rounded-md bg-muted p-2 text-sm"><span className="font-medium">ร้านตอบ:</span> {r.reply}</div>}
              {!r.reply && <Button size="sm" variant="outline" onClick={() => { const t = prompt('ข้อความตอบกลับ'); if (t) reply.mutate({ id: r.id, text: t }) }}><MessageSquare className="h-3 w-3" /> ตอบกลับ</Button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
