'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon, Store, Bell, CreditCard, Truck, Save, Plus,
  Phone, Mail, MapPin, Building2, Hash, Percent, Crown, Coins, Wallet,
  Package, Tag, AlertTriangle, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPageHeader } from '@/components/admin/admin-page-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Branch = { id: string; name: string; code: string; address: string | null; phone: string | null; isMain: boolean }

const SETTINGS_KEY = 'khanom-house-settings-v1'

type SettingsData = {
  general: {
    storeName: string
    logoUrl: string
    phone: string
    email: string
    address: string
    taxId: string
    vatRate: string
  }
  notifications: {
    newOrder: boolean
    lowStock: boolean
    nearExpiry: boolean
    waste: boolean
    lateDelivery: boolean
    complaint: boolean
  }
  payments: {
    cash: boolean
    promptpay: boolean
    creditCard: boolean
    trueMoney: boolean
    shopeePay: boolean
  }
  delivery: {
    shippingFee: string
    freeShippingThreshold: string
    zones: string
  }
}

const DEFAULTS: SettingsData = {
  general: {
    storeName: 'Khanom House',
    logoUrl: '',
    phone: '02-123-4567',
    email: 'contact@khanomhouse.th',
    address: '123 ถ.สีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
    taxId: '0105559000000',
    vatRate: '7',
  },
  notifications: {
    newOrder: true,
    lowStock: true,
    nearExpiry: true,
    waste: true,
    lateDelivery: true,
    complaint: true,
  },
  payments: {
    cash: true,
    promptpay: true,
    creditCard: true,
    trueMoney: false,
    shopeePay: false,
  },
  delivery: {
    shippingFee: '40',
    freeShippingThreshold: '500',
    zones: 'กรุงเทพฯและปริมณฑล\nเขต 1-50 (฿40)\nนนทบุรี/สมุทรปราการ/ปทุมธานี (฿60)\nต่างจังหวัด (฿100)',
  },
}

function loadSettings(): SettingsData {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    // shallow merge to ensure new keys exist
    return {
      general: { ...DEFAULTS.general, ...(parsed.general ?? {}) },
      notifications: { ...DEFAULTS.notifications, ...(parsed.notifications ?? {}) },
      payments: { ...DEFAULTS.payments, ...(parsed.payments ?? {}) },
      delivery: { ...DEFAULTS.delivery, ...(parsed.delivery ?? {}) },
    }
  } catch {
    return DEFAULTS
  }
}

function saveSettings(data: SettingsData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('[saveSettings]', e)
  }
}

export function SettingsClient({ branches }: { branches: Branch[] }) {
  const [tab, setTab] = React.useState<'general' | 'branches' | 'notifications' | 'payments' | 'delivery'>('general')
  const [data, setData] = React.useState<SettingsData>(DEFAULTS)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    setData(loadSettings())
    setLoaded(true)
  }, [])

  const update = <K extends keyof SettingsData>(key: K, value: Partial<SettingsData[K]>) => {
    setData((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }))
  }

  const handleSave = () => {
    saveSettings(data)
    toast.success('บันทึกการตั้งค่าแล้ว')
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="ตั้งค่า"
        subtitle="ตั้งค่าร้าน สาขา การแจ้งเตือน การชำระเงิน และการจัดส่ง"
        icon={SettingsIcon}
        actions={
          <Button size="sm" onClick={handleSave} className="gap-1.5 bg-[var(--gold)] text-[var(--forest)] hover:bg-[var(--gold)]/90">
            <Save className="h-4 w-4" /> บันทึกการตั้งค่า
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="general" className="text-xs">ทั่วไป</TabsTrigger>
          <TabsTrigger value="branches" className="text-xs">สาขา</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">การแจ้งเตือน</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">การชำระเงิน</TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs">การจัดส่ง</TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {tab === 'general' && (
          <GeneralTab data={data} update={update} loaded={loaded} />
        )}
        {tab === 'branches' && (
          <BranchesTab branches={branches} />
        )}
        {tab === 'notifications' && (
          <NotificationsTab data={data} update={update} />
        )}
        {tab === 'payments' && (
          <PaymentsTab data={data} update={update} />
        )}
        {tab === 'delivery' && (
          <DeliveryTab data={data} update={update} />
        )}
      </motion.div>
    </div>
  )
}

