'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Gift, Plus, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function GiftCardsClient() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: 500, buyerName: '', buyerPhone: '', recipientName: '', recipientEmail: '', message: '' })
  const { data, isLoading } = useQuery({ queryKey: ['gift-cards'], queryFn: async () => fetch('/api/admin/gift-cards').then(r => r.json()) })
  const create = useMutation({
    mutationFn: async () => fetch('/api/admin/gift-cards', { method: 'POST', body: JSON.stringify(form), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()),
    onSuccess: (d) => { toast.success(`สร้างบัตรของขวัญ ${d.code} แล้ว`); setOpen(false); qc.invalidateQueries({ queryKey: ['gift-cards'] }) },
  })
  const cards = data?.cards ?? []
  const statusConfig: Record<string, { label: string; cls: string }> = { ACTIVE: { label: 'ใช้ได้', cls: 'bg-green-100 text-green-700' }, USED: { label: 'ใช้แล้ว', cls: 'bg-gray-100 text-gray-600' }, EXPIRED: { label: 'หมดอายุ', cls: 'bg-red-100 text-red-700' } }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="h-6 w-6 text-primary" /> บัตรของขวัญ</h1><p className="text-sm text-muted-foreground">จัดการ e-Gift Card</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> สร้างบัตร</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>สร้างบัตรของขวัญ</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>มูลค่า (฿)</Label><div className="flex gap-2 mt-1">{[200, 500, 1000, 2000].map(a => <Button key={a} size="sm" variant={form.amount === a ? 'default' : 'outline'} onClick={() => setForm({ ...form, amount: a })}>฿{a}</Button>)}</div></div>
              <div><Label>ผู้ซื้อ</Label><Input value={form.buyerName} onChange={e => setForm({ ...form, buyerName: e.target.value })} placeholder="ชื่อ" /></div>
              <div><Label>เบอร์ผู้ซื้อ</Label><Input value={form.buyerPhone} onChange={e => setForm({ ...form, buyerPhone: e.target.value })} placeholder="08x-xxx-xxxx" /></div>
              <div><Label>ผู้รับ</Label><Input value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })} placeholder="ชื่อผู้รับ" /></div>
              <div><Label>อีเมลผู้รับ</Label><Input value={form.recipientEmail} onChange={e => setForm({ ...form, recipientEmail: e.target.value })} placeholder="email@example.com" /></div>
              <div><Label>ข้อความอวยพร</Label><Input value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="สุขสันต์วันเกิด!" /></div>
              <Button className="w-full" onClick={() => create.mutate()}>สร้างบัตร</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-32" /> : cards.length === 0 ? <div className="text-center py-12 text-muted-foreground">ยังไม่มีบัตรของขวัญ</div> : (
        <div className="grid gap-3">
          {cards.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg">{c.code}</span>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.code); toast.success('คัดลอกโค้ดแล้ว') }}><Copy className="h-3 w-3" /></Button>
                  <Badge className={statusConfig[c.status]?.cls} variant="secondary">{statusConfig[c.status]?.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">฿{c.balance.toLocaleString()} / ฿{c.amount.toLocaleString()} • {c.buyerName || '—'} → {c.recipientName || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
