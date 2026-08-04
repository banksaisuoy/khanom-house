// Shared order status / channel / payment configuration used by orders UI & APIs.

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'COOKING'
  | 'PACKING'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIAL' | 'REFUNDED'

export type OrderChannel = 'POS' | 'WEBSITE' | 'LINE' | 'GRAB' | 'PHONE' | 'CATERING'

export type OrderType = 'WALK_IN' | 'DELIVERY' | 'PICKUP' | 'CATERING' | 'PREORDER'

export type PaymentMethod = 'CASH' | 'PROMPTPAY' | 'CARD' | 'EWALLET' | 'BANK_TRANSFER'

export const ORDER_FLOW: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PREPARING',
  'COOKING',
  'PACKING',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
]

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; short: string; cls: string; dot: string; icon: string }
> = {
  PENDING: {
    label: 'รอดำเนินการ',
    short: 'รอยืนยัน',
    cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dot: 'bg-amber-500',
    icon: '⏳',
  },
  PAID: {
    label: 'ชำระแล้ว',
    short: 'ชำระแล้ว',
    cls: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    dot: 'bg-teal-500',
    icon: '✅',
  },
  PREPARING: {
    label: 'กำลังเตรียม',
    short: 'เตรียม',
    cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
    dot: 'bg-violet-500',
    icon: '🥄',
  },
  COOKING: {
    label: 'กำลังทำ',
    short: 'ทำ',
    cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
    dot: 'bg-orange-500',
    icon: '🔥',
  },
  PACKING: {
    label: 'กำลังแพ็ค',
    short: 'แพ็ค',
    cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    dot: 'bg-yellow-500',
    icon: '📦',
  },
  OUT_FOR_DELIVERY: {
    label: 'กำลังจัดส่ง',
    short: 'จัดส่ง',
    cls: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    dot: 'bg-cyan-500',
    icon: '🛵',
  },
  COMPLETED: {
    label: 'สำเร็จ',
    short: 'สำเร็จ',
    cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: '🎉',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    short: 'ยกเลิก',
    cls: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
    dot: 'bg-red-500',
    icon: '✖️',
  },
  REFUNDED: {
    label: 'คืนเงิน',
    short: 'คืนเงิน',
    cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    dot: 'bg-rose-500',
    icon: '↩️',
  },
}

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; cls: string }
> = {
  UNPAID: {
    label: 'ยังไม่ชำระ',
    cls: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
  },
  PAID: {
    label: 'ชำระแล้ว',
    cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  PARTIAL: {
    label: 'ชำระบางส่วน',
    cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  REFUNDED: {
    label: 'คืนเงินแล้ว',
    cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
}

export const CHANNEL_CONFIG: Record<OrderChannel, { label: string; icon: string; cls: string }> = {
  POS: { label: 'POS หน้าร้าน', icon: '🏪', cls: 'bg-[var(--gold)]/15 text-[var(--gold-foreground)] border-[var(--gold)]/30' },
  WEBSITE: { label: 'เว็บไซต์', icon: '🌐', cls: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30' },
  LINE: { label: 'LINE OA', icon: '💬', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  GRAB: { label: 'Grab', icon: '🛵', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  PHONE: { label: 'โทรสั่ง', icon: '📞', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  CATERING: { label: 'Catering', icon: '🎊', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
}

export const ORDER_TYPE_CONFIG: Record<OrderType, { label: string; icon: string }> = {
  WALK_IN: { label: 'รับหน้าร้าน', icon: '🏃' },
  DELIVERY: { label: 'จัดส่ง', icon: '🛵' },
  PICKUP: { label: 'มารับเอง', icon: '🥡' },
  CATERING: { label: 'จัดเลี้ยง', icon: '🎊' },
  PREORDER: { label: 'สั่งล่วงหน้า', icon: '📅' },
}

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: string }> = {
  CASH: { label: 'เงินสด', icon: '💵' },
  PROMPTPAY: { label: 'พร้อมเพย์ QR', icon: '📱' },
  CARD: { label: 'บัตรเครดิต', icon: '💳' },
  EWALLET: { label: 'กระเป๋าเงิน', icon: '👛' },
  BANK_TRANSFER: { label: 'โอนผ่านธนาคาร', icon: '🏦' },
}

export function nextStatus(current: OrderStatus): OrderStatus | null {
  const idx = ORDER_FLOW.indexOf(current)
  if (idx < 0 || idx >= ORDER_FLOW.length - 1) return null
  return ORDER_FLOW[idx + 1]
}

export function statusIndex(s: OrderStatus): number {
  const i = ORDER_FLOW.indexOf(s)
  return i < 0 ? -1 : i
}

// Get next status options that make sense for an action menu.
export function actionableStatuses(current: OrderStatus): OrderStatus[] {
  const next = nextStatus(current)
  const opts: OrderStatus[] = []
  if (next) opts.push(next)
  if (current !== 'COMPLETED' && current !== 'CANCELLED' && current !== 'REFUNDED') {
    opts.push('COMPLETED', 'CANCELLED')
  }
  return opts
}
