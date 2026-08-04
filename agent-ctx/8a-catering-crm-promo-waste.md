# Task 8-a — Admin Modules (Catering, Customers/CRM, Promotions, Waste) — Work Record

**Agent:** Catering/CRM/Promo/Waste Builder (Task 8-a)
**Date:** 2026-07-02

## What was built

4 admin modules (Task 8-a scope). The 4 modules were found substantially pre-built from a previous attempt (all client components, page.tsx wrappers, and API routes existed). My work focused on **auditing vs spec**, **fixing spec-compliance gaps**, **hardening API responses**, **end-to-end verification via curl**, and **writing the worklog**.

1. `/admin/catering` — Catering & Events (list + calendar + detail sheet + create/edit dialog)
2. `/admin/customers` — Customers & CRM/Loyalty (list + 360 detail sheet + form + points dialog)
3. `/admin/promotions` — Promotions & Coupons (list + create/edit dialog)
4. `/admin/waste` — Waste Management (KPI + 2 charts + table + log dialog)

## Files in scope (verified/edited)

### Catering (`/admin/catering`)
- `src/app/admin/catering/page.tsx` (server) — normalize checklist on parse
- `src/app/admin/catering/[id]/page.tsx` (server, full-page detail) — normalize checklist
- `src/components/admin/catering/catering-client.tsx` — KPI strip, list/calendar toggle, filters, cards, "เลยกำหนด" red countdown for overdue events
- `src/components/admin/catering/event-detail-sheet.tsx` — full info, items table, **interactive checklist with real PATCH persistence** (toggle updates `{text, done}[]` array via PATCH), status dropdown, print quote/confirmation
- `src/components/admin/catering/event-form-dialog.tsx` — full form, items builder (product picker + qty + price), checklist editor (default 5 spec items: สั่งวัตถุดิบ/ทำขนม/แพ็คกล่อง/ตรวจ QC/จัดส่ง), assigned user, vehicle
- `src/components/admin/catering/event-calendar.tsx` — month grid, prev/next nav, event chips by type, click date → day's events list, click event → detail
- `src/components/admin/catering/event-detail-page.tsx` — full-page variant wrapping the sheet
- `src/app/api/admin/catering/route.ts` — GET (filters type/status/from/to/q) + POST create; checklist normalized on GET
- `src/app/api/admin/catering/[id]/route.ts` — GET + PATCH (incl checklist) + DELETE; checklist normalized on GET
- `src/app/api/admin/catering/[id]/status/route.ts` — PATCH status with audit log

### Customers & CRM/Loyalty (`/admin/customers`)
- `src/app/admin/customers/page.tsx` (server)
- `src/app/admin/customers/[id]/page.tsx` (full-page variant — optional per spec)
- `src/components/admin/customers/customers-client.tsx` — KPI strip (6 metrics), tier distribution bar (gold-to-forest), birthday-this-month section, table with **email line in customer cell**, search + tier filter, CSV export
- `src/components/admin/customers/customer-detail-sheet.tsx` — 360 view: header (avatar + tier badge + points + member since), 4 stats (totalSpent/visitCount/avgBasket/favorite), 4 tabs (orders/loyalty/info/marketing), footer actions (ปรับแต้ม/แก้ไข/ส่งคูปอง)
- `src/components/admin/customers/customer-form-dialog.tsx` — name/phone/email/tier/points/birthday/notes (tier can be AUTO or manual override)
- `src/components/admin/customers/customer-detail-page.tsx` — wrapper for `/[id]` route
- `src/components/admin/customers/loyalty-adjust-dialog.tsx` — type (EARN/REDEEM/BONUS/EXPIRE) + points + reason → POST points API + tier-upgrade toast
- `src/app/api/admin/customers/route.ts` — GET (filters q/tier/birthdayMonth) + POST create (unique phone check, optional initial points → BONUS log)
- `src/app/api/admin/customers/[id]/route.ts` — GET (360 with orders+loyaltyLogs+favorite+stats) + PATCH + DELETE; favorite computed by grouping OrderItem by productId
- `src/app/api/admin/customers/[id]/points/route.ts` — POST {type, points, reason} → **$transaction atomic**: LoyaltyLog.create + customer.points/tier update; auto tier upgrade (SILVER≥500, GOLD≥1500, VIP≥3000); returns tierUpgraded flag

### Promotions (`/admin/promotions`)
- `src/app/admin/promotions/page.tsx` (server)
- `src/components/admin/promotions/promotions-client.tsx` — KPI strip (4), table (code monospace gold, type badge, value, usage progress, period Thai dates, status Active/Expired/Scheduled), CSV export, delete confirm
- `src/components/admin/promotions/promotion-form-dialog.tsx` — code/name/type/value/minSpend/maxDiscount/usageLimit/startsAt/endsAt/isActive switch + **product scope multi-select** (creates PromotionProduct rows)
- `src/app/api/admin/promotions/route.ts` — GET + POST (unique code check, optional productIds → createMany PromotionProduct)
- `src/app/api/admin/promotions/[id]/route.ts` — PATCH (in $transaction: deleteMany + createMany PromotionProduct + promotion.update) + DELETE

