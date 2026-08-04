'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { RotateCcw, Check, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function RefundsClient() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const { data, isLoading } = useQuery({
    queryKey: ['refunds', filter],
    queryFn: async () => {
      const r = await fetch(`/api/admin/refunds?status=${filter === 'all' ? '' : filter}`)
      return r.json()
    },
  })
  const approve = useMutation({
    mutationFn: async (id: string) => fetch(`/api/admin/refunds/${id}/approve`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => { toast.success('อนุมัติแล้ว'); qc.invalidateQueries({ queryKey: ['refunds'] }) },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'),
  })
  const complete = useMutation({
    mutationFn: async (id: string) => fetch(`/api/admin/refunds/${id}/complete`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => { toast.success('ดำเนินการเสร็จสิ้น'); qc.invalidateQueries({ queryKey: ['refunds'] }) },
  })
  const reject = useMutation({
    mutationFn: async (id: string) => fetch(`/api/admin/refunds/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: 'ปฏิเสธ' }), headers: { 'Content-Type': 'application/json' } }).then(r => r.json()),
    onSuccess: () => { toast.success('ปฏิเสธแล้ว'); qc.invalidateQueries({ queryKey: ['refunds'] }) },
  })

  const refunds = data?.refunds ?? []
  const statusConfig: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'รออนุมัติ', cls: 'bg-amber-100 text-amber-700' },
    APPROVED: { label: 'อนุมัติแล้ว', cls: 'bg-blue-100 text-blue-700' },
    COMPLETED: { label: 'เสร็จสิ้น', cls: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'ปฏิเสธ', cls: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="h-6 w-6 text-primary" /> คืนสินค้า / คืนเงิน</h1>
          <p className="text-sm text-muted-foreground">จัดการคำขอคืนเงินและคืนสินค้า</p>
        </div>
      </div>
      <div className="flex gap-2">
        {['all', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
            {s === 'all' ? 'ทั้งหมด' : statusConfig[s]?.label || s}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : refunds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">ไม่มีคำขอคืนเงิน</div>
      ) : (
        <div className="space-y-2">
          {refunds.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{r.refundNo}</span>
                  <Badge className={statusConfig[r.status]?.cls} variant="secondary">{statusConfig[r.status]?.label}</Badge>
                  <Badge variant="outline">{r.type === 'FULL' ? 'คืนทั้งบิล' : 'คืนบางส่วน'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.order?.orderNo || r.posBill?.billNo || '—'} • {r.reason}
                </p>
                <p className="text-sm">฿{r.refundAmount.toLocaleString()} • {r.refundMethod === 'CASH' ? 'เงินสด' : r.refundMethod === 'STORE_CREDIT' ? 'เครดิตร้าน' : r.refundMethod}</p>
              </div>
              <div className="flex gap-2">
                {r.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => approve.mutate(r.id)}><Check className="h-4 w-4" /> อนุมัติ</Button>
                    <Button size="sm" variant="outline" onClick={() => reject.mutate(r.id)}><X className="h-4 w-4" /></Button>
                  </>
                )}
                {r.status === 'APPROVED' && (
                  <Button size="sm" onClick={() => complete.mutate(r.id)}><Clock className="h-4 w-4" /> ดำเนินการ</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
