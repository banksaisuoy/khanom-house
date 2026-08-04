'use client'

import * as React from 'react'
import {
  CalendarClock, Clock,
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

export type ScheduleFormValues = {
  userId: string
  branchId?: string | null
  date: string
  shiftStart: string
  shiftEnd: string
  role: string
  notes?: string | null
}

export type UserLite = {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  branchId: string | null
  branchName: string | null
}

type Branch = { id: string; name: string; code: string; isMain: boolean }

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  users: UserLite[]
  branches: Branch[]
  defaultDate?: string
  onSubmit: (values: ScheduleFormValues) => void
}

const ROLES = [
  { value: 'CASHIER', label: 'แคชเชียร์' },
  { value: 'KITCHEN', label: 'ครัว' },
  { value: 'RIDER', label: 'คนส่ง' },
  { value: 'MANAGER', label: 'ผู้จัดการ' },
  { value: 'STAFF', label: 'พนักงานทั่วไป' },
]

export function ScheduleFormDialog({ open, onOpenChange, users, branches, defaultDate, onSubmit }: Props) {
  const today = defaultDate ?? new Date().toISOString().slice(0, 10)
  const [userId, setUserId] = React.useState('')
  const [date, setDate] = React.useState(today)
  const [shiftStart, setShiftStart] = React.useState('09:00')
  const [shiftEnd, setShiftEnd] = React.useState('17:00')
  const [role, setRole] = React.useState('STAFF')
  const [branchId, setBranchId] = React.useState('none')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setUserId(users[0]?.id ?? '')
    setDate(today)
    setShiftStart('09:00')
    setShiftEnd('17:00')
    setRole('STAFF')
    setBranchId(branches.find((b) => b.isMain)?.id ?? 'none')
    setNotes('')
  }, [open, users, branches, today])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    if (!shiftStart || !shiftEnd) return
    if (shiftEnd <= shiftStart) return

    // Combine date + time → ISO
    const startIso = new Date(`${date}T${shiftStart}:00`).toISOString()
    const endIso = new Date(`${date}T${shiftEnd}:00`).toISOString()
    // The "date" field stores the day (midnight UTC of that date).
    const dateIso = new Date(`${date}T00:00:00`).toISOString()

    onSubmit({
      userId,
      branchId: branchId === 'none' ? null : branchId,
      date: dateIso,
      shiftStart: startIso,
      shiftEnd: endIso,
      role,
      notes: notes.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[var(--gold)]" />
            จัดตารางกะพนักงาน
          </DialogTitle>
          <DialogDescription>
            มอบหมายกะการทำงานให้พนักงานในวันที่กำหนด
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 px-6 py-5">
              <Field label="พนักงาน *">
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger><SelectValue placeholder="เลือกพนักงาน" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="วันที่ *">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </Field>
                <Field label="บทบาทในกะ">
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="เวลาเข้ากะ *">
                  <div className="relative">
                    <Clock className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="pl-7" required />
                  </div>
                </Field>
                <Field label="เวลาออกกะ *">
                  <div className="relative">
                    <Clock className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="pl-7" required />
                  </div>
                </Field>
              </div>

              {shiftStart && shiftEnd && shiftEnd <= shiftStart && (
                <p className="text-xs text-red-600 dark:text-red-400">เวลาออกกะต้องอยู่หลังเวลาเข้ากะ</p>
              )}

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

              <Field label="หมายเหตุ">
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น กะเช้ารับผิดชอบคลังสินค้า"
                />
              </Field>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button
              type="submit"
              disabled={!userId || !shiftStart || !shiftEnd || (shiftEnd <= shiftStart)}
              className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
            >
              บันทึกกะ
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
