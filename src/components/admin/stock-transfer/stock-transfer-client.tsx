'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, Ship, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function StockTransferClient() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['transfers'], queryFn: async () => fetch('/api/admin/stock-transfer').then(r => r.json()) })
  const ship = useMutation({ mutationFn: async (id: string) => fetch(`/api/admin/stock-transfer/${id}/ship`, { method: 'POST' }).then(r => r.json()), onSuccess: () => { toast.success('จัดส่งแล้ว'); qc.invalidateQueries({ queryKey: ['transfers'] }) }, onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด') })
  const receive = useMutation({ mutationFn: async (id: string) => fetch(`/api/admin/stock-transfer/${id}/receive`, { method: 'POST' }).then(r => r.json()), onSuccess: () => { toast.success('รับสินค้าแล้ว'); qc.invalidateQueries({ queryKey: ['transfers'] }) }, onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด') })
  const cancel = useMutation({ mutationFn: async (id: string) => fetch(`/api/admin/stock-transfer/${id}/cancel`, { method: 'POST' }).then(r => r.json()), onSuccess: () => { toast.success('ยกเลิกแล้ว'); qc.invalidateQueries({ queryKey: ['transfers'] }) } })
  const statusConfig: Record<string, { label: string; cls: string }> = { PENDING: { label: 'รอจัดส่ง', cls: 'bg-amber-100 text-amber-700' }, IN_TRANSIT: { label: 'กำลังขนส่ง', cls: 'bg-blue-100 text-blue-700' }, RECEIVED: { label: 'รับแล้ว', cls: 'bg-green-100 text-green-700' }, CANCELLED: { label: 'ยกเลิก', cls: 'bg-red-100 text-red-700' } }
  const transfers = data?.transfers ?? []
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><ArrowLeftRight className="h-6 w-6 text-primary" /> โอนสต็อกระหว่างสาขา</h1><p className="text-sm text-muted-foreground">จัดการใบโอนสินค้า</p></div>
      {isLoading ? <Skeleton className="h-32" /> : transfers.length === 0 ? <div className="text-center py-12 text-muted-foreground">ยังไม่มีใบโอน</div> : (
        <div className="space-y-2">
          {transfers.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2"><span className="font-mono font-bold">{t.transferNo}</span><Badge className={statusConfig[t.status]?.cls} variant="secondary">{statusConfig[t.status]?.label}</Badge></div>
                <p className="text-sm">{t.fromBranch?.name} → {t.toBranch?.name} • {t.totalItems} ชิ้น</p>
                <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString('th-TH')}</p>
              </div>
              <div className="flex gap-2">
                {t.status === 'PENDING' && <><Button size="sm" onClick={() => ship.mutate(t.id)}><Ship className="h-4 w-4" /> จัดส่ง</Button><Button size="sm" variant="outline" onClick={() => cancel.mutate(t.id)}><X className="h-4 w-4" /></Button></>}
                {t.status === 'IN_TRANSIT' && <Button size="sm" onClick={() => receive.mutate(t.id)}><Check className="h-4 w-4" /> รับสินค้า</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
