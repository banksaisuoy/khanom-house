'use client'

import * as React from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type KpiCardProps = {
  label: string
  value: string
  unit?: string
  delta?: number // percent change
  deltaLabel?: string
  icon: LucideIcon
  accent?: 'gold' | 'forest' | 'terracotta' | 'cream'
  invertDelta?: boolean // true: lower is better (e.g. waste)
  critical?: boolean
  spark?: { value: number }[]
}

const ACCENT_STYLES: Record<
  NonNullable<KpiCardProps['accent']>,
  { iconWrap: string; spark: string }
> = {
  gold: {
    iconWrap: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30',
    spark: 'var(--gold)',
  },
  forest: {
    iconWrap: 'bg-[var(--forest)]/10 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/20',
    spark: 'var(--forest)',
  },
  terracotta: {
    iconWrap: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20',
    spark: '#ea7c3a',
  },
  cream: {
    iconWrap: 'bg-amber-700/10 text-amber-700 dark:text-amber-300 ring-amber-700/20',
    spark: '#b8862f',
  },
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  icon: Icon,
  accent = 'gold',
  invertDelta = false,
  critical = false,
  spark = [],
}: KpiCardProps) {
  const styles = ACCENT_STYLES[accent]
  const hasDelta = typeof delta === 'number'
  const isPositive = hasDelta ? (invertDelta ? (delta as number) < 0 : (delta as number) > 0) : false
  const isFlat = hasDelta && delta === 0

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-shadow hover:shadow-md',
        critical && 'border-red-500/40 bg-red-500/[0.02]'
      )}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span
                className={cn(
                  'text-2xl font-bold tracking-tight md:text-3xl',
                  critical && 'text-red-600 dark:text-red-400'
                )}
              >
                {value}
              </span>
              {unit && (
                <span className="text-xs font-medium text-muted-foreground">{unit}</span>
              )}
            </div>
          </div>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
              styles.iconWrap
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {hasDelta && !isFlat && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold',
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(delta as number).toFixed(1)}%
              </span>
            )}
            {isFlat && (
              <span className="text-xs font-medium text-muted-foreground">— ไม่เปลี่ยนแปลง</span>
            )}
            {deltaLabel && (
              <span className="text-[10px] text-muted-foreground">{deltaLabel}</span>
            )}
          </div>

          {spark.length > 1 && (
            <div className="h-8 w-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`kpi-spark-${accent}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={styles.spark} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={styles.spark} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={styles.spark}
                    strokeWidth={1.5}
                    fill={`url(#kpi-spark-${accent})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
