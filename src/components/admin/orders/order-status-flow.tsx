'use client'

import { Check } from 'lucide-react'
import { ORDER_FLOW, STATUS_CONFIG, type OrderStatus } from '@/lib/order-status'
import { cn } from '@/lib/utils'

interface Props {
  current: OrderStatus
  variant?: 'compact' | 'full'
}

/**
 * Visual status stepper — shows the 7-stage flow PENDING → COMPLETED.
 * Cancelled/Refunded are shown as a separate alert.
 */
export function OrderStatusFlow({ current, variant = 'full' }: Props) {
  const idx = ORDER_FLOW.indexOf(current)

  if (current === 'CANCELLED' || current === 'REFUNDED') {
    const cfg = STATUS_CONFIG[current]
    return (
      <div className={cn('rounded-lg border px-3 py-2 text-sm font-medium', cfg.cls)}>
        {cfg.icon} {cfg.label}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {ORDER_FLOW.map((s, i) => {
          const done = i <= idx
          const cfg = STATUS_CONFIG[s]
          return (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-medium',
                  done
                    ? 'bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)]'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {done && <Check className="h-3 w-3" />}
                {cfg.short}
              </div>
              {i < ORDER_FLOW.length - 1 && (
                <div className={cn('h-0.5 w-3', i < idx ? 'bg-[var(--gold)]' : 'bg-muted')} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-stretch">
      {ORDER_FLOW.map((s, i) => {
        const done = i < idx
        const active = i === idx
        const cfg = STATUS_CONFIG[s]
        return (
          <div key={s} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className={cn('h-0.5 flex-1', done || active ? 'bg-[var(--gold)]' : 'bg-muted')} />
              )}
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                  done
                    ? 'border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-foreground)]'
                    : active
                      ? 'border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)] dark:text-[var(--gold)]'
                      : 'border-muted bg-background text-muted-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < ORDER_FLOW.length - 1 && (
                <div className={cn('h-0.5 flex-1', done ? 'bg-[var(--gold)]' : 'bg-muted')} />
              )}
            </div>
            <span
              className={cn(
                'mt-1.5 text-center text-[10px] font-medium leading-tight',
                active ? 'text-[var(--gold)] dark:text-[var(--gold)]' : done ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {cfg.short}
            </span>
          </div>
        )
      })}
    </div>
  )
}
