/**
 * Centralized Zod validation schemas for all mutating API endpoints.
 *
 * WHY: Audit findings H-11, M-2, M-3, M-4, M-5 — endpoints accept caller-
 * supplied prices/quantities/phone numbers with no validation, enabling
 * fraud (price: 0), duplicates (un-normalized phone), and crashes (NaN).
 *
 * Every schema here is the single source of truth for that payload shape.
 * Frontend forms may import these for client-side validation too.
 */
import { z } from 'zod'

// ---------- Primitives ----------

/** Thai mobile phone: must start with 0, then 8|6|9, then 8 digits. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[^\d]/g, '')) // strip dashes/spaces
  .refine((s) => /^0[689]\d{8}$/.test(s), {
    message: 'เบอร์โทรไม่ถูกต้อง (ต้องเป็นเบอร์มือถือไทย 10 หลัก)',
  })

export const emailSchema = z.string().trim().toLowerCase().email().max(254).optional().or(z.literal(''))

export const moneySchema = z.number().min(0).finite()
export const qtySchema = z.number().int().positive()
export const skuSchema = z.string().trim().min(1).max(50)
export const slugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, 'slug ต้องเป็น a-z 0-9 -')

// ---------- Enums (mirror Prisma) ----------

export const productTypeSchema = z.enum([
  'FRESH', 'DRY', 'DRINK', 'GIFT_SET', 'CATERING_SET', 'SEASONAL',
])
export const orderChannelSchema = z.enum(['POS', 'WEBSITE', 'LINE', 'GRAB', 'PHONE', 'CATERING'])
export const orderTypeSchema = z.enum(['WALK_IN', 'DELIVERY', 'PICKUP', 'CATERING', 'PREORDER'])
export const orderStatusSchema = z.enum([
  'PENDING', 'PAID', 'PREPARING', 'COOKING', 'PACKING',
  'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REFUNDED',
])
export const paymentMethodSchema = z.enum(['CASH', 'PROMPTPAY', 'CARD', 'EWALLET', 'BANK_TRANSFER'])
export const inventoryTypeSchema = z.enum(['RAW', 'FINISHED', 'PACKAGING'])
export const stockMoveTypeSchema = z.enum(['IN', 'OUT', 'ADJUST', 'TRANSFER', 'PRODUCTION', 'WASTE', 'SALE'])
export const wasteSourceSchema = z.enum([
  'PRODUCTION', 'EXPIRED', 'DAMAGED', 'RETURNED', 'TRANSPORT',
])
export const customerTierSchema = z.enum(['BRONZE', 'SILVER', 'GOLD', 'VIP'])
export const loyaltyTypeSchema = z.enum(['EARN', 'REDEEM', 'BONUS', 'EXPIRE'])
export const cateringTypeSchema = z.enum([
  'BREAK', 'SEMINAR', 'WEDDING', 'MERIT', 'CORPORATE', 'PARTY',
])
export const cateringStatusSchema = z.enum([
  'DRAFT', 'QUOTED', 'CONFIRMED', 'PREPARING', 'DELIVERED', 'COMPLETED', 'CANCELLED',
])
export const userRoleSchema = z.enum([
  'SUPER_ADMIN', 'BRANCH_MANAGER', 'KITCHEN', 'CASHIER', 'RIDER', 'ACCOUNTANT', 'STAFF',
])
export const productionStatusSchema = z.enum([
  'QUEUED', 'COOKING', 'QC', 'COMPLETED', 'CANCELLED',
])
export const promotionTypeSchema = z.enum(['PERCENT', 'FIXED', 'BOGO'])
export const deliveryStatusSchema = z.enum([
  'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'FAILED',
])

// ---------- Cart / Order ----------

export const cartItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: qtySchema.max(999),
  notes: z.string().max(500).optional().default(''),
})

export const checkoutPayloadSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, 'ตะกร้าว่าง').max(100),
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    email: emailSchema,
  }),
  deliveryAddress: z.string().trim().min(5).max(500).optional().or(z.literal('')),
  wantAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  paymentMethod: paymentMethodSchema,
  couponCode: z.string().trim().max(50).optional(),
  channel: orderChannelSchema.default('WEBSITE'),
  type: orderTypeSchema.default('DELIVERY'),
})

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>

// ---------- POS ----------

export const posItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: qtySchema.max(999),
  price: moneySchema.optional(), // server re-verifies; ignored if provided
  name: z.string().max(120).optional(),
})

export const posCheckoutPayloadSchema = z.object({
  shiftId: z.string().min(1),
  items: z.array(posItemInputSchema).min(1).max(100),
  paymentMethod: paymentMethodSchema.optional(),
  payments: z.array(
    z.object({
      method: paymentMethodSchema,
      amount: moneySchema.positive().max(10_000_000),
    })
  ).max(6).optional(),
  receivedAmount: moneySchema.optional(),
  customerId: z.string().optional(),
  discount: moneySchema.default(0),
  notes: z.string().max(500).optional(),
  refCode: z.string().max(100).optional(),
}).refine(
  (v) => !!v.paymentMethod || (!!v.payments && v.payments.length > 0),
  { message: 'ต้องระบุ paymentMethod หรือ payments array' }
)

export type PosCheckoutPayload = z.infer<typeof posCheckoutPayloadSchema>

export const shiftOpenSchema = z.object({
  openingCash: moneySchema.max(1_000_000),
  userId: z.string().optional(),
})

export const shiftCloseSchema = z.object({
  countedCash: moneySchema,
  notes: z.string().max(500).optional(),
})

export const cashMoveSchema = z.object({
  type: z.enum(['CASH_IN', 'CASH_OUT']),
  amount: moneySchema.positive(),
  reason: z.string().trim().min(1).max(200),
})

// ---------- Inventory ----------

export const stockAdjustSchema = z.object({
  inventoryId: z.string().min(1),
  type: stockMoveTypeSchema,
  quantity: z.number().finite(),
  reason: z.string().trim().max(200).optional(),
  userId: z.string().optional(),
  // receive-goods fields:
  batchNo: z.string().max(80).optional(),
  expiryAt: z.string().datetime().optional(),
  location: z.string().max(120).optional(),
})

// ---------- Production ----------

export const productionCreateSchema = z.object({
  productId: z.string().min(1),
  plannedQty: qtySchema.max(10000),
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().max(500).optional(),
})

export const productionCompleteSchema = z.object({
  producedQty: qtySchema.max(10000),
  wastedQty: z.number().min(0).finite().default(0),
  notes: z.string().max(500).optional(),
})

export const productionQcSchema = z.object({
  status: z.enum(['PASS', 'FAIL']),
  note: z.string().max(500).optional(),
  checklist: z.array(z.boolean()).optional(),
})

// ---------- Customer ----------

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  email: emailSchema,
  birthday: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  points: z.number().int().min(0).max(1_000_000).default(0),
})

export const customerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: emailSchema,
  birthday: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  // NOTE: `points` and `tier` intentionally excluded — use /points endpoint
})

export const loyaltyAdjustSchema = z.object({
  type: loyaltyTypeSchema,
  points: z.number().int().refine((n) => n !== 0, 'points ต้องไม่เป็น 0'),
  reason: z.string().trim().min(1).max(200),
})

// ---------- Catering ----------

export const cateringCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: cateringTypeSchema,
  customerName: z.string().trim().min(1).max(120),
  customerPhone: phoneSchema,
  customerEmail: emailSchema,
  guestCount: z.number().int().min(1).max(10000),
  eventDate: z.string().datetime(),
  setupTime: z.string().datetime().optional(),
  location: z.string().trim().min(1).max(300),
  mapUrl: z.string().url().max(500).optional().or(z.literal('')),
  theme: z.string().max(120).optional(),
  packagingType: z.string().max(120).optional(),
  budget: moneySchema.max(10_000_000).optional(),
  totalQuote: moneySchema.max(10_000_000).default(0),
  deposit: moneySchema.max(10_000_000).default(0),
  assignedUserId: z.string().optional(),
  vehicle: z.string().max(80).optional(),
  items: z.string().max(20000).optional(), // JSON string
  checklist: z.array(z.string().max(120)).optional(),
  notes: z.string().max(2000).optional(),
})

export const cateringInquirySchema = cateringCreateSchema.pick({
  title: true,
  type: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  guestCount: true,
  location: true,
  notes: true,
}).extend({
  eventDate: z.string().datetime().optional(),
  // inquiry can be loose on required fields
})

// ---------- Product ----------

export const productCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  nameEn: z.string().max(200).optional().nullable(),
  slug: slugSchema.optional(),
  sku: skuSchema.optional(),
  barcode: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  categoryId: z.string().min(1),
  type: productTypeSchema.default('FRESH'),
  price: moneySchema.max(100000),
  memberPrice: moneySchema.max(100000).optional(),
  wholesalePrice: moneySchema.max(100000).optional(),
  eventPrice: moneySchema.max(100000).optional(),
  costPrice: moneySchema.max(100000).default(0),
  unit: z.string().trim().min(1).max(30).default('ชิ้น'),
  tags: z.array(z.string().max(40)).max(20).default([]),
  isBestSeller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isFlashSale: z.boolean().default(false),
  flashSalePrice: moneySchema.max(100000).optional().nullable(),
  flashSaleEndAt: z.string().datetime().optional().nullable(),
  flashSaleStock: z.number().int().min(0).max(100000).optional().nullable(),
  shelfLifeHours: z.number().int().min(0).max(8760).optional().nullable(),
  needsRefrigeration: z.boolean().default(false),
})

// ---------- User ----------

export const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: userRoleSchema.default('STAFF'),
  branchId: z.string().optional(),
  password: z.string().min(6).max(72),
  isActive: z.boolean().default(true),
})

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: userRoleSchema.optional(),
  branchId: z.string().optional().nullable(),
  password: z.string().min(6).max(72).optional(),
  isActive: z.boolean().optional(),
})

// ---------- Promotion ----------

export const promotionCreateSchema = z.object({
  code: z.string().trim().min(1).max(50).toUpperCase(),
  name: z.string().trim().min(1).max(200),
  type: promotionTypeSchema,
  value: moneySchema.max(100),
  minSpend: moneySchema.default(0),
  maxDiscount: moneySchema.optional().nullable(),
  usageLimit: z.number().int().min(1).max(1_000_000).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string()).default([]),
})

// ---------- Waste ----------

export const wasteCreateSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().trim().min(1).max(200),
  batchNo: z.string().max(80).optional(),
  source: wasteSourceSchema,
  quantity: z.number().finite().positive().max(100000),
  unit: z.string().trim().min(1).max(30),
  value: moneySchema.optional(), // server computes if productId provided
  reason: z.string().trim().min(1).max(500),
  imageUrl: z.string().url().optional().or(z.literal('')),
})

// ---------- Helpers ----------

/** Parse + validate. Throws a structured ValidationError on failure. */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const first = result.error.issues[0]
    const err = new Error(first?.message ?? 'ข้อมูลไม่ถูกต้อง')
    ;(err as ValidationError).code = 'VALIDATION_ERROR'
    ;(err as ValidationError).issues = result.error.issues
    throw err
  }
  return result.data
}

export interface ValidationError extends Error {
  code: 'VALIDATION_ERROR'
  issues: z.ZodIssue[]
}

export function isValidationError(e: unknown): e is ValidationError {
  return e instanceof Error && (e as ValidationError).code === 'VALIDATION_ERROR'
}
