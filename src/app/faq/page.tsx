import { db } from '@/lib/db'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FaqPage() {
  const faqs = await db.faq.findMany({
    where: { isPublished: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })

  const catLabel: Record<string, string> = {
    general: 'ทั่วไป',
    shipping: 'การจัดส่ง',
    payment: 'การชำระเงิน',
    product: 'สินค้า',
    return: 'การคืนเงิน',
  }

  const grouped = faqs.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = []
    acc[f.category].push(f)
    return acc
  }, {} as Record<string, typeof faqs>)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-gold text-lg">❀</span>
            <span className="font-bold">Khanom House</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← กลับหน้าร้าน</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold text-center">คำถามที่พบบ่อย</h1>
        {faqs.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">ยังไม่มีคำถามที่พบบ่อย</p>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-xl font-bold text-primary">{catLabel[cat] || cat}</h2>
              <div className="space-y-2">
                {items.map((f) => (
                  <details key={f.id} className="group rounded-lg border border-border bg-card overflow-hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer font-medium hover:bg-muted/50">
                      {f.question}
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">{f.answer}</div>
                  </details>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
