// Shared client-side product type (matches what /api/products returns)
export interface CategoryDTO {
  id: string
  name: string
  nameEn?: string | null
  slug: string
  icon?: string | null
  sortOrder?: number
}

export interface ProductDTO {
  id: string
  name: string
  nameEn?: string | null
  slug: string
  sku: string
  description?: string | null
  categoryId: string
  type: string // FRESH | DRY | DRINK | GIFT_SET | CATERING_SET | SEASONAL
  price: number
  memberPrice?: number | null
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
  category?: CategoryDTO | null
}

export const formatTHB = (n: number) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)

export const formatNumber = (n: number) =>
  new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(n)
