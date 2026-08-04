// Maps product slug/name → emoji + gradient class for the "image" placeholder

export interface ProductVisual {
  emoji: string
  gradient: string
}

const EMOJI_MAP: Record<string, string> = {
  // ขนมสด
  'khanom-tuai-fu': '🧁',
  'thong-yip': '🍯',
  'thong-yot': '🟡',
  'foi-thong': '🍝',
  'khanom-chan': '🟩',
  'look-chub': '🍒',
  sangkhaya: '🥥',
  'khanom-piak': '🍮',
  // ขนมแห้ง
  'fak-bua': '🍪',
  'khrueang-gaeng': '🍘',
  khrok: '🥮',
  'duey-kai': '🍖',
  // เครื่องดื่ม
  'tao-hu': '🥛',
  'cha-yen': '🍵',
  gafae: '☕',
  // ชุดของขวัญ
  'gift-4': '🎁',
  'gift-9': '🎁',
  // ชุดจัดเบรค
  'break-10': '🍱',
  'break-20': '🍱',
  // ชุดงานมงคล
  'ceremony-4': '🎊',
}

const GRADIENT_BY_TYPE: Record<string, string> = {
  FRESH: 'from-rose-200 via-amber-100 to-amber-200',
  DRY: 'from-amber-200 via-orange-100 to-yellow-200',
  DRINK: 'from-teal-200 via-emerald-100 to-teal-200',
  GIFT_SET: 'from-emerald-200 via-amber-100 to-amber-200',
  CATERING_SET: 'from-amber-200 via-rose-100 to-emerald-200',
  SEASONAL: 'from-rose-200 via-emerald-100 to-amber-200',
}

function nameHint(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('ถ้วยฟู')) return '🧁'
  if (n.includes('ทองหยิบ')) return '🍯'
  if (n.includes('ทองหยอด')) return '🟡'
  if (n.includes('ฝอยทอง')) return '🍝'
  if (n.includes('ขนมชั้น')) return '🟩'
  if (n.includes('ลูกชุบ')) return '🍒'
  if (n.includes('สังขยา')) return '🥥'
  if (n.includes('เปียก')) return '🍮'
  if (n.includes('ฝักบัว')) return '🍪'
  if (n.includes('เครื่องแกง')) return '🍘'
  if (n.includes('ครก')) return '🥮'
  if (n.includes('เดือยไก่')) return '🍖'
  if (n.includes('เต้าหู้')) return '🥛'
  if (n.includes('ชาเย็น')) return '🍵'
  if (n.includes('กาแฟ')) return '☕'
  if (n.includes('เครื่องดื่ม')) return '🥤'
  if (n.includes('ของขวัญ')) return '🎁'
  if (n.includes('จัดเบรค')) return '🍱'
  if (n.includes('มงคล') || n.includes('หมั้น')) return '🎊'
  return '🍡'
}

export function getProductVisual(
  slug?: string,
  name?: string,
  type?: string
): ProductVisual {
  let emoji = '🍡'
  if (slug && EMOJI_MAP[slug]) emoji = EMOJI_MAP[slug]
  else if (name) emoji = nameHint(name)
  const gradient = GRADIENT_BY_TYPE[type || 'FRESH'] || GRADIENT_BY_TYPE.FRESH
  return { emoji, gradient }
}
