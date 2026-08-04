import Link from 'next/link'
import { ArrowLeft, Construction, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type PlaceholderProps = {
  title: string
  description?: string
  icon?: LucideIcon
  backHref?: string
  backLabel?: string
}

export function PlaceholderCard({
  title,
  description = 'โมดูลนี้กำลังอยู่ระหว่างพัฒนา โปรดรอการอัปเดตในเร็วๆ นี้',
  icon: Icon = Construction,
  backHref = '/admin',
  backLabel = 'กลับแดชบอร์ด',
}: PlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md overflow-hidden border-[var(--gold)]/20">
        <div className="h-1.5 bg-gradient-to-r from-[var(--forest)] via-[var(--gold)] to-[var(--forest)]" />
        <CardContent className="flex flex-col items-center gap-4 px-8 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/20">
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="mt-2 rounded-lg border border-dashed bg-muted/30 px-4 py-2">
            <p className="text-xs text-muted-foreground">
              🔨 Module นี้กำลังพัฒนาโดยทีมงาน
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
