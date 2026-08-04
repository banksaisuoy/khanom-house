'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export function DeliveryZonesClient() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', districts: '', shippingFee: 40, freeShippingThreshold: 500, estimatedDays: 1 })
  const { data, isLoading } = useQuery({ queryKey: ['zones'], queryFn: async () => fetch('/api/admin/delivery-zones').then(r => r.json()) })
  const create = useMutation({
    mutationFn: async () => fetch('/api/admin/delivery-zones', { method: 'POST', body: JSON.stringify({ ...form, districts: form.districts.split(',').map((s: string) => s.trim()).filter(Boolean) }), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()),
    onSuccess: () => { toast.success('เพิ่มโซนแล้ว'); setOpen(false); qc.invalidateQueries({ queryKey: ['zones'] }) },
  })
  const del = useMutation({ mutationFn: async (id: string) => fetch(`/api/admin/delivery-zones/${id}`, { method: 'DELETE' }).then(r => r.json()), onSuccess: () => { toast.success('ลบแล้ว'); qc.invalidateQueries({ queryKey: ['zones'] }) } })
  const zones = data?.zones ?? []
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" /> พื้นที่จัดส่ง</h1><p className="text-sm text-muted-foreground">ตั้งค่าโซนและค่าจัดส่ง</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> เพิ่มโซน</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>เพิ่มพื้นที่จัดส่ง</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>ชื่อโซน</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="กรุงเทพในเมือง" /></div>
              <div><Label>เขต/อำเภอ (คั่นด้วยจุลภาค)</Label><Input value={form.districts} onChange={e => setForm({ ...form, districts: e.target.value })} placeholder="สีลม,สุรวงศ์,บางรัก" /></div>
              <div><Label>ค่าจัดส่ง (฿)</Label><Input type="number" value={form.shippingFee} onChange={e => setForm({ ...form, shippingFee: +e.target.value })} /></div>
              <div><Label>ฟรีค่าส่งเมื่อซื้อครบ (฿)</Label><Input type="number" value={form.freeShippingThreshold} onChange={e => setForm({ ...form, freeShippingThreshold: +e.target.value })} /></div>
              <div><Label>ระยะเวลาจัดส่ง (วัน)</Label><Input type="number" value={form.estimatedDays} onChange={e => setForm({ ...form, estimatedDays: +e.target.value })} /></div>
              <Button className="w-full" onClick={() => create.mutate()}>เพิ่ม</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-32" /> : zones.length === 0 ? <div className="text-center py-12 text-muted-foreground">ยังไม่มีพื้นที่จัดส่ง</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {zones.map((z: any) => (
            <div key={z.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between"><h3 className="font-bold">{z.name}</h3><Button size="sm" variant="ghost" onClick={() => del.mutate(z.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
              <p className="text-sm text-muted-foreground">{z.districts.join(', ')}</p>
              <div className="flex items-center gap-2 text-sm"><Badge variant="secondary">฿{z.shippingFee}</Badge><span className="text-muted-foreground">ฟรีเมื่อครบ ฿{z.freeShippingThreshold}</span></div>
              <p className="text-xs text-muted-foreground">จัดส่งภายใน {z.estimatedDays} วัน</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