### Waste Management (`/admin/waste`)
- `src/app/admin/waste/page.tsx` (server)
- `src/components/admin/waste/waste-client.tsx` — KPI strip (6: month value, waste ratio, count, top source, total qty, avg/log), **donut chart by source** (recharts PieChart with CHART_PALETTE gold/forest/etc), **bar chart 14-day trend**, top wasted products grid, filter bar (source/date range/search), table (date Thai, product, source badge, qty+unit, value ฿ red, reason, recorder, delete), CSV export
- `src/components/admin/waste/waste-form-dialog.tsx` — product search+select (auto-fill name + costPrice), batchNo, source, quantity, unit, **auto-computed value (costPrice × qty, editable)**, reason textarea, **image upload placeholder button**
- `src/app/api/admin/waste/route.ts` — GET (filters from/to/source/q) + POST create (validates source)
- `src/app/api/admin/waste/stats/route.ts` — GET returns {totalValue, totalQty, count, wasteRatio, monthRevenue, topSource, bySource[], trend[14 days], topProducts[]} — revenue fetched from COMPLETED/DELIVERED/PAID orders this month
- `src/app/api/admin/waste/[id]/route.ts` — DELETE

### Shared lib (new helper)
- `src/lib/admin-ui.ts` — added `normalizeChecklist(raw)` + `ChecklistItem` type — accepts both legacy `string[]` and new `{text, done}[]` JSON formats, returns normalized `{text, done}[]`. Used in all catering read paths (page.tsx, [id]/page.tsx, API GET list, API GET [id]) so the storefront inquiry route (which still writes `string[]`) keeps working without modification.

## Spec-compliance fixes I made (on top of pre-existing implementation)

1. **Catering checklist persistence** — pre-existing code did a *no-op PATCH* (sent back the same `string[]`). Spec says "toggling PATCHes the event with updated checklist array". Fixed:
   - Changed storage format to `{text: string; done: boolean}[]` JSON
   - Added `normalizeChecklist()` helper in `src/lib/admin-ui.ts` for backward-compat with legacy `string[]` data (incl. storefront inquiry route)
   - Updated all 4 read paths (server pages, API GET list, API GET by id) to normalize
   - `event-detail-sheet.tsx`: toggle now updates local state AND PATCHes the new array (real persistence across sessions)
   - `event-form-dialog.tsx`: form uses `ChecklistItem[]` (text editable, done preserved on edit), default checklist aligned to spec's 5 items (สั่งวัตถุดิบ/ทำขนม/แพ็คกล่อง/ตรวจ QC/จัดส่ง) — was 7 different items before
   - `CateringEventDetail.checklist` type changed from `string[]` to `ChecklistItem[]`

2. **Catering "เลยกำหนด" red countdown** — pre-existing code used shared `countdownLabel()` which returns "ผ่านมาแล้ว N วัน" (not "เลยกำหนด"), and styled it gold (not red). Spec: `"ในอีก 3 วัน" / "เลยกำหนด" red`. Fixed in `catering-client.tsx` list card: when `daysFromNow(eventDate) < 0` and status not CANCELLED/COMPLETED, show "· เลยกำหนด" in red-600; today's events shown in amber-600; otherwise gold.

3. **Customers table email column** — spec table: "name, phone, email, tier badge...". Pre-existing table showed only name+phone in the customer cell. Added `c.email` as a third line below phone (truncate) so all 3 fields are visible per row without widening the table.

4. **Waste form image upload** — spec says "image upload (placeholder button)". Pre-existing implementation was a non-interactive `<div>`. Changed to a `<button type="button">` that triggers a sonner toast on click.

5. **Waste form — removed stale `eslint-disable`** — `// eslint-disable-line` on the value-recompute `useEffect` deps was unused (lint warning). Fixed by adding `products` to the deps array (the missing dep that the disable was presumably guarding against).

6. **DEFAULT_CHECKLIST aligned to spec** — pre-existing form default was 7 custom items (รับงาน/สั่งวัตถุดิบ/ทำขนมตามเมนู/แพ็คกล่อง จัดพาน/ตรวจ QC/จัดส่ง/เก็บเงินส่วนที่เหลือ). Spec calls for 5: สั่งวัตถุดิบ/ทำขนม/แพ็คกล่อง/ตรวจ QC/จัดส่ง. Updated.

## End-to-End API Tests (curl)

