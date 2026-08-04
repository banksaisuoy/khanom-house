# Task 3 — Storefront Agent — Work Record

**Task ID:** 3
**Agent:** Storefront Agent (หน้าร้าน)
**Task:** สร้างหน้าร้าน Khanom House ที่ `/` แบบ luxury Thai dessert e-commerce + catering, พร้อม cart drawer, checkout, flash sale, loyalty, catering inquiry

## Files Created

### Lib
- `src/lib/cart-store.ts` — Zustand cart store with persist (items, coupon, subtotal/shipping/total/count selectors)
- `src/lib/wishlist-store.ts` — Zustand wishlist store with persist + sessionKey
- `src/lib/product-emoji.ts` — slug/name → emoji + gradient mapping (by product type)
- `src/lib/types.ts` — ProductDTO, CategoryDTO, formatTHB, formatNumber

### API Routes (all use `import { db } from '@/lib/db'`, try/catch, NextResponse)
- `src/app/api/products/route.ts` — GET list with filters: ?category, ?q, ?flash, ?best, ?featured
- `src/app/api/products/[slug]/route.ts` — GET single product
- `src/app/api/orders/route.ts` — POST create order atomically (order + items + payment + decrement inventory + stock movements + loyalty log + customer upsert + coupon usage)
- `src/app/api/catering/inquiry/route.ts` — POST create CateringEvent (status DRAFT)
- `src/app/api/customers/register/route.ts` — POST register customer (tier BRONZE, unique phone check)
- `src/app/api/promotions/validate/route.ts` — GET validate coupon code
- `src/app/api/wishlist/route.ts` — GET (by sessionKey) + POST (add/remove by sessionKey)

### Components (all in `src/components/store/`)
- `storefront.tsx` — main client orchestrator (all 12 sections)
- `navbar.tsx` — sticky glass navbar with logo, nav links, search, dark mode, wishlist, cart badges
- `footer.tsx` — sticky bottom footer, 4 columns + bottom row
- `product-card.tsx` — reusable ProductCard with emoji image, badges, rating, member price, add button, wishlist heart, hover overlay
- `cart-drawer.tsx` — Sheet from right with items, qty +/-, coupon apply, free-shipping progress, summary, checkout button
- `checkout-dialog.tsx` — full checkout form + payment radio + order summary + success screen with orderNo
- `flash-sale-timer.tsx` — client countdown HH:MM:SS with suppressHydrationWarning
- `catering-inquiry-dialog.tsx` — form (name/phone/type/guests/date/notes) → creates CateringEvent
- `loyalty-register-dialog.tsx` — form (name/phone/email) → creates Customer, shows member code

### Page
- `src/app/page.tsx` — server component, fetches products + categories from DB via Prisma, passes ProductDTO[] to `<Storefront />`

## Sections Built (on `/`)
1. Announcement bar (gold, free shipping + points)
2. Navbar (sticky glass)
3. Hero (dark green gradient + thai-pattern + floating emoji cards + 2 CTAs + trust row)
4. Category pills (horizontal scroll, filter grid)
5. Flash Sale section (LIVE countdown + progress bar + horizontal scroll of flash products)
6. Best Sellers grid (isBestSeller, 2/3/4 cols responsive)
7. Featured grid (isFeatured)
8. All products grid
9. Catering section (4 package cards + trust stats + inquiry dialog)
10. Loyalty teaser (4 tier cards: Bronze/Silver/Gold/VIP + register dialog)
11. Freshness/Why-us (4 feature cards)
12. Testimonials (3 Thai customer reviews)
13. Footer (sticky bottom, 4 columns)

## Data Added
- Inserted 3 demo promotions via script: `KH10` (10%), `WELCOME` (15%, min ฿200), `FLASH20` (20%, min ฿100) — so the coupon feature works in the cart

## Verified Working
- ✅ `GET /` returns 200, SSR content includes "Khanom House", "ขนมไทยโบราณ", "Flash Sale", "จัดเบรค", "ขนมถ้วยฟู", "ทองหยิบ"
- ✅ `GET /api/products?flash=1` returns flash sale products
- ✅ `GET /api/products?best=1` returns best sellers
- ✅ `POST /api/orders` creates order end-to-end (returned `orderNo: KH20250041`)
- ✅ `POST /api/catering/inquiry` creates event (returned `EVT-24509`)
- ✅ `POST /api/customers/register` creates customer with member code
- ✅ `GET /api/promotions/validate?code=KH10` returns `valid:true, discount:0.1`
- ✅ `bun run lint` passes (0 errors, 0 warnings)

## Issues / Notes
- The admin agent (Task 2) has a compile error in `src/lib/dashboard.ts:471` (`upcomingEvents` defined multiple times) which caused a transient 500 on first hit of `/api/promotions/validate`. After turbopack recompiled, the route works fine. This is NOT a storefront issue — admin agent should fix `dashboard.ts`.
- Product images field is empty `[]` in seed, so ProductCard uses emoji-based gradient "image" placeholders (as specified in the task).
- Wishlist is stored both in localStorage (via Zustand persist) and synced to DB via `/api/wishlist` (sessionKey-based). The UI currently uses localStorage for instant feedback; the API is available for server-side persistence.
- Catering packages shown are static (4 hardcoded packages) since seed only has 3 CATERING_SET products; the static cards give better UX with bullet lists and pricing per person/tray.
