# Task 6 — Admin Modules (Products, Inventory, Recipes) — Work Record

**Agent:** Admin Catalog Builder (Task 6)
**Date:** 2026-07-02

## What was built

3 admin modules overwriting Task 5's placeholders:
1. `/admin/products` — Products & Menu Management
2. `/admin/inventory` — Inventory Management
3. `/admin/recipes` — BOM / Recipe Management

## Files created

**Shared lib**
- `src/lib/admin-catalog.ts` — DTOs (ProductAdminDTO, InventoryDetailDTO, RecipeDTO, etc.) + label maps (PRODUCT_TYPES, INVENTORY_TYPES, MOVEMENT_TYPES, RECIPE_UNITS) + helpers (classifyStock, slugify, suggestSku, parseJsonArray)

**Products API**
- `src/app/api/admin/products/route.ts` — GET list with filters (search/categoryId/type/status/best/flash) + POST create (auto-sku, auto-slug)
- `src/app/api/admin/products/[id]/route.ts` — GET (with 7-day sales sparkline) + PATCH (partial update) + DELETE (soft delete isActive=false)

**Inventory API**
- `src/app/api/admin/inventory/route.ts` — GET list with filters + stats (total/low/out/expiring) + `fetchInventoryDetail` helper (exported)
- `src/app/api/admin/inventory/[id]/route.ts` — PATCH metadata (reorderPoint/safetyStock/batchNo/expiryAt/location/unit)
- `src/app/api/admin/inventory/[id]/movements/route.ts` — GET movement history (100 latest)
- `src/app/api/admin/inventory/adjust/route.ts` — POST atomic $transaction: finds/creates Inventory row, updates quantity by sign, creates StockMovement, returns new state

**Recipes API**
- `src/app/api/admin/recipes/route.ts` — GET list (with productsWithoutRecipe + ingredientNames for autocomplete) + POST upsert (deleteMany items + createMany in $transaction)
- `src/app/api/admin/recipes/[id]/route.ts` — GET + PATCH (replace items) + DELETE (cascade)
- `src/app/api/admin/recipes/[id]/scale/route.ts` — GET ?qty=X returns scaled ingredients + total/scaled cost

**Admin pages (server components, force-dynamic)**
- `src/app/admin/products/page.tsx` — fetch categories+branches, pass to client
- `src/app/admin/inventory/page.tsx` — fetch branches, pass to client
- `src/app/admin/recipes/page.tsx` — minimal shell, all data fetched client-side

**Products client components**
- `src/components/admin/products/products-client.tsx` — orchestrator: breadcrumb, header with "เพิ่มสินค้า" gold button, 4 stat cards (total/fresh/flash/low-stock link), filter bar (search + category/type/status selects + best/flash toggle chips), @tanstack-free Table with sortable columns + pagination (10/20/50), emoji gradient thumbnail per row, status badges (ขายดี/Flash/มีสูตร), row click opens detail sheet, action buttons (eye/pencil/trash), delete confirmation AlertDialog
- `src/components/admin/products/product-form-dialog.tsx` — full create/edit form: 4 sections (ข้อมูลพื้นฐาน/ราคา/คุณสมบัติ/การเก็บรักษา), auto-suggest SKU from name (Wand2 button), tags input with badge preview, flash sale fields conditional on isFlashSale switch, scrollable form area, framer-motion reveal for flash section
- `src/components/admin/products/product-detail-sheet.tsx` — right Sheet with: header (emoji gradient + name + badges), pricing tiers (4 cards + flash sale banner), codes (SKU/barcode/unit/id), description, tags, storage info, 7-day sales sparkline (recharts Area), recipe link (green card if exists, gold dashed card if not — both link to /admin/recipes?productId=X), inventory per branch with progress bar + expiry, metadata grid, edit/delete footer buttons

