// Thai date helpers — Buddhist Era (พ.ศ.) + Thai numerals + month names

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

export function toThaiNumerals(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => THAI_DIGITS[Number(d)])
}

export function formatThaiDate(date: Date, opts?: { short?: boolean; withDay?: boolean }): string {
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear() + 543 // Buddhist Era
  const monthName = opts?.short ? THAI_MONTHS_SHORT[month] : THAI_MONTHS[month]
  const dayName = THAI_DAYS[date.getDay()]
  const base = `${toThaiNumerals(day)} ${monthName} ${toThaiNumerals(year)}`
  if (opts?.withDay) return `วัน${dayName}ที่ ${base}`
  return base
}

export function formatThaiDateTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${formatThaiDate(date, { short: true })} ${toThaiNumerals(hh)}:${toThaiNumerals(mm)} น.`
}

export function formatThaiTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${toThaiNumerals(hh)}:${toThaiNumerals(mm)} น.`
}

export function thaiDayShort(dayIndex: number): string {
  return THAI_DAYS_SHORT[dayIndex] ?? ''
}

// Relative time in Thai.
//
// NOTE: this function reads `Date.now()`, so its output can differ
// between SSR and the first client render (the gap is typically a few
// hundred milliseconds, which is enough to flip "X วินาทีที่แล้ว" vs
// "(X+1) วินาทีที่แล้ว"). Callers that render `timeAgoThai(...)` output
// directly in JSX MUST either:
//   - add `suppressHydrationWarning` to the wrapping element, OR
//   - compute the value inside a `useEffect`-populated `mounted` state.
// Do NOT change this function itself — it is correct; the responsibility
// for hydration-safety lies with the rendering call site.
export function timeAgoThai(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${toThaiNumerals(sec)} วินาทีที่แล้ว`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${toThaiNumerals(min)} นาทีที่แล้ว`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${toThaiNumerals(hr)} ชั่วโมงที่แล้ว`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${toThaiNumerals(day)} วันที่แล้ว`
  const month = Math.floor(day / 30)
  return `${toThaiNumerals(month)} เดือนที่แล้ว`
}

// Currency formatting — Thai Baht with Thai numerals optional
export function formatBaht(amount: number, opts?: { thaiNumerals?: boolean }): string {
  const rounded = Math.round(amount)
  const formatted = rounded.toLocaleString('en-US')
  if (opts?.thaiNumerals) {
    return `฿${toThaiNumerals(formatted)}`
  }
  return `฿${formatted}`
}

export function formatNumber(n: number, opts?: { thaiNumerals?: boolean }): string {
  const formatted = n.toLocaleString('en-US')
  if (opts?.thaiNumerals) return toThaiNumerals(formatted)
  return formatted
}