- ✅ `GET /api/admin/catering` → 200 (9 events, checklist normalized to `{text, done}[]`)
- ✅ `POST /api/admin/catering` → 201 EVT-25010 (with items + checklist) — then deleted
- ✅ `GET /api/admin/catering/[id]` → 200 (full detail, normalized checklist)
- ✅ `PATCH /api/admin/catering/[id]` (checklist toggle) → 200; verified GET returns updated `done:true`
- ✅ `PATCH /api/admin/catering/[id]/status` QUOTED→CONFIRMED → 200
- ✅ `GET /api/admin/customers` → 200 (11 customers, 4 tiers)
- ✅ `GET /api/admin/customers?q=...` → 200 (search by name)
- ✅ `GET /api/admin/customers/[id]` → 200 (360 view with orders/loyaltyLogs/favorite/stats)
- ✅ `POST /api/admin/customers/[id]/points` EARN 50 → 200 (points 85→135, BRONZE)
- ✅ `POST /api/admin/customers/[id]/points` BONUS 500 → 200 (points 135→635, **tierUpgraded:true**, BRONZE→SILVER)
- ✅ `PATCH /api/admin/customers/[id]` (reset points+tier) → 200
- ✅ `GET /api/admin/promotions` → 200 (3 promos: KH10/WELCOME/FLASH20)
- ✅ `POST /api/admin/promotions` TEST15 → 201 — then deleted
- ✅ `DELETE /api/admin/promotions/[id]` → 200
- ✅ `GET /api/admin/waste` → 200
- ✅ `GET /api/admin/waste/stats` → 200 (totalValue/count/wasteRatio/bySource[5]/trend[14]/topProducts)
- ✅ `POST /api/admin/waste` → 201 — then deleted
- ✅ `DELETE /api/admin/waste/[id]` → 200

## Page Render Tests (HTTP 200)
- `/admin/catering` ✅ (renders จัดงาน & รับเบรค + สร้างงานใหม่ + รายการ/ปฏิทิน toggle + 6 KPI labels)
- `/admin/catering/[id]` ✅ (full-page detail)
- `/admin/customers` ✅ (renders ลูกค้า & สมาชิก + เพิ่มลูกค้า + Export CSV + การกระจาย Tier + วันเกิดเดือนนี้ + อัตรากลับมาซื้อซ้ำ + 4 tier badges)
- `/admin/customers/[id]` ✅ (full-page 360)
- `/admin/promotions` ✅ (renders โปรโมชั่น & คูปอง + สร้างโปร + 3 codes KH10/WELCOME/FLASH20 + 4 KPIs)
- `/admin/waste` ✅ (renders จัดการของเสีย + บันทึกของเสีย + 6 KPI labels + 2 chart titles)

## Quality
- `bun run lint` — **0 errors, 0 warnings** (was 1 warning before; fixed unused eslint-disable)
- All admin routes + API endpoints return 200 OK
- `$transaction` atomic: POST /api/admin/customers/[id]/points (LoyaltyLog + customer update), PATCH /api/admin/promotions/[id] (PromotionProduct deleteMany + createMany + promotion update)
- Theme luxury Thai Gold+Cream+DarkGreen — no blue/indigo
- All Thai labels, Thai dates พ.ศ., Thai numerals, ฿ currency
- framer-motion: list cards motion.button, table rows motion.tr, calendar selected-date motion.div
- sonner toast feedback on every mutation
- Loading skeletons + empty states
- shadcn/ui throughout (Sheet, Dialog, Tabs, Select, Table, AlertDialog, Card, Badge, Avatar, ScrollArea, Switch, Checkbox, etc.)
- recharts donut (waste by source) + bar chart (14-day trend) with CHART_PALETTE gold/forest/amber/terracotta/sage/sienna/metallic — no blue/indigo
- Responsive: grid layouts use sm/md/lg breakpoints, table has overflow-x-auto

## Honest notes
- Pre-existing implementation was already substantial (the previous agent or attempt had built all 4 modules + APIs). My contribution: spec-compliance audit + 6 targeted fixes (checklist persistence, red countdown, email column, image upload button, lint warning, default checklist) + end-to-end verification + worklog.
- The Catering checklist format change is backward-compatible: legacy `string[]` data (from seed + storefront inquiry route) is normalized to `{text, done}[]` on read. New writes use the new format. Storefront inquiry route (`/api/catering/inquiry`) was NOT modified — out of scope.
- No real auth — APIs are open. Spec says acceptable for demo.
- Waste `wasteRatio` can exceed 100% in the seed data because revenue this month is low (only some COMPLETED/DELIVERED/PAID orders fall in current month, while waste logs span the seeded 7-day window). This is a data quirk, not a bug.
- Some seed customers have `visitCount>0` and `totalSpent>0` but `orders: []` (e.g. คุณปิติ: visitCount=4, totalSpent=1200, orders=0) — seed data inconsistency from Task 1, not my bug. The 360 view correctly shows the discrepancy.
- Pre-existing PrismaClientValidationError in `/admin/deliveries` (Task 5's module) — not in my scope, mentioned in Task 7's worklog too.
- All 4 module pages render in 250-1300ms (first compile slower, subsequent renders <300ms).