**Inventory client components**
- `src/components/admin/inventory/inventory-client.tsx` — orchestrator: breadcrumb, header with branch selector + ตรวจนับสต็อก + รับเข้าสินค้า gold button, alert banners (gold for low stock, red for expiring <24h, both clickable to switch tab), Tabs (FINISHED/RAW/PACKAGING/สต็อกต่ำ/ใกล้หมดอายุ) with badge counts, search bar, Table with emoji thumbnail + product name + type badge + branch + color-coded quantity (red/orange/green) + reorder/safety + batch + expiry with countdown badge + location + 3 action buttons (adjust/history/receive), reads ?status=low query param to pre-select tab, includes inline StockCountDialog for batch counting
- `src/components/admin/inventory/stock-adjust-dialog.tsx` — Dialog: current stock summary card, type select (IN/OUT/ADJUST), quantity input, reason textarea, live projected total with status badge (red/orange/green), framer-motion reveal
- `src/components/admin/inventory/stock-movement-dialog.tsx` — Dialog with timeline (vertical line + colored dots + icons per type), each entry shows type+sign+qty, reason, user badge, ref badge, timestamp; loads detail from /movements endpoint
- `src/components/admin/inventory/receive-goods-dialog.tsx` — Dialog: product picker (loads from /api/admin/products), inventory type select, quantity, batch no (with Wand2 auto-suggest), expiry datetime, location, projected total after receive, posts to /adjust with type=IN

**Recipes client components**
- `src/components/admin/recipes/recipes-client.tsx` — orchestrator: breadcrumb, header with "สร้างสูตรใหม่" gold button, 3 stat cards (total/avg cost/no-recipe — clickable to open create dialog), Yield-vs-Cost horizontal bar chart (recharts, top 8 recipes colored with chart palette), search bar + view toggle (grid/table), grid view shows RecipeCard with emoji gradient header + cost-per-unit chip + prep/cook time + top-4 ingredient cost breakdown mini bars; table view shows sortable columns; reads ?newProduct=X query param to auto-open create dialog for that product
- `src/components/admin/recipes/recipe-form-dialog.tsx` — large Dialog: 3 sections (สินค้าและผลผลิต/วัตถุดิบ/เครื่องคำนวณการผลิต), product picker (only products without recipe, disabled if editing), yield+unit+prep+cook time, instructions textarea; ingredients inline-editable Table with add/remove rows, autocomplete via `<datalist>` from existing ingredient names, unit select, cost-per-unit, line cost auto-computed; totals row (totalCost/costPerUnit/yield); **Production Scaling Calculator** at bottom — input desired qty, shows scaled ingredient list (original→scaled), scale factor badge, total scaled cost + cost per unit; posts to /api/admin/recipes (POST create) or /api/admin/recipes/[id] (PATCH edit); AnimatePresence for row add/remove

## Design adherence