// ---------------- General Tab ----------------
function GeneralTab({
  data, update, loaded,
}: {
  data: SettingsData
  update: <K extends keyof SettingsData>(key: K, value: Partial<SettingsData[K]>) => void
  loaded: boolean
}) {
  if (!loaded) return <Card><CardContent className="p-6"><p className="text-xs text-muted-foreground">กำลังโหลด...</p></CardContent></Card>
  const g = data.general
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Store className="h-4 w-4 text-[var(--gold)]" /> ข้อมูลร้านทั่วไป
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อร้าน" icon={Crown}>
            <Input value={g.storeName} onChange={(e) => update('general', { storeName: e.target.value })} />
          </Field>
          <Field label="URL โลโก้" icon={Crown}>
            <Input value={g.logoUrl} onChange={(e) => update('general', { logoUrl: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="เบอร์โทร" icon={Phone}>
            <Input value={g.phone} onChange={(e) => update('general', { phone: e.target.value })} />
          </Field>
          <Field label="อีเมล" icon={Mail}>
            <Input value={g.email} onChange={(e) => update('general', { email: e.target.value })} />
          </Field>
          <Field label="เลขประจำตัวผู้เสียภาษี" icon={Hash}>
            <Input value={g.taxId} onChange={(e) => update('general', { taxId: e.target.value })} />
          </Field>
          <Field label="อัตราภาษีมูลค่าเพิ่ม (%)" icon={Percent}>
            <Input type="number" value={g.vatRate} onChange={(e) => update('general', { vatRate: e.target.value })} />
          </Field>
        </div>
        <Field label="ที่อยู่ร้าน" icon={MapPin}>
          <Textarea
            value={g.address}
            onChange={(e) => update('general', { address: e.target.value })}
            className="min-h-[80px]"
          />
        </Field>
        <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            การตั้งค่าเหล่านี้เก็บไว้ใน localStorage ของเบราว์เซอร์ (UI-only demo) — ไม่มีการบันทึกลงฐานข้อมูล
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Branches Tab ----------------
function BranchesTab({ branches }: { branches: Branch[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-[var(--gold)]" /> รายการสาขา ({toThaiNumerals(branches.length)})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => toast.info('ฟังก์ชันเพิ่มสาขาจะเปิดให้ใช้ในเวอร์ชันถัดไป')}
          >
            <Plus className="h-4 w-4" /> เพิ่มสาขา
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <div key={b.id} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/30">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{b.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{b.code}</p>
                  </div>
                </div>
                {b.isMain && (
                  <Badge className="bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-inset ring-[var(--gold)]/30 text-[9px]">
                    <Crown className="mr-1 h-2.5 w-2.5" /> สาขาหลัก
                  </Badge>
                )}
              </div>
              {b.address && (
                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {b.address}
                </p>
              )}
              {b.phone && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  <Phone className="mr-1 inline h-3 w-3" />
                  {b.phone}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            ข้อมูลสาขาอ่านจากฐานข้อมูล (read-only) — การเพิ่ม/แก้ไขต้องทำผ่านระบบหลังบ้าน
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Notifications Tab ----------------
function NotificationsTab({
  data, update,
}: {
  data: SettingsData
  update: <K extends keyof SettingsData>(key: K, value: Partial<SettingsData[K]>) => void
}) {
  const n = data.notifications
  const items: { key: keyof SettingsData['notifications']; label: string; desc: string; icon: React.ElementType }[] = [
    { key: 'newOrder', label: 'ออเดอร์ใหม่', desc: 'แจ้งเตือนเมื่อมีออเดอร์ใหม่เข้ามา', icon: Package },
    { key: 'lowStock', label: 'สต็อกต่ำ', desc: 'แจ้งเตือนเมื่อสินค้าใกล้หมดสต็อก', icon: AlertTriangle },
    { key: 'nearExpiry', label: 'ใกล้หมดอายุ', desc: 'แจ้งเตือนสินค้าที่ใกล้หมดอายุ', icon: Clock },
    { key: 'waste', label: 'ของเสีย', desc: 'แจ้งเตือนเมื่อมีการบันทึกของเสีย', icon: AlertTriangle },
    { key: 'lateDelivery', label: 'จัดส่งล่าช้า', desc: 'แจ้งเตือนเมื่อการจัดส่งเลยเวลา ETA', icon: Truck },
    { key: 'complaint', label: 'ร้องเรียน', desc: 'แจ้งเตือนเมื่อมีการร้องเรียนจากลูกค้า', icon: Bell },
  ]
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bell className="h-4 w-4 text-[var(--gold)]" /> การแจ้งเตือน
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Switch
                checked={n[key]}
                onCheckedChange={(v) => update('notifications', { [key]: v } as Partial<SettingsData['notifications']>)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Payments Tab ----------------
function PaymentsTab({
  data, update,
}: {
  data: SettingsData
  update: <K extends keyof SettingsData>(key: K, value: Partial<SettingsData[K]>) => void
}) {
  const p = data.payments
  const methods: { key: keyof SettingsData['payments']; label: string; desc: string; icon: React.ElementType }[] = [
    { key: 'cash', label: 'เงินสด', desc: 'รับชำระด้วยเงินสด ณ หน้าร้าน/เก็บปลายทาง', icon: Wallet },
    { key: 'promptpay', label: 'พร้อมเพย์', desc: 'QR Code พร้อมเพย์', icon: CreditCard },
    { key: 'creditCard', label: 'บัตรเครดิต', desc: 'Visa / Mastercard / JCB', icon: CreditCard },
    { key: 'trueMoney', label: 'TrueMoney', desc: 'กระเป๋าเงิน TrueMoney Wallet', icon: Coins },
    { key: 'shopeePay', label: 'ShopeePay', desc: 'กระเป๋าเงิน ShopeePay', icon: Coins },
  ]
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-[var(--gold)]" /> วิธีการชำระเงิน
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {methods.map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg ring-1',
                  p[key]
                    ? 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30'
                    : 'bg-muted text-muted-foreground ring-border'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn('text-[9px] ring-1 ring-inset', p[key] ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' : 'bg-muted text-muted-foreground ring-border')}>
                  {p[key] ? 'เปิดใช้' : 'ปิดอยู่'}
                </Badge>
                <Switch
                  checked={p[key]}
                  onCheckedChange={(v) => update('payments', { [key]: v } as Partial<SettingsData['payments']>)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Delivery Tab ----------------
function DeliveryTab({
  data, update,
}: {
  data: SettingsData
  update: <K extends keyof SettingsData>(key: K, value: Partial<SettingsData[K]>) => void
}) {
  const d = data.delivery
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-[var(--gold)]" /> การจัดส่ง
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ค่าจัดส่งมาตรฐาน (฿)" icon={Truck}>
            <div className="relative">
              <Input type="number" value={d.shippingFee} onChange={(e) => update('delivery', { shippingFee: e.target.value })} className="pl-7" />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
            </div>
          </Field>
          <Field label="ยอดขั้นต่ำจัดส่งฟรี (฿)" icon={Tag}>
            <div className="relative">
              <Input type="number" value={d.freeShippingThreshold} onChange={(e) => update('delivery', { freeShippingThreshold: e.target.value })} className="pl-7" />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">฿</span>
            </div>
          </Field>
        </div>
        <Field label="โซนการจัดส่ง" icon={MapPin}>
          <Textarea
            value={d.zones}
            onChange={(e) => update('delivery', { zones: e.target.value })}
            className="min-h-[140px] font-mono text-xs"
            placeholder="เช่น กรุงเทพฯ (฿40)&#10;นนทบุรี (฿60)&#10;ต่างจังหวัด (฿100)"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">แต่ละบรรทัดคือ 1 โซน — กด Enter เพื่อขึ้นบรรทัดใหม่</p>
        </Field>
        <div className="rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--gold)]">
            <Tag className="h-3.5 w-3.5" /> โปรโมชั่นจัดส่งฟรี
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ลูกค้าที่สั่งซื้อครบ <strong className="text-[var(--gold)]">฿{toThaiNumerals(d.freeShippingThreshold)}</strong> จะได้รับส่วนลดค่าจัดส่งฟรีอัตโนมัติ
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Helper ----------------
function Field({
  label, icon: Icon, children,
}: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs">
        <Icon className="h-3 w-3 text-muted-foreground" /> {label}
      </Label>
      {children}
    </div>
  )
}

// local helper for Thai numerals (avoid circular import)
function toThaiNumerals(n: number | string): string {
  const map = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']
  return String(n).replace(/[0-9]/g, (d) => map[Number(d)])
}
