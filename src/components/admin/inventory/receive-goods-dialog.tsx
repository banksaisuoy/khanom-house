'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { PackagePlus, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { INVENTORY_TYPES, type ProductAdminDTO } from '@/lib/admin-catalog'
import { formatNumber, toThaiNumerals } from '@/lib/thai-date'

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  branchId: string
  branchName: string
  onDone: () => void
}

export function ReceiveGoodsDialog({ open, onOpenChange, branchId, branchName, onDone }: Props) {
  const [products, setProducts] = React.useState<ProductAdminDTO[] | null>(null)
  const [productId, setProductId] = React.useState('')
  const [invType, setInvType] = React.useState('FINISHED')
  const [qty, setQty] = React.useState<number | ''>('')
  const [batchNo, setBatchNo] = React.useState('')
  const [expiryAt, setExpiryAt] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setProductId('')
    setInvType('FINISHED')
    setQty('')
    setBatchNo('')
    setExpiryAt('')
    setLocation('')
    fetch('/api/admin/products', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setProducts(d.products as ProductAdminDTO[]))
      .catch(() => setProducts([]))
  }, [open])

  const selected = products?.find((p) => p.id === productId)

  function suggestBatch() {
    const d = new Date()
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    setBatchNo(`B-${ymd}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`)
  }

  async function submit() {
    if (!productId) { toast.error('กรุณาเลือกสินค้า'); return }
    if (qty === '' || Number(qty) <= 0) { toast.error('กรุณาระบุจำนวน'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          branchId,
          type: 'IN',
          quantity: Number(qty),
          reason: `รับเข้าสินค้า${batchNo ? ` แบตช์ ${batchNo}` : ''}`,
          refType: 'PO',
          batchNo: batchNo.trim() || null,
          expiryAt: expiryAt ? new Date(expiryAt).toISOString() : null,
          location: location.trim() || null,
          inventoryType: invType,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => null)
        throw new Error(e?.error || 'รับเข้าไม่สำเร็จ')
      }
      toast.success(`รับเข้า ${toThaiNumerals(Number(qty))} ${selected?.unit ?? 'ชิ้น'} แล้ว`)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'รับเข้าไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-[var(--gold)]" />
            รับเข้าสินค้า
          </DialogTitle>
          <DialogDescription>
            บันทึกการรับสินค้าเข้าคลัง · {branchName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">สินค้า *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={products === null ? 'กำลังโหลด...' : 'เลือกสินค้า'} />
              </SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.sku} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className="py-0 font-normal">{selected.unit}</Badge>
                <span>คงเหลือปัจจุบัน {formatNumber(selected.totalStock)} {selected.unit}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ประเภทสต็อก</Label>
              <Select value={invType} onValueChange={setInvType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">จำนวน *</Label>
              <Input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">หมายเลขแบตช์</Label>
            <div className="flex gap-1">
              <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="B-20240101-001" />
              <Button type="button" variant="outline" size="icon" onClick={suggestBatch} title="สร้างอัตโนมัติ">
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">วันหมดอายุ</Label>
              <Input type="datetime-local" value={expiryAt} onChange={(e) => setExpiryAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ที่ตั้ง</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ชั้น 2 / ตู้ A1" />
            </div>
          </div>

          {selected && qty !== '' && Number(qty) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ยอดหลังรับเข้า (รวมทุกสาขา)</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formatNumber(selected.totalStock + Number(qty))} {selected.unit}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ยกเลิก</Button>
          <Button
            disabled={saving || !productId || qty === '' || Number(qty) <= 0}
            onClick={submit}
            className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
          >
            {saving ? 'กำลังบันทึก...' : 'รับเข้าสินค้า'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
