'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CustomerDetailSheet, type CustomerListItem } from './customer-detail-sheet'

export function CustomerDetailPage({ customer }: { customer: CustomerListItem }) {
  const [open, setOpen] = React.useState(true)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/admin/customers"><ArrowLeft className="h-4 w-4" /> กลับ</Link>
        </Button>
        <h1 className="text-lg font-semibold">{customer.name}</h1>
      </div>
      <CustomerDetailSheet
        customer={customer}
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) window.history.back() }}
        onChanged={() => {}}
      />
    </div>
  )
}
