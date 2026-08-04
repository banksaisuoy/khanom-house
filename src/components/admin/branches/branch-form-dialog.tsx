'use client'

import * as React from 'react'
import {
  Building2, MapPin, Phone, Crown,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'

export type BranchFormValues = {
  name: string
  code: string
  address?: string | null
  phone?: string | null
  isMain: boolean
  isActive: boolean
}

export type BranchRow = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  isMain: boolean
  isActive: boolean
  userCount: number
  inventoryCount: number
  createdAt: string
}

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  branch?: BranchRow
  onSubmit: (values: BranchFormValues, id?: string) => void
}

export function BranchFormDialog({ open, onOpenChange, branch, onSubmit }: Props) {
  const isEdit = !!branch
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [isMain, setIsMain] = React.useState(false)
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    if (branch) {
      setName(branch.name)
      setCode(branch.code)
      setAddress(branch.address ?? '')
      setPhone(branch.phone ?? '')
      setIsMain(branch.isMain)
      setIsActive(branch.isActive)
    } else {
      setName('')
      setCode('')
      setAddress('')
      setPhone('')
      setIsMain(false)
      setIsActive(true)
    }
  }, [open, branch])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    onSubmit(
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        isMain,
        isActive,
      },
      branch?.id
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--gold)]" />
            {isEdit ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `แก้ไขข้อมูลสาขา "${branch?.name}"` : 'สร้างสาขาใหม่ในระบบ — เฉพาะ Super Admin เท่านั้น'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 px-6 py-5">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--gold)]">🏢 ข้อมูลสาขา</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="ชื่อสาขา *">
                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="เช่น สาขาสีลม" />
                  </Field>
                  <Field label="รหัสสาขา *">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                      placeholder="เช่น B01"
                      className="font-mono uppercase"
                    />
                  </Field>
                </div>
                <Field label="เบอร์โทร">
                  <div className="relative">
                    <Phone className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-7" placeholder="02-xxx-xxxx" />
                  </div>
                </Field>
                <Field label="ที่อยู่">
                  <div className="relative">
                    <MapPin className="absolute left-2 top-3 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className="pl-7" placeholder="เลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์" />
                  </div>
                </Field>
              </section>

              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-[var(--gold)]">⚙️ สถานะ</h3>
                <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm">
                      <Crown className="h-3.5 w-3.5 text-[var(--gold)]" />
                      สาขาหลัก (สำนักงานใหญ่)
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ตั้งเป็นสาขาหลัก — สาขาหลักเดิมจะถูกเปลี่ยนเป็นสาขาย่อยอัตโนมัติ
                    </p>
                  </div>
                  <Switch checked={isMain} onCheckedChange={setIsMain} />
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                  <div>
                    <p className="text-sm">สถานะใช้งาน</p>
                    <p className="text-[10px] text-muted-foreground">ปิดเพื่อระงับการใช้งานสาขานี้</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90">
              {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มสาขา'}
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
