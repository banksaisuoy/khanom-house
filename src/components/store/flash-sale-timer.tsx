'use client'

import { useEffect, useState } from 'react'

interface Props {
  endsAt: string
  className?: string
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function FlashSaleTimer({ endsAt, className }: Props) {
  const target = new Date(endsAt).getTime()
  // Start with null so server and first client render both show placeholder.
  // This avoids hydration mismatch (server has no Date.now, client does).
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, target - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  const totalSec = remaining == null ? 0 : Math.floor(remaining / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60

  // While not yet mounted on client, render a neutral placeholder that
  // matches what the server renders (00:00:00) to avoid hydration error.
  if (remaining == null) {
    return (
      <span
        className={`font-mono tabular-nums font-bold tracking-wider ${className || ''}`}
        suppressHydrationWarning
      >
        <span className="inline-block rounded bg-black/30 px-1.5 py-0.5">00</span>
        <span className="mx-0.5">:</span>
        <span className="inline-block rounded bg-black/30 px-1.5 py-0.5">00</span>
        <span className="mx-0.5">:</span>
        <span className="inline-block rounded bg-black/30 px-1.5 py-0.5">00</span>
      </span>
    )
  }

  return (
    <span
      className={`font-mono tabular-nums font-bold tracking-wider ${className || ''}`}
    >
      <span className="inline-block rounded bg-black/30 px-1.5 py-0.5">{pad(h)}</span>
      <span className="mx-0.5">:</span>
      <span className="inline-block rounded bg-black/30 px-1.5 py-0.5">{pad(m)}</span>
      <span className="mx-0.5">:</span>
      <span className="inline-block rounded bg-black/30 px-1.5 py-0.5">{pad(s)}</span>
    </span>
  )
}
