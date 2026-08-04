'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface InitialContext {
  todayOrders: number
  pendingOrders: number
  lowStock: number
  activeBatches: number
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  error?: boolean
  pending?: boolean
}

const SUGGESTIONS = [
  'ยอดขายวันนี้เป็นอย่างไร?',
  'สินค้าอะไรขายดีที่สุด?',
  'สต็อกอะไรใกล้หมด?',
  'แนะนำโปรโมชั่นอะไรดี?',
]

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'สวัสดีครับ 🙏 ผมคือผู้ช่วย AI ของ Khanom House\n\nถามอะไรก็ได้เกี่ยวกับร้าน — ยอดขาย สต็อก คิวผลิต หรือขอคำแนะนำโปรโมชั่น ผมจะดึงข้อมูลล่าสุดจากระบบมาตอบให้ทันที',
}

export function AiAssistantClient({ initialContext }: { initialContext: InitialContext }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom whenever messages change.
  React.useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, loading])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    const pendingMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      pending: true,
    }

    // Build the history we send to the API (exclude welcome + pending).
    const history = messages
      .filter((m) => m.id !== 'welcome' && !m.pending && !m.error)
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMsg, pendingMsg])
    setInput('')
    setLoading(true)

    try {
      const r = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, messages: history }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'เรียก AI ไม่สำเร็จ')

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? { ...m, pending: false, content: data.reply, error: !!data.error }
            : m
        )
      )
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? {
                ...m,
                pending: false,
                error: true,
                content: (e as Error).message || 'เกิดข้อผิดพลาด ลองอีกครั้ง',
              }
            : m
        )
      )
      toast.error('ไม่สามารถเรียก AI ได้ ลองอีกครั้ง')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const retry = (id: string) => {
    const target = messages.find((m) => m.id === id)
    if (!target) return
    // remove the failed AI message + the user message before it, then re-send
    const idx = messages.findIndex((m) => m.id === id)
    const userMsg = messages[idx - 1]
    if (!userMsg || userMsg.role !== 'user') return
    setMessages((prev) => prev.slice(0, idx))
    send(userMsg.content)
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-end md:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              🤖 ผู้ช่วย AI
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              ถามอะไรก็ได้เกี่ยวกับร้านขนมไทย — ยอดขาย สต็อก คิวผลิต คำแนะนำ
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ContextChip label="ออเดอร์วันนี้" value={initialContext.todayOrders} />
          <ContextChip label="รอดำเนินการ" value={initialContext.pendingOrders} accent="amber" />
          <ContextChip label="สต็อกต่ำ" value={initialContext.lowStock} accent="red" />
          <ContextChip label="คิวผลิต" value={initialContext.activeBatches} accent="forest" />
        </div>
      </motion.div>

      {/* Chat card */}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-[var(--gold)]/20 p-0">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-4 md:p-6"
          style={{
            scrollbarWidth: 'thin',
          }}
        >
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {m.role === 'assistant' && (
                  <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--forest)] text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                    m.role === 'user'
                      ? 'rounded-br-md bg-[var(--gold)] text-[var(--forest)] font-medium'
                      : m.error
                        ? 'rounded-bl-md border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                        : 'rounded-bl-md border border-border bg-card text-card-foreground'
                  )}
                >
                  {m.pending ? (
                    <TypingDots />
                  ) : (
                    <>
                      <p>{m.content}</p>
                      {m.error && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 gap-1.5 text-xs"
                          onClick={() => retry(m.id)}
                        >
                          <RefreshCw className="h-3 w-3" /> ลองอีกครั้ง
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Suggestion chips */}
        {messages.length <= 1 && (
          <div className="border-t border-border/60 bg-background/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-[var(--gold)]" /> ลองถามคำถามเหล่านี้
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-[var(--gold)]/30 bg-[var(--gold)]/5 text-[var(--forest)] hover:bg-[var(--gold)]/15 dark:text-[var(--gold)]"
                  onClick={() => send(s)}
                  disabled={loading}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-border/60 bg-background p-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="พิมพ์คำถามเกี่ยวกับร้าน..."
            disabled={loading}
            className="h-11 flex-1"
            aria-label="ข้อความถึงผู้ช่วย AI"
          />
          <Button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="h-11 gap-1.5 bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90 dark:bg-[var(--gold)] dark:text-[var(--forest)]"
          >
            <Send className="h-4 w-4" />
            ส่ง
          </Button>
        </div>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        ผู้ช่วย AI อาจให้ข้อมูลไม่ถูกต้องทั้งหมด — ตรวจสอบกับข้อมูลในระบบก่อนตัดสินใจสำคัญ
      </p>
    </div>
  )
}

function ContextChip({
  label,
  value,
  accent = 'gold',
}: {
  label: string
  value: number
  accent?: 'gold' | 'amber' | 'red' | 'forest'
}) {
  const accents: Record<string, string> = {
    gold: 'text-[var(--gold)] bg-[var(--gold)]/10 ring-[var(--gold)]/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-amber-500/20',
    red: 'text-red-600 dark:text-red-400 bg-red-500/10 ring-red-500/20',
    forest:
      'text-[var(--forest)] dark:text-emerald-400 bg-[var(--forest)]/10 ring-[var(--forest)]/20',
  }
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs ring-1 ring-border">
      <span className="text-muted-foreground">{label}</span>
      <Badge className={cn('text-[10px] ring-1 ring-inset', accents[accent])}>{value}</Badge>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-[var(--gold)]"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  )
}
