'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Receipt, Wand2, ImageIcon,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export type ExpenseFormValues = {
  date: string
  category: string
  description: string
  amount: number
  branchId?: string | null
  receiptUrl?: string | null
}

export type ExpenseRow = {
  id: string
  date: string
  category: string
  description: string
  amount: number
  branchId: string | null
  branchName: string | null
  receiptUrl: string | null
  userId: string | null
  userName: string | null
  createdAt: string
}

type Branch = { id: string; name: string; code: string; isMain: boolean }

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  expense?: ExpenseRow
  branches: Branch[]
  onSubmit: (values: ExpenseFormValues, id?: string) => void
}

const CATEGORIES = [
  { value: 'INGREDIENT', label: 'วัตถุดิบ', emoji: '🌾' },
  { value: 'UTILITY', label: 'น้ำ/ไฟ/อินเทอร์เน็ต', emoji: '💡' },
  { value: 'MARKETING', label: 'การตลาด', emoji: '📣' },
  { value: 'SALARY', label: 'เงินเดือน', emoji: '👥' },
  { value: 'RENT', label: 'ค่าเช่า', emoji: '🏢' },
  { value: 'OTHER', label: 'อื่น ๆ', emoji: '📦' },
]

export function ExpenseFormDialog({ open, onOpenChange, expense, branches, onSubmit }: Props) {
  const isEdit = !!expense
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = React.useState(today)
  const [category, setCategory] = React.useState('INGREDIENT')
  const [description, setDescription] = React.useState('')
  const [amount, setAmount] = React.useState<number | ''>('')
  const [branchId, setBranchId] = React.useState('none')
  const [receiptUrl, setReceiptUrl] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    if (expense) {
      setDate(new Date(expense.date).toISOString().slice(0, 10))
      setCategory(expense.category)
      setDescription(expense.description)
      setAmount(expense.amount)
      setBranchId(expense.branchId ?? 'none')
      setReceiptUrl(expense.receiptUrl ?? '')
    } else {
      setDate(today)
      setCategory('INGREDIENT')
      setDescription('')
      setAmount('')
      setBranchId(branches.find((b) => b.isMain)?.id ?? 'none')
      setReceiptUrl('')
    }
  }, [open, expense, branches, today])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    if (amount === '' || Number(amount) <= 0) return
    onSubmit(
      {
        date: new Date(date + 'T00:00:00').toISOString(),
        category,
        description: description.trim(),
        amount: Number(amount),
        branchId: branchId === 'none' ? null : branchId,
        receiptUrl: receiptUrl.trim() || null,
      },
      expense?.id
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[var(--gold)]" />
            {isEdit ? 'แก้ไขค่าใช้จ่าย' : 'บันทึกค่าใช้จ่าย'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `แก้ไขรายการ "${expense?.description}"` : 'บันทึกค่าใช้จ่ายของร้านตามหมวดหมู่'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="วันที่ *">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </Field>
                <Field label="หมวดหมู่ *">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.emoji} {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="รายละเอียด *">
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="เช่น น้ำตาลทราย 50 กก. / ค่าไฟเดือน มิ.ย."
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="จำนวนเงิน (฿) *">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    placeholder="0.00"
                  />
                </Field>
                <Field label="สาขา">
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่ระบุสาขา</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.isMain && '(สำนักงานใหญ่)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="URL ใบเสร็จ (ถ้ามี)">
                <div className="flex gap-1">
                  <Input
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="https://... หรือ path ใบเสร็จ"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setReceiptUrl('')}
                    title="ล้าง"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  ระบบยังไม่รองรับการอัปโหลดไฟล์ — กรอก URL ของใบเสร็จแทน
                </p>
              </Field>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90">
              {isEdit ? 'บันทึกการแก้ไข' : 'บันทึกค่าใช้จ่าย'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}

void motion
