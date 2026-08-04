// ============================================================
// Shared admin UI helpers — badge configs, labels, csv export
// (Thai enterprise color system: gold / forest / amber / cream)
// ============================================================

export type BadgeConfig = { label: string; cls: string }

// ---------- Catering event type ----------
const EVENT_TYPE_CONFIG: Record<string, BadgeConfig> = {
  BREAK: { label: 'จัดเบรค', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  SEMINAR: { label: 'สัมมนา', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  WEDDING: { label: 'แต่งงาน', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30' },
  MERIT: { label: 'งานบุญ', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/30' },
  CORPORATE: { label: 'องค์กร', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  PARTY: { label: 'ปาร์ตี้', cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/30' },
}
export function eventTypeConfig(t: string): BadgeConfig {
  return EVENT_TYPE_CONFIG[t] ?? { label: t, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ---------- Catering event status ----------
const EVENT_STATUS_CONFIG: Record<string, BadgeConfig> = {
  DRAFT: { label: 'ร่าง', cls: 'bg-muted text-muted-foreground ring-border' },
  QUOTED: { label: 'ส่งใบเสนอราคา', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  CONFIRMED: { label: 'ยืนยันแล้ว', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  PREPARING: { label: 'กำลังเตรียม', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  DELIVERED: { label: 'จัดส่งแล้ว', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/30' },
  COMPLETED: { label: 'เสร็จสิ้น', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  CANCELLED: { label: 'ยกเลิก', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
}
export function eventStatusConfig(s: string): BadgeConfig {
  return EVENT_STATUS_CONFIG[s] ?? { label: s, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ---------- Customer tier ----------
const TIER_CONFIG: Record<string, BadgeConfig & { min: number; icon?: string }> = {
  BRONZE: { label: 'BRONZE', min: 0, cls: 'bg-amber-700/15 text-amber-700 dark:text-amber-400 ring-amber-700/30' },
  SILVER: { label: 'SILVER', min: 500, cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30' },
  GOLD: { label: 'GOLD', min: 1500, cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  VIP: { label: 'VIP', min: 3000, cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-300 ring-[var(--forest)]/30' },
}
export function tierConfig(t: string) {
  return TIER_CONFIG[t] ?? TIER_CONFIG.BRONZE
}
export function computeTier(points: number): string {
  if (points >= 3000) return 'VIP'
  if (points >= 1500) return 'GOLD'
  if (points >= 500) return 'SILVER'
  return 'BRONZE'
}
export const TIER_RULES = [
  { tier: 'BRONZE', min: 0, perk: 'สะสมแต้มทุกยอดซื้อ' },
  { tier: 'SILVER', min: 500, perk: 'รับส่วนลดสมาชิก 5%' },
  { tier: 'GOLD', min: 1500, perk: 'รับส่วนลดสมาชิก 10% + ของขวัญวันเกิด' },
  { tier: 'VIP', min: 3000, perk: 'รับส่วนลด 15% + จัดส่งฟรี + สิทธิพิเศษ' },
]

// ---------- Promotion type ----------
const PROMO_TYPE_CONFIG: Record<string, BadgeConfig> = {
  PERCENT: { label: 'เปอร์เซ็นต์', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  FIXED: { label: 'จำนวนตรง', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  BOGO: { label: 'ซื้อ 1 แถม 1', cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/30' },
}
export function promoTypeConfig(t: string): BadgeConfig {
  return PROMO_TYPE_CONFIG[t] ?? { label: t, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ---------- Waste source ----------
const WASTE_SOURCE_CONFIG: Record<string, BadgeConfig> = {
  PRODUCTION: { label: 'การผลิต', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  EXPIRED: { label: 'หมดอายุ', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
  DAMAGED: { label: 'ชำรุด', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30' },
  RETURNED: { label: 'ถูกส่งคืน', cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30' },
  TRANSPORT: { label: 'ขนส่ง', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
}
export function wasteSourceConfig(s: string): BadgeConfig {
  return WASTE_SOURCE_CONFIG[s] ?? { label: s, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ---------- Delivery status ----------
const DELIVERY_STATUS_CONFIG: Record<string, BadgeConfig> = {
  ASSIGNED: { label: 'รอจัดส่ง', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  PICKED_UP: { label: 'รับสินค้าแล้ว', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  ON_THE_WAY: { label: 'กำลังส่ง', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  DELIVERED: { label: 'ส่งสำเร็จ', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  FAILED: { label: 'ส่งไม่สำเร็จ', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
}
export function deliveryStatusConfig(s: string): BadgeConfig {
  return DELIVERY_STATUS_CONFIG[s] ?? { label: s, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ---------- Order status ----------
const ORDER_STATUS_CONFIG: Record<string, BadgeConfig> = {
  PENDING: { label: 'รอชำระ', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  PAID: { label: 'ชำระแล้ว', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  PREPARING: { label: 'กำลังเตรียม', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  COOKING: { label: 'กำลังทำ', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  PACKING: { label: 'กำลังแพ็ค', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  OUT_FOR_DELIVERY: { label: 'ออกส่ง', cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/30' },
  COMPLETED: { label: 'เสร็จสิ้น', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  CANCELLED: { label: 'ยกเลิก', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
  REFUNDED: { label: 'คืนเงิน', cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30' },
}
export function orderStatusConfig(s: string): BadgeConfig {
  return ORDER_STATUS_CONFIG[s] ?? { label: s, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ---------- Audit action ----------
const AUDIT_ACTION_CONFIG: Record<string, BadgeConfig> = {
  CREATE: { label: 'สร้าง', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  UPDATE: { label: 'แก้ไข', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  DELETE: { label: 'ลบ', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
  LOGIN: { label: 'เข้าระบบ', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  LOGOUT: { label: 'ออกระบบ', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  APPROVE: { label: 'อนุมัติ', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/30' },
  STATUS_CHANGE: { label: 'เปลี่ยนสถานะ', cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/30' },
  ADJUST: { label: 'ปรับปรุง', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  EXPORT: { label: 'ส่งออก', cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30' },
}
export function auditActionConfig(a: string): BadgeConfig {
  return AUDIT_ACTION_CONFIG[a] ?? { label: a, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ---------- User role ----------
const ROLE_CONFIG: Record<string, BadgeConfig> = {
  SUPER_ADMIN: { label: 'Super Admin', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  BRANCH_MANAGER: { label: 'Manager', cls: 'bg-[var(--forest)]/15 text-[var(--forest)] dark:text-emerald-400 ring-[var(--forest)]/30' },
  KITCHEN: { label: 'ครัว', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30' },
  CASHIER: { label: 'แคชเชียร์', cls: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/30' },
  RIDER: { label: 'คนส่ง', cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/30' },
  ACCOUNTANT: { label: 'บัญชี', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30' },
  STAFF: { label: 'พนักงาน', cls: 'bg-muted text-muted-foreground ring-border' },
}
export function roleConfig(r: string): BadgeConfig {
  return ROLE_CONFIG[r] ?? { label: r, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ---------- Loyalty log type ----------
const LOYALTY_TYPE_CONFIG: Record<string, BadgeConfig> = {
  EARN: { label: 'รับแต้ม', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30' },
  REDEEM: { label: 'ใช้แต้ม', cls: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30' },
  BONUS: { label: 'แต้มโบนัส', cls: 'bg-[var(--gold)]/15 text-[var(--gold)] ring-[var(--gold)]/30' },
  EXPIRE: { label: 'หมดอายุ', cls: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30' },
}
export function loyaltyTypeConfig(t: string): BadgeConfig {
  return LOYALTY_TYPE_CONFIG[t] ?? { label: t, cls: 'bg-muted text-muted-foreground ring-border' }
}

// ============================================================
// CSV export helper — accepts array of objects, returns CSV string
// ============================================================

function escapeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s: string
  if (v instanceof Date) s = v.toISOString()
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  // escape quotes by doubling them, wrap in quotes if contains comma/quote/newline
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toCsv(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (rows.length === 0 && !columns) return ''
  const cols =
    columns ??
    Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).map((k) => ({ key: k, label: k }))
  const header = cols.map((c) => escapeCsvCell(c.label)).join(',')
  const body = rows.map((r) => cols.map((c) => escapeCsvCell(r[c.key])).join(',')).join('\n')
  // prefix with BOM for Excel Thai support
  return '\uFEFF' + header + '\n' + body
}

// Trigger CSV download in browser
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

// ============================================================
// Checklist helpers — catering events store checklist as a JSON
// string. We accept both legacy `string[]` and the new structured
// `{ text: string; done: boolean }[]` format; normalize on read.
// ============================================================

export type ChecklistItem = { text: string; done: boolean }

export function normalizeChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item): ChecklistItem => {
    if (typeof item === 'string') return { text: item, done: false }
    if (item && typeof item === 'object' && 'text' in item) {
      return { text: String((item as { text?: unknown }).text ?? ''), done: !!(item as { done?: unknown }).done }
    }
    return { text: String(item), done: false }
  })
}

// ============================================================
// Date helpers (small ones; main lib in thai-date.ts)
// ============================================================

export function daysFromNow(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function countdownLabel(date: Date | string): string {
  const n = daysFromNow(date)
  if (n === 0) return 'วันนี้'
  if (n === 1) return 'พรุ่งนี้'
  if (n === -1) return 'เมื่อวาน'
  if (n > 0) return `ในอีก ${n} วัน`
  return `ผ่านมาแล้ว ${Math.abs(n)} วัน`
}

export function googleMapsUrl(query: string): string {
  return `https://maps.google.com?q=${encodeURIComponent(query)}`
}

export function googleMapsDirectionsUrl(from: string, to: string): string {
  return `https://www.google.com/maps/dir/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
}

// Chart palette (gold/forest/cream/amber/terracotta — no blue/indigo)
export const CHART_PALETTE = [
  '#C5A572', // gold
  '#1B3A2F', // forest
  '#B8862F', // dark gold
  '#E8A33D', // amber
  '#E76F51', // terracotta
  '#7C9885', // sage
  '#A0522D', // sienna
  '#D4AF37', // metallic
]

export function avatarInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] ?? '') + (parts[1][0] ?? '')
}
