// Shared admin catalog DTOs + label maps for Products / Inventory / Recipes modules.

export interface CategoryDTO {
  id: string
  name: string
  nameEn?: string | null
  slug: string
  icon?: string | null
  sortOrder: number
}

export interface InventoryRowDTO {
  id: string
  branchId: string
  branchName: string
  type: string // RAW | FINISHED | PACKAGING
  quantity: number
  unit: string
  reorderPoint: number
  safetyStock: number
  batchNo?: string | null
  expiryAt?: string | null
  location?: string | null
  updatedAt: string
}

export interface RecipeRefDTO {
  id: string
  yieldQty: number
  yieldUnit: string
}

export interface ProductAdminDTO {
  id: string
  name: string
  nameEn?: string | null
  slug: string
  sku: string
  barcode?: string | null
  description?: string | null
  categoryId: string
  category?: CategoryDTO | null
  type: string
  price: number
  memberPrice?: number | null
  wholesalePrice?: number | null
  eventPrice?: number | null
  costPrice: number
  unit: string
  images: string[]
  tags: string[]
  isBestSeller: boolean
  isFeatured: boolean
  isFlashSale: boolean
  flashSalePrice?: number | null
  flashSaleEndAt?: string | null
  flashSaleStock?: number | null
  shelfLifeHours?: number | null
  needsRefrigeration: boolean
  // Allergen + storage + diet metadata (Task FILL-MULTI)
  allergens: string[]
  storageInstructions?: string | null
  consumeWithin?: string | null
  isVegan: boolean
  isHalal: boolean
  isVegetarian: boolean
  rating: number
  reviewCount: number
  soldCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  inventory: InventoryRowDTO[]
  recipe?: RecipeRefDTO | null
  totalStock: number
  lowStock: boolean
}

// Common Thai allergens (Task FILL-MULTI)
export const ALLERGEN_PRESETS = [
  'ไข่', 'กะทิ', 'ถั่ว', 'แป้งสาลี', 'นม', 'งา', 'ถั่วเหลือง',
] as const

export const STORAGE_PRESETS = ['แช่เย็น', 'แช่แข็ง', 'อุณหภูมิห้อง'] as const

export interface StockMovementDTO {
  id: string
  type: string
  quantity: number
  reason?: string | null
  refType?: string | null
  refId?: string | null
  userId?: string | null
  userName?: string | null
  createdAt: string
}

export interface InventoryDetailDTO {
  id: string
  productId: string
  productName: string
  productSlug?: string | null
  productType?: string | null
  branchId: string
  branchName: string
  type: string
  quantity: number
  unit: string
  reorderPoint: number
  safetyStock: number
  batchNo?: string | null
  expiryAt?: string | null
  location?: string | null
  updatedAt: string
  status: 'OUT' | 'LOW' | 'SAFETY' | 'OK'
  movements: StockMovementDTO[]
}

export interface RecipeItemDTO {
  id?: string
  ingredientName: string
  quantity: number
  unit: string
  costPerUnit: number
  lineCost: number
}

export interface RecipeDTO {
  id: string
  productId: string
  productName: string
  productSlug?: string | null
  productType?: string | null
  yieldQty: number
  yieldUnit: string
  prepTimeMin: number
  cookTimeMin: number
  instructions?: string | null
  items: RecipeItemDTO[]
  totalCost: number
  costPerUnit: number
}

// ---------- Label maps ----------

export const PRODUCT_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: 'FRESH', label: 'ขนมสด', emoji: '🍰' },
  { value: 'DRY', label: 'ขนมแห้ง', emoji: '🍪' },
  { value: 'DRINK', label: 'เครื่องดื่ม', emoji: '🥤' },
  { value: 'GIFT_SET', label: 'ชุดของขวัญ', emoji: '🎁' },
  { value: 'CATERING_SET', label: 'ชุดจัดเบรค/Catering', emoji: '🍱' },
  { value: 'SEASONAL', label: 'ขนมตามฤดู', emoji: '🎊' },
]

export function productTypeLabel(t: string): string {
  return PRODUCT_TYPES.find((p) => p.value === t)?.label ?? t
}

export function productTypeEmoji(t: string): string {
  return PRODUCT_TYPES.find((p) => p.value === t)?.emoji ?? '🍡'
}

export const INVENTORY_TYPES: { value: string; label: string; emoji: string }[] = [
  { value: 'FINISHED', label: 'สินค้าสำเร็จรูป', emoji: '🧁' },
  { value: 'RAW', label: 'วัตถุดิบ', emoji: '🌾' },
  { value: 'PACKAGING', label: 'บรรจุภัณฑ์', emoji: '📦' },
]

export function inventoryTypeLabel(t: string): string {
  return INVENTORY_TYPES.find((p) => p.value === t)?.label ?? t
}

export const MOVEMENT_TYPES: { value: string; label: string; sign: 1 | -1 | 0; color: string }[] = [
  { value: 'IN', label: 'รับเข้า', sign: 1, color: 'text-emerald-600' },
  { value: 'OUT', label: 'เบิกออก', sign: -1, color: 'text-rose-600' },
  { value: 'ADJUST', label: 'ปรับปรุง', sign: 0, color: 'text-amber-600' },
  { value: 'TRANSFER', label: 'โอนย้าย', sign: 0, color: 'text-sky-600' },
  { value: 'PRODUCTION', label: 'ผลิต', sign: 1, color: 'text-emerald-600' },
  { value: 'WASTE', label: 'เสีย', sign: -1, color: 'text-red-600' },
  { value: 'SALE', label: 'ขาย', sign: -1, color: 'text-orange-600' },
]

export function movementLabel(t: string): string {
  return MOVEMENT_TYPES.find((m) => m.value === t)?.label ?? t
}

export function movementColor(t: string): string {
  return MOVEMENT_TYPES.find((m) => m.value === t)?.color ?? 'text-muted-foreground'
}

export const RECIPE_UNITS = ['g', 'ml', 'ชิ้น', 'ฟอง', 'กก.', 'ลิตร', 'ถ้วย', 'ช้อนโต๊ะ', 'กำ']

export function classifyStock(qty: number, reorder: number, safety: number): 'OUT' | 'LOW' | 'SAFETY' | 'OK' {
  if (qty <= 0) return 'OUT'
  if (qty <= safety) return 'SAFETY'
  if (qty <= reorder) return 'LOW'
  return 'OK'
}

// Slug from Thai/English name
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^ก-๙a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Suggest SKU from name (e.g. "ขนมถ้วยฟู" → "KH-TUAI-FU-XXX")
export function suggestSku(name: string, existing: string[] = []): string {
  const slug = slugify(name)
  const parts = slug.split('-').slice(0, 3).join('-').toUpperCase()
  const base = `KH-${parts || 'NEW'}`
  let n = 1
  let candidate = `${base}-${String(n).padStart(3, '0')}`
  const set = new Set(existing)
  while (set.has(candidate)) {
    n += 1
    candidate = `${base}-${String(n).padStart(3, '0')}`
  }
  return candidate
}

// Parse JSON string field safely
export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}
