'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileCheck, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function SlipVerificationClient() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['slips'],
    queryFn: async () => fetch('/api/admin/slip-upload?status=PENDING').then(r => r.json()),
  })
  const verify = useMutation({
    mutationFn: async (id: string) => fetch(`/api/admin/slip-upload/${id}/verify`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => { toast.success('ยืนยันสลิปแล้ว'); qc.invalidateQueries({ queryKey: ['slips'] }) },
  })
  const reject = useMutation({
    mutationFn: async (id: string) => fetch(`/api/admin/slip-upload/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: 'สลิปไม่ถูกต้อง' }), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()),
    onSuccess: () => { toast.success('ปฏิเสธสลิป'); qc.invalidateQueries({ queryKey: ['slips'] }) },
  })

  const slips = data?.slips ?? []
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck className="h-6 w-6 text-primary" /> ตรวจสอบสลิปโอนเงิน</h1>
        <p className="text-sm text-muted-foreground">ตรวจสอบสลิปที่ลูกค้าอัปโหลด</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : slips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">ไม่มีสลิปรอตรวจสอบ</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slips.map((s: any) => (
            <div key={s.id} className="rounded-lg border p-4 space-y-3">
              <div className="aspect-[3/4] bg-muted rounded-md grid place-items-center">
                <img src={s.imageUrl} alt="slip" className="max-h-full max-w-full object-contain rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg">฿{s.amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{s.order?.orderNo || 'ไม่ผูกออเดอร์'}</p>
                <p className="text-xs text-muted-foreground">{s.bankName} • {s.refCode}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => verify.mutate(s.id)}><Check className="h-4 w-4" /> ยืนยัน</Button>
                <Button size="sm" variant="outline" onClick={() => reject.mutate(s.id)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
