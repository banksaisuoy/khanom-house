'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, X, Truck, Clock } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBaht } from '@/lib/thai-date'

export type DeliveryZoneFormValues = {
  name: string
  districts: string[]
  shippingFee: number
  freeShippingThreshold: number
  estimatedDays: number
  isActive: boolean
}

export type DeliveryZoneRow = {
  id: string
  name: string
  districts: string[]
  shippingFee: number
  freeShippingThreshold: number
  estimatedDays: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  zone?: DeliveryZoneRow | null
  onSubmit: (values: DeliveryZoneFormValues, id?: string) => void
}

// Common Bangkok districts to suggest
const BANGKOK_DISTRICTS = [
  'คลองเตย', 'วัฒนา', 'หลักสี่', 'บางนา', 'พระโขนง', 'สวนหลวง', 'บางกะปิ',
  'ห้วยขวาง', 'ดินแดง', 'พญาไท', 'ราชเทวี', 'ปทุมวัน', 'บางรัก', 'สาทร',
  'ยานนาวา', 'คันนายาว', 'บึงกุ่ม', 'ลาดกระบัง', 'สุวรรณภูมิ',
]

export function DeliveryZoneFormDialog({ open, onOpenChange, zone, onSubmit }: Props) {
  const isEdit = !!zone
  const [name, setName] = React.useState('')
  const [districts, setDistricts] = React.useState<string[]>([])
  const [districtInput, setDistrictInput] = React.useState('')
  const [shippingFee, setShippingFee] = React.useState<number | ''>(40)
  const [freeShippingThreshold, setFreeShippingThreshold] = React.useState<number | ''>(500)
  const [estimatedDays, setEstimatedDays] = React.useState<number | ''>(1)
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    if (zone) {
      setName(zone.name)
      setDistricts(zone.districts)
      setShippingFee(zone.shippingFee)
      setFreeShippingThreshold(zone.freeShippingThreshold)
      setEstimatedDays(zone.estimatedDays)
      setIsActive(zone.isActive)
    } else {
      setName('')
      setDistricts([])
      setShippingFee(40)
      setFreeShippingThreshold(500)
      setEstimatedDays(1)
      setIsActive(true)
    }
    setDistrictInput('')
  }, [open, zone])

  function addDistrict(d: string) {
    const v = d.trim()
    if (!v) return
    if (districts.includes(v)) return
    setDistricts((prev) => [...prev, v])
    setDistrictInput('')
  }

  function removeDistrict(d: string) {
    setDistricts((prev) => prev.filter((x) => x !== d))
  }

  function handleAddSuggested(d: string) {
    if (!districts.includes(d)) setDistricts((prev) => [...prev, d])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || districts.length === 0) return
    onSubmit(
      {
        name: name.trim(),
        districts,
        shippingFee: Number(shippingFee) || 0,
        freeShippingThreshold: Number(freeShippingThreshold) || 0,
        estimatedDays: Number(estimatedDays) || 1,
        isActive,
      },
      zone?.id
    )
  }

  const suggested = BANGKOK_DISTRICTS.filter((d) => !districts.includes(d)).slice(0, 8)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[var(--gold)]" />
            {isEdit ? 'แก้ไขพื้นที่จัดส่ง' : 'เพิ่มพื้นที่จัดส่งใหม่'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? `แก้ไขข้อมูล "${zone?.name}"` : 'กำหนดเขต/อำเภอและค่าจัดส่งสำหรับพื้นที่นี้'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 px-6 py-5">
              <Field label="ชื่อโซน *">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น กรุงเทพในเมือง / ชานเมือง / ต่างจังหวัด"
                  required
                />
              </Field>

              {/* Districts builder */}
              <div className="space-y-2">
                <Field label="เขต/อำเภอที่รองรับ *">
                  <div className="flex gap-1">
                    <Input
                      value={districtInput}
                      onChange={(e) => setDistrictInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addDistrict(districtInput)
                        }
                      }}
                      placeholder="พิมพ์เขต/อำเภอ แล้วกด Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => addDistrict(districtInput)}
                      disabled={!districtInput.trim()}
                      title="เพิ่ม"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Field>

                {/* Suggested districts */}
                {suggested.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground w-full">แนะนำ:</span>
                    {suggested.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleAddSuggested(d)}
                        className="rounded-full border border-dashed border-border bg-card px-2 py-0.5 text-[10px] hover:bg-muted/50"
                      >
                        + {d}
                      </button>
                    ))}
                  </div>
                )}

                {/* Added districts */}
                <div className="flex flex-wrap gap-1.5 rounded-md border bg-card p-2 min-h-[44px]">
                  <AnimatePresence>
                    {districts.length === 0 ? (
                      <span className="text-xs text-muted-foreground p-1">ยังไม่มีเขต/อำเภอ</span>
                    ) : (
                      districts.map((d) => (
                        <motion.div
                          key={d}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Badge variant="secondary" className="gap-1 pr-1">
                            {d}
                            <button
                              type="button"
                              onClick={() => removeDistrict(d)}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                              aria-label={`ลบ ${d}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Fee + threshold */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 border-t pt-4">
                <Field label="ค่าจัดส่ง (฿)">
                  <div className="relative">
                    <Truck className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      value={shippingFee}
                      onChange={(e) => setShippingFee(e.target.value === '' ? '' : Number(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </Field>
                <Field label="ฟรีเมื่อซื้อ >= (฿)">
                  <Input
                    type="number"
                    min={0}
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0 = ไม่มีฟรี"
                  />
                </Field>
                <Field label="ระยะเวลา (วัน)">
                  <div className="relative">
                    <Clock className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={estimatedDays}
                      onChange={(e) => setEstimatedDays(e.target.value === '' ? '' : Number(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </Field>
              </div>

              {/* Live preview */}
              <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                <p className="font-semibold text-muted-foreground mb-2">ตัวอย่าง</p>
                <div className="flex items-center justify-between">
                  <span>ค่าจัดส่ง: </span>
                  <span className="font-bold text-[var(--gold)]">
                    {formatBaht(Number(shippingFee) || 0)}
                  </span>
                </div>
                {Number(freeShippingThreshold) > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                    <span>ซื้อครบ {formatBaht(Number(freeShippingThreshold) || 0)} → ฟรี!</span>
                    <span>✓</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <div>
                  <p className="text-sm">สถานะใช้งาน</p>
                  <p className="text-[10px] text-muted-foreground">ปิดเพื่อซ่อนจากหน้าชำระเงิน</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button
              type="submit"
              className="bg-[var(--forest)] text-[var(--gold)] hover:bg-[var(--forest)]/90"
              disabled={!name.trim() || districts.length === 0}
            >
              {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มพื้นที่จัดส่ง'}
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
