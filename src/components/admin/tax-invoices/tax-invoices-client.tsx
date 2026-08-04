'use client'
import { useQuery } from '@tanstack/react-query'
import { FileText, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { escapeHtml, openPrintWindow } from '@/lib/print'

export function TaxInvoicesClient() {
  const { data, isLoading } = useQuery({ queryKey: ['tax-invoices'], queryFn: async () => fetch('/api/admin/tax-invoice').then(r => r.json()) })
  const invoices = data?.invoices ?? []
  const print = (inv: any) => {
    const items = JSON.parse(inv.items || '[]')
    const body = `
      <h1 class="center">Khanom House</h1>
      <p class="center muted">ใบกำกับภาษีอย่างย่อ</p>
      <p class="center">เลขที่: ${escapeHtml(inv.invoiceNo)}</p>
      <div class="divider"></div>
      <p>ลูกค้า: ${escapeHtml(inv.customerName)}</p>
      <p>เลขประจำตัวผู้เสียภาษี: ${escapeHtml(inv.customerTaxId || '-')}</p>
      <p>ที่อยู่: ${escapeHtml(inv.customerAddress || '-')}</p>
      <div class="divider"></div>
      ${items.map((it: any) => `<div class="row"><span>${escapeHtml(it.name)} ×${it.quantity}</span><span>฿${it.total.toFixed(2)}</span></div>`).join('')}
      <div class="divider"></div>
      <div class="row"><span>มูลค่าสินค้า</span><span>฿${inv.subtotal.toFixed(2)}</span></div>
      <div class="row"><span>ส่วนลด</span><span>-฿${inv.discount.toFixed(2)}</span></div>
      <div class="row"><span>ฐานภาษี</span><span>฿${inv.taxableAmount.toFixed(2)}</span></div>
      <div class="row"><span>VAT 7%</span><span>฿${inv.vatAmount.toFixed(2)}</span></div>
      <div class="row total"><span>รวมทั้งสิ้น</span><span>฿${inv.total.toFixed(2)}</span></div>
    `
    openPrintWindow(`ใบกำกับภาษี ${inv.invoiceNo}`, body)
  }
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> ใบกำกับภาษี</h1><p className="text-sm text-muted-foreground">ออกใบกำกับภาษีเต็มรูปแบบ</p></div>
      {isLoading ? <Skeleton className="h-32" /> : invoices.length === 0 ? <div className="text-center py-12 text-muted-foreground">ยังไม่มีใบกำกับภาษี</div> : (
        <div className="space-y-2">
          {invoices.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2"><span className="font-mono font-bold">{inv.invoiceNo}</span><Badge variant={inv.status === 'ISSUED' ? 'secondary' : 'destructive'}>{inv.status === 'ISSUED' ? 'ออกแล้ว' : 'ยกเลิก'}</Badge></div>
                <p className="text-sm">{inv.customerName} {inv.customerTaxId && `• เลขภาษี: ${inv.customerTaxId}`}</p>
                <p className="text-sm font-bold">฿{inv.total.toLocaleString()} (VAT ฿{inv.vatAmount.toLocaleString()})</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => print(inv)}><Printer className="h-4 w-4" /> พิมพ์</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export type EligibleOrder = {
  id: string
  orderNo: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  total: number
  createdAt: string
  items: { name: string; price: number; quantity: number; total: number }[]
}

