'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, KeyRound, Mail, Phone, Building2, Crown, ChefHat, Store, Bike, Calculator, User as UserIcon } from 'lucide-react'
import { roleConfig } from '@/lib/admin-ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Branch = { id: string; name: string; code: string }
type UserRow = {
  id: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  role: string
  branchId: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  branch: { id: string; name: string; code: string } | null
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', icon: Crown },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager', icon: Store },
  { value: 'KITCHEN', label: 'Kitchen', icon: ChefHat },
  { value: 'CASHIER', label: 'Cashier', icon: Calculator },
  { value: 'RIDER', label: 'Rider', icon: Bike },
  { value: 'ACCOUNTANT', label: 'Accountant', icon: Calculator },
  { value: 'STAFF', label: 'Staff', icon: UserIcon },
]

export function UserFormDialog({
  open, onOpenChange, editing, branches, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: UserRow | null
  branches: Branch[]
  onSaved: () => void
}) {
  const isEdit = !!editing
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [role, setRole] = React.useState('STAFF')
  const [branchId, setBranchId] = React.useState('none')
  const [password, setPassword] = React.useState('')
  const [resetPassword, setResetPassword] = React.useState(false)
  const [isActive, setIsActive] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name)
        setEmail(editing.email)
        setPhone(editing.phone ?? '')
        setRole(editing.role)
        setBranchId(editing.branchId ?? 'none')
        setIsActive(editing.isActive)
        setResetPassword(false)
        setPassword('')
      } else {
        setName(''); setEmail(''); setPhone(''); setRole('STAFF')
        setBranchId('none'); setPassword(''); setResetPassword(false); setIsActive(true)
      }
    }
  }, [open, editing])

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('กรุณาระบุชื่อและอีเมล')
      return
    }
    if (!isEdit && password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (isEdit && resetPassword && password.length < 6) {
      toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name, email, phone, role,
        branchId: branchId === 'none' ? null : branchId,
        isActive,
      }
      if (!isEdit) {
        body.password = password
      } else if (resetPassword) {
        body.password = password
      }

      const url = isEdit ? `/api/admin/users/${editing!.id}` : '/api/admin/users'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? 'บันทึกไม่สำเร็จ')
      }
      toast.success(isEdit ? `อัปเดตผู้ใช้ ${name} แล้ว` : `สร้างผู้ใช้ ${name} แล้ว`)
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <UserPlus className="h-4 w-4 text-[var(--gold)]" /> : <UserPlus className="h-4 w-4 text-[var(--gold)]" />}
            {isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `แก้ไขข้อมูลของ ${editing?.name} — รหัสผู้ใช้ ${editing?.id.slice(-6)}`
              : 'สร้างบัญชีผู้ใช้ใหม่พร้อมบทบาทและสิทธิ์การเข้าถึง'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name + Email */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น คุณสมชาย" />
            </div>
            <div className="space-y-1.5">
              <Label>อีเมล <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-7" placeholder="user@khanomhouse.th" />
              </div>
            </div>
          </div>

          {/* Phone + Role */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>เบอร์โทร</Label>
              <div className="relative">
                <Phone className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-7" placeholder="08x-xxx-xxxx" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>บทบาท <span className="text-red-500">*</span></Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => {
                    const Icon = r.icon
                    const cfg = roleConfig(r.value)
                    return (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{r.label}</span>
                          <Badge className={cn('ml-1 text-[8px] ring-1 ring-inset', cfg.cls)}>{cfg.label}</Badge>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <Label>สาขาที่สังกัด</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ไม่สังกัดสาขา (สำนักงานใหญ่)</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Password */}
          {!isEdit ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <Label>รหัสผ่าน <span className="text-red-500">*</span></Label>
              <div className="relative">
                <KeyRound className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-7"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  autoComplete="new-password"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                รหัสผ่านจะถูกเข้ารหัสด้วย bcrypt ก่อนบันทึก
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">รีเซ็ตรหัสผ่าน</p>
                  <p className="text-[10px] text-muted-foreground">เปิดเพื่อตั้งรหัสผ่านใหม่ให้ผู้ใช้</p>
                </div>
                <Switch checked={resetPassword} onCheckedChange={setResetPassword} />
              </div>
              {resetPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5 pt-1"
                >
                  <Label>รหัสผ่านใหม่</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-7"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      autoComplete="new-password"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-xs font-medium">สถานะใช้งาน</p>
              <p className="text-[10px] text-muted-foreground">ปิดเพื่อระงับการเข้าถึงระบบ</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5 bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90">
            <UserPlus className="h-4 w-4" />
            {saving ? 'กำลังบันทึก...' : (isEdit ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
