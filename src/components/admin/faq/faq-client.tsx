'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { HelpCircle, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function FaqClient() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ question: '', answer: '', category: 'general' })
  const { data, isLoading } = useQuery({ queryKey: ['faq'], queryFn: async () => fetch('/api/admin/faq').then(r => r.json()) })
  const create = useMutation({
    mutationFn: async () => fetch('/api/admin/faq', { method: 'POST', body: JSON.stringify(form), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()),
    onSuccess: () => { toast.success('เพิ่ม FAQ แล้ว'); setOpen(false); qc.invalidateQueries({ queryKey: ['faq'] }) },
  })
  const del = useMutation({
    mutationFn: async (id: string) => fetch(`/api/admin/faq/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { toast.success('ลบแล้ว'); qc.invalidateQueries({ queryKey: ['faq'] }) },
  })
  const catLabel: Record<string, string> = { general: 'ทั่วไป', shipping: 'การจัดส่ง', payment: 'การชำระเงิน', product: 'สินค้า', return: 'การคืนเงิน' }
  const faqs = data?.faqs ?? []
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><HelpCircle className="h-6 w-6 text-primary" /> คำถามที่พบบ่อย</h1><p className="text-sm text-muted-foreground">จัดการ FAQ</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> เพิ่มคำถาม</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>เพิ่มคำถามใหม่</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>หมวดหมู่</Label><select className="w-full rounded-md border p-2" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{Object.entries(catLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div><Label>คำถาม</Label><Input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} /></div>
              <div><Label>คำตอบ</Label><Textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} rows={4} /></div>
              <Button className="w-full" onClick={() => create.mutate()}>เพิ่ม</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-32" /> : faqs.length === 0 ? <div className="text-center py-12 text-muted-foreground">ยังไม่มี FAQ</div> : (
        <div className="space-y-2">
          {faqs.map((f: any) => (
            <div key={f.id} className="flex items-start justify-between rounded-lg border p-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2"><Badge variant="secondary">{catLabel[f.category] || f.category}</Badge>{!f.isPublished && <Badge variant="outline">ซ่อน</Badge>}</div>
                <p className="font-medium">{f.question}</p>
                <p className="text-sm text-muted-foreground">{f.answer}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