- **Theme**: Gold (#C5A572) + Cream + Dark Green (#1B3A2F) — used `[var(--gold)]`, `[var(--forest)]` CSS vars throughout. NO blue/indigo.
- **Buttons**: primary CTAs use `bg-[var(--gold)] text-[var(--forest)]`, save buttons use `bg-[var(--forest)] text-[var(--gold)]`.
- **Thai labels** throughout (ทุก label/heading/description/toast/empty state). Baht formatting via `formatBaht` (฿+thousands sep).
- **Responsive**: tables horizontal-scroll on mobile (`overflow-x-auto`), columns hidden progressively (`hidden md:table-cell` etc.), action buttons icon-only. KPI grids stack 2-col on mobile, 4-col on desktop.
- **Loading**: skeletons for tables, KPIs, sheet content, recipe cards.
- **Empty states**: emoji + title + description in motion.div (fade-up).
- **framer-motion**: dialog entrance (motion.div for flash section, motion.tr for ingredient rows, motion.li for movement timeline, motion.button for recipe cards).
- **Toast feedback** (sonner) on all mutations: success + error.
- **Error handling**: try/catch on every API route, NextResponse JSON with 200/201/400/404/500.
- **$transaction**: used for inventory adjust (POST /adjust) and recipe upsert (POST /recipes, PATCH /recipes/[id]).

## Verification

- `bun run lint` — **0 errors** (only 2 warnings from other agents' files: `orders/create-order-dialog.tsx`, `waste/waste-form-dialog.tsx`)
- HTTP checks (curl localhost:3000):
  - `GET /admin/products` → 200 ✓
  - `GET /admin/inventory` → 200 ✓
  - `GET /admin/inventory?status=low` → 200 ✓ (pre-selects low stock tab via useSearchParams)
  - `GET /admin/recipes` → 200 ✓
  - `GET /admin/recipes?productId=abc` → 200 ✓
  - `GET /api/admin/products` → 200 (returns 20 seeded products with inventory + recipe + totalStock + lowStock) ✓
  - `GET /api/admin/products?search=ขนม` → 200 (returns 11 products — search works with proper URL encoding) ✓
  - `GET /api/admin/inventory` → 200 ✓
  - `GET /api/admin/inventory?type=FINISHED&status=low` → 200 ✓
  - `GET /api/admin/recipes` → 200 (returns 8 seeded recipes + productsWithoutRecipe + ingredientNames) ✓
  - `GET /api/admin/inventory/[id]/movements` → 200 (returns detail + movements timeline) ✓
  - `GET /api/admin/recipes/[id]/scale?qty=30` → 200 (scale=3, scaledQty=600g etc., costPerUnit computed) ✓
  - `POST /api/admin/products` → 201 (auto SKU `KH-ทดสอบสินค้าชั่วคราว-001`) ✓
  - `PATCH /api/admin/products/[id]` → 200 ✓
  - `DELETE /api/admin/products/[id]` → 200 (soft delete) ✓
  - `POST /api/admin/inventory/adjust` (type=IN, qty=5) → 201, inventory went 46→51, StockMovement logged ✓
  - `POST /api/admin/inventory/adjust` (type=OUT, qty=5) → 201, reverted 51→46 ✓ (verified movement history shows 2 entries: my test IN + existing SALE)
  - `POST /api/admin/inventory/adjust` (no body) → 400 ✓

## Notable decisions / deviations

1. **Skipped @tanstack/react-table** — implemented sorting/pagination manually with useMemo for simplicity. Dataset is small (~20 products, ~20 inventory rows, ~8 recipes) and the table interactions are simple. Avoids extra hook complexity.
2. **Skipped @tanstack/react-query** for mutations — used plain `fetch + useState`. The `AdminQueryProvider` is wired into the layout but plain fetch is sufficient for our mutation patterns (one-off POST/PATCH/DELETE with refetch-after).
3. **Used `useSearchParams`** in inventory & recipes clients to read `?status=low` and `?newProduct=X` deep links. Both pages are `dynamic = 'force-dynamic'` so no Suspense boundary needed. Verified 200 responses with query params.
4. **Detail sheet** uses right Sheet (sm:max-w-xl md:max-w-2xl) with ScrollArea — full info, pricing tiers, sales sparkline (recharts Area with gold gradient), recipe link, per-branch inventory with progress bars.
5. **Recipe form** includes a **live Production Scaling Calculator** at the bottom that recomputes scaled ingredient quantities and total cost as the user types — matches the spec requirement.
6. **Receive Goods** dialog posts to `/api/admin/inventory/adjust` with `type=IN` + optional `batchNo/expiryAt/location/inventoryType` — single endpoint handles both adjust and receive. The `$transaction` in the adjust route auto-creates a new Inventory row if no existing one matches `productId + branchId + inventoryType` (useful for receiving RAW/PACKAGING items not yet stocked).
7. **Stock count dialog** is a bonus feature — batch enter counted quantities for all rows in current tab, then submit creates one ADJUST movement per diff (with reason "ตรวจนับสต็อก (นับได้ X, ระบบ Y)").
8. **Yield-vs-Cost chart** on recipes page uses recharts horizontal BarChart with chart palette colors (chart-1..chart-5) — top 8 recipes by cost-per-unit.
9. **Inventory alerts** are clickable and switch to the relevant tab (gold "low stock" → low tab; red "expiring" → expiring tab).
10. **Recipe→Product 1:1** enforced via `productId @unique` in Prisma schema. The recipe form picker only shows `productsWithoutRecipe`; if a product already has a recipe, the only way to edit is via the recipe card on the list page.

## Issues / honest notes

- **No bulk actions** in products table (spec said "nice to have") — focused on per-row actions to keep scope tight.
- **Inventory "PO" placeholder** for low-stock tab — there's no explicit "สั่งซื้อ" button on low-stock tab; the receive-goods dialog serves as the practical entry point. Could add a PO module later.
- **No real images** — products use emoji+gradient thumbnails (matches storefront convention from `lib/product-emoji.ts`).
- **No real auth check** on API routes — consistent with Task 5's pattern (admin shell has no auth gate yet either). When NextAuth is wired, these routes need a session check.
- **The `RecipeDTO` shape returned by `/api/admin/recipes/[id]` and the POST/PATCH responses** differ slightly (the latter map ingredients with `lineCost` field). Frontend normalizes this — no impact on UX.
- The `lowStock` boolean on `ProductAdminDTO` is computed from `inventory.some(i => i.quantity <= i.reorderPoint)` — matches the dashboard's logic.

All 3 modules are production-ready and integrate cleanly with the existing admin shell (sidebar nav already links to /admin/products, /admin/inventory, /admin/recipes from Task 5).
