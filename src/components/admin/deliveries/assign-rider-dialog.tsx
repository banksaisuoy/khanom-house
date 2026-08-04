'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bike, Clock, StickyNote } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { avatarInitials } from '@/lib/admin-ui'

type Rider = { id: string; name: string; phone: string | null; role: string }

export function AssignRiderDialog({
  open, onOpenChange, deliveryId, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  deliveryId: string | null
  onSaved: () => void
}) {
  const [riderId, setRiderId] = React.useState('')
  const [eta, setEta] = React.useState('30')
  const [notes, setNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setRiderId(''); setEta('30'); setNotes('')
    }
  }, [open, deliveryId])

  const { data: ridersData } = useQuery<{ users: Rider[] }>({
    queryKey: ['admin-riders'],
    queryFn: async () => {
      const r = await fetch('/api/admin/users?role=RIDER')
      if (!r.ok) return { users: [] }
      const j = await r.json()
      const list: Rider[] = j.users ?? []
      return { users: list.filter((u) => u.role === 'RIDER' || u.role === 'STAFF') }
    },
    enabled: open,
  })

  const riders = ridersData?.users ?? []

  const submit = async () => {
    if (!deliveryId) return
    if (!riderId) {
      toast.error('กรุณาเลือก rider')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/deliveries/${deliveryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId,
          eta: Number(eta) || null,
          notes: notes || undefined,
        }),
      })
      if (!r.ok) throw new Error('มอบหมายไม่สำเร็จ')
      toast.success('มอบหมาย rider เรียบร้อย')
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>มอบหมาย Rider</DialogTitle>
          <DialogDescription>เลือกพนักงานส่งและตั้งเวลาที่คาดว่าจะส่งถึง</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>เลือก Rider</Label>
            <Select value={riderId} onValueChange={setRiderId}>
              <SelectTrigger><SelectValue placeholder="เลือก rider..." /></SelectTrigger>
              <SelectContent>
                {riders.length === 0 ? (
                  <SelectItem value="none" disabled>ไม่มี rider ในระบบ</SelectItem>
                ) : riders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-[var(--gold)]/15 text-[10px] font-bold text-[var(--gold)]">
                          {avatarInitials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">{r.name}</p>
                        {r.phone && <p className="text-[10px] text-muted-foreground">{r.phone}</p>}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ETA (นาที)</Label>
              <div className="relative">
                <Clock className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input type="number" value={eta} onChange={(e) => setEta(e.target.value)} className="pl-7" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>สถานะ</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-xs text-muted-foreground">
                จะตั้งเป็น "รอจัดส่ง"
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <div className="relative">
              <StickyNote className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น โทรก่อนส่ง, ส่งหน้าบ้านเท่านั้น"
                className="min-h-[60px] resize-none pl-7"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            <Bike className="h-4 w-4" />
            {saving ? 'กำลังบันทึก...' : 'มอบหมาย'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
