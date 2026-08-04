import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatBaht, formatNumber, toThaiNumerals } from '@/lib/thai-date'
import { cn } from '@/lib/utils'

type Product = {
  id: string
  name: string
  soldCount: number
  revenue: number
  stock: number
  status: string
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  OK: { label: 'พร้อมขาย', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  LOW: { label: 'ใกล้หมด', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  OUT: { label: 'หมดสต็อก', cls: 'bg-red-500/10 text-red-700 dark:text-red-300' },
}

export function TopProductsTable({ products }: { products: Product[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">ตารางสินค้าขายดี</CardTitle>
        <Link
          href="/admin/products"
          className="flex items-center gap-1 text-xs font-medium text-[var(--forest)] hover:underline dark:text-[var(--gold)]"
        >
          สินค้าทั้งหมด <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 pl-0 text-xs">สินค้า</TableHead>
                <TableHead className="h-9 text-right text-xs">ขายแล้ว</TableHead>
                <TableHead className="h-9 text-right text-xs">ยอดขาย</TableHead>
                <TableHead className="h-9 text-right text-xs">สต็อก</TableHead>
                <TableHead className="h-9 pr-0 text-center text-xs">สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, idx) => {
                const cfg = STATUS_CONFIG[p.status] ?? { label: p.status, cls: '' }
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell className="py-2 pl-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                            idx < 3
                              ? 'bg-[var(--gold)]/20 text-[var(--gold)]'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {toThaiNumerals(idx + 1)}
                        </span>
                        <span className="truncate text-xs font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs tabular-nums">
                      {formatNumber(p.soldCount)}
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs font-semibold tabular-nums text-[var(--gold)]">
                      {formatBaht(p.revenue)}
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs tabular-nums">
                      {toThaiNumerals(p.stock)}
                    </TableCell>
                    <TableCell className="py-2 pr-0 text-center">
                      <Badge variant="secondary" className={cn('h-5 px-1.5 text-[9px] font-medium', cfg.cls)}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
