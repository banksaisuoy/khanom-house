'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type AdminPageHeaderProps = {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  className?: string
}

export function AdminPageHeader({ title, subtitle, icon: Icon, actions, className }: AdminPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  )
}

// Lightweight KPI strip — items get equal width grid
export function AdminKpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {children}
    </div>
  )
}

export function AdminMiniStat({
  label,
  value,
  sub,
  accent = 'gold',
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'gold' | 'forest' | 'amber' | 'red' | 'teal'
  icon?: LucideIcon
}) {
  const accents: Record<string, string> = {
    gold: 'text-[var(--gold)] bg-[var(--gold)]/10 ring-[var(--gold)]/20',
    forest: 'text-[var(--forest)] dark:text-emerald-400 bg-[var(--forest)]/10 ring-[var(--forest)]/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-amber-500/20',
    red: 'text-red-600 dark:text-red-400 bg-red-500/10 ring-red-500/20',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 ring-teal-500/20',
  }
  return (
    <div className="rounded-xl border bg-card p-3 md:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg ring-1', accents[accent])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <p className="mt-1 text-lg font-bold leading-tight md:text-xl">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// Empty state
export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
