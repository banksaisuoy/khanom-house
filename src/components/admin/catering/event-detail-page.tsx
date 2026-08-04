'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventDetailSheet, type CateringEventDetail } from './event-detail-sheet'
import { EventFormDialog, type EventFormValues } from './event-form-dialog'

// Wraps the detail sheet so it auto-opens on a dedicated page route
export function CateringEventDetailPage({ event }: { event: CateringEventDetail }) {
  const [open, setOpen] = React.useState(true)
  const [editTarget, setEditTarget] = React.useState<Partial<EventFormValues> & { id?: string } | undefined>(undefined)
  const [formOpen, setFormOpen] = React.useState(false)
  const [current, setCurrent] = React.useState(event)

  const openEdit = (e: CateringEventDetail) => {
    setEditTarget({
      id: e.id, title: e.title, type: e.type, customerName: e.customerName,
      customerPhone: e.customerPhone, customerEmail: e.customerEmail ?? '',
      guestCount: e.guestCount, eventDate: e.eventDate, setupTime: e.setupTime ?? '',
      location: e.location, mapUrl: e.mapUrl ?? '', theme: e.theme ?? '',
      packagingType: e.packagingType ?? '', budget: e.budget, totalQuote: e.totalQuote,
      deposit: e.deposit, status: e.status, assignedUserId: e.assignedUserId ?? '',
      vehicle: e.vehicle ?? '', notes: e.notes ?? '', items: e.items, checklist: e.checklist,
    })
    setOpen(false)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/admin/catering"><ArrowLeft className="h-4 w-4" /> กลับ</Link>
        </Button>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--gold)]" />
          <h1 className="text-lg font-semibold">{event.title}</h1>
        </div>
      </div>

      <EventDetailSheet
        event={current}
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) window.history.back() }}
        onEdit={openEdit}
        onChanged={async () => {
          const r = await fetch(`/api/admin/catering/${current.id}`)
          if (r.ok) setCurrent(await r.json())
        }}
      />
      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTarget}
        onSaved={async () => {
          const r = await fetch(`/api/admin/catering/${current.id}`)
          if (r.ok) {
            setCurrent(await r.json())
            setOpen(true)
          }
        }}
      />
    </div>
  )
}
