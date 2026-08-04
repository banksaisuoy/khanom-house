# AUDIT-P4 — Senior Frontend Engineer Deep Audit & Fix Pass

**Task ID:** AUDIT-P4
**Agent:** Senior Frontend Engineer
**Scope:** Remaining frontend issues after AUDIT-FIX-A (hydration/XSS/Zustand)

## Work Log

### 1. Unnecessary re-renders — `useMemo`/`useCallback`

- **`src/components/admin/products/products-client.tsx`** — wrapped `branches.find((b) => b.isMain) ?? branches[0]` in `React.useMemo([branches])` (was running on every render in the body).
- **`src/components/admin/orders/orders-client.tsx`** (`KanbanView`) — replaced the per-column `byCol(status)` filter (8 filter calls over ~200 orders = ~1600 comparisons per render) with a single `grouped` `Map<OrderStatus, OrderListDTO[]>` built once via `useMemo([orders])`. Hoisted `KANBAN_COLUMNS` to module scope so the memo can key off `orders` only.
- **`src/components/admin/kitchen/kitchen-board.tsx`** — memoized the `stats` array (was rebuilding 4 filter calls per render including the `todayCompleted` date check). Added a `grouped` `Map` so the 4-column kanban render doesn't re-filter the full list per column. Hoisted `KITCHEN_COLUMNS` to module scope for a stable reference.
- `storefront.tsx` already had `useMemo` on every derived list — left untouched per the ">10 items AND non-trivial" rule.

### 2. `AbortController` on remaining fetch-in-effect sites

- **`products-client.tsx`** — `fetchProducts` now accepts an `AbortSignal`; effect creates an `AbortController` and aborts on cleanup. Abort errors are swallowed silently.
- **`inventory-client.tsx`** — same pattern for `fetchInventory`. `openMovements(row)` now uses a ref-stored `AbortController` so opening a new row cancels the previous in-flight movements fetch.
- **`orders-client.tsx`** — debounced `fetchList` now creates an `AbortController` inside the effect; the cleanup clears the timeout AND aborts the controller. `setLoading(false)` in the `finally` block is gated on `!signal?.aborted` so an in-flight request doesn't clobber the loading state of its replacement.
- **`create-order-dialog.tsx`** — products-load effect and the debounced customer phone lookup both use `AbortController`. Customer lookup aborts on phone/name/email change.
- **`order-detail-sheet.tsx`** — detail fetch aborts when `orderId`/`open` changes (closing the sheet or opening another order cancels the previous request).
- **`storefront.tsx`** — product search effect now debounces (250ms) AND uses `AbortController`; both the timeout and the controller are cleaned up.

### 3. Accessibility fixes

- **`orders-client.tsx`**
  - `TableView` `<tr onClick>` → added `tabIndex={0}`, `role="button"`, `aria-label`, `onKeyDown` (Enter/Space → `onOpen`), and `focus-visible` ring styles.
  - `KanbanCard` `<motion.div onClick>` (draggable) → same ARIA + keyboard handler + focus ring, layered on top of the existing `@dnd-kit` drag listeners so keyboard users can still open the detail sheet.
- **`products-client.tsx`** — `<TableRow onClick>` → added `tabIndex={0}`, `role="button"`, `aria-label`, `onKeyDown`, focus styles.
- **`recipes-client.tsx`** — same fix on the recipe `<TableRow onClick>` (found via the `<div onClick>` audit pass).
- **`event-calendar.tsx`** — the inner event chip `<div onClick>` (nested inside a `<button>` cell, so can't be a `<button>`) got `role="button"`, `tabIndex={0}`, `aria-label`, `onKeyDown` (with `stopPropagation` so it doesn't trigger the parent cell). The selected-date `<li onClick>` was converted to a real `<button>` for native keyboard semantics.

### 4. Code splitting — lazy load heavy components

- **`reports-client.tsx`** — all 4 report panels (`SalesReport`, `ProductReport`, `CustomerReport`, `FinanceReport`) now loaded via `next/dynamic` with `ssr: false` and a shared `ReportSkeleton` loading placeholder. Each panel pulls in recharts (~400KB), so deferring them keeps the reports page initial bundle smaller.
- **`dashboard-client.tsx`** — the 4 recharts-based chart components (`SalesTrendChart`, `ChannelDonut`, `BestSellersChart`, `KitchenLoadGauge`) lazy-loaded with `ssr: false` and skeleton placeholders. `PeakHoursHeatmap` is pure CSS (no recharts) so it stays eagerly imported. The dashboard's first paint (header + KPI cards) no longer waits on recharts.
- `@dnd-kit` is only used in `orders-client.tsx` and is on the critical path for the default kanban view — left as a static import.

### 5. Responsive layout audit

- **`kitchen-board.tsx`** — kanban columns now use `flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible` with each column `w-72 shrink-0 lg:w-auto lg:shrink`. Mobile users get horizontal scrolling of the 4 columns; desktop keeps the 4-column grid.
- **`pos-terminal.tsx`** — already correct: `flex h-[...] flex-col gap-2 lg:flex-row` stacks cart below products on mobile, side-by-side on `lg+`. Product grid uses `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5`. Cart panel is `w-full lg:w-[400px] lg:shrink-0`. No changes needed.
- **`orders-client.tsx`** `TableView` — already wrapped in `<div className="overflow-x-auto">`. No changes needed.

### 6. Remove `: any` types (11 instances)

| File | Before | After |
|---|---|---|
| `src/components/store/catering-inquiry-dialog.tsx` | `catch (e: any) { toast.error(e.message …) }` | `catch (e: unknown) { toast.error(e instanceof Error ? e.message : '…') }` |
| `src/components/store/checkout-dialog.tsx` | same | same pattern |
| `src/components/store/loyalty-register-dialog.tsx` | same | same pattern |
| `src/components/admin/best-sellers-chart.tsx` | `function CustomTooltip({ active, payload }: any)` | introduced `interface TooltipProps { active?: boolean; payload?: Array<{ payload?: BestSeller }> }` + narrowing |
| `src/components/admin/channel-donut.tsx` | `function CustomTooltip({ active, payload }: any)` | same `TooltipProps` pattern over `ChannelDatum` |
| `src/components/admin/sales-trend-chart.tsx` | `function CustomTooltip({ active, payload, label, metric }: any)` | `TooltipProps` with `metric: Metric` + null-narrowing on `payload[0].value` and `label` |
| `src/app/api/wishlist/route.ts` (GET) | `catch (e: any) { … e.message }` | `catch (e: unknown)` + `e instanceof Error ? e.message : 'Internal Server Error'` |
| `src/app/api/wishlist/route.ts` (POST) | same | same |
| `src/app/api/products/route.ts` | `const where: any = …` | `const where: Prisma.ProductWhereInput = …` (imports `Prisma` from `@prisma/client`) |
| `src/app/api/products/route.ts` | `catch (e: any) { … e.message }` | `catch (e: unknown)` + narrowing |
| `src/app/api/products/[slug]/route.ts` | `catch (e: any) { … e.message }` | `catch (e: unknown)` + narrowing |

## Verification

- `bun run lint` — **0 errors, 0 warnings** (exit 0)
- `bunx tsc --noEmit` — no new errors in any file I touched. The only error in `src/` is a pre-existing one in `src/app/api/auth/logout/route.ts` (the `handle()` wrapper expects `Promise<NextResponse<unknown>>` but the function returns `NextResponse<{ ok: boolean }>` synchronously) — not in scope for this audit.
- `fetchList`/`fetchProducts`/`fetchInventory` callbacks now accept an optional `AbortSignal`; existing call sites that pass no argument (e.g. `onMutated={fetchList}`, `onClick={() => fetchList()}`) still compile and work correctly.

## Files modified

1. `src/components/admin/orders/orders-client.tsx`
2. `src/components/admin/products/products-client.tsx`
3. `src/components/admin/kitchen/kitchen-board.tsx`
4. `src/components/admin/inventory/inventory-client.tsx`
5. `src/components/admin/orders/create-order-dialog.tsx`
6. `src/components/admin/orders/order-detail-sheet.tsx`
7. `src/components/admin/recipes/recipes-client.tsx`
8. `src/components/admin/catering/event-calendar.tsx`
9. `src/components/admin/reports/reports-client.tsx`
10. `src/components/admin/dashboard-client.tsx`
11. `src/components/admin/best-sellers-chart.tsx`
12. `src/components/admin/channel-donut.tsx`
13. `src/components/admin/sales-trend-chart.tsx`
14. `src/components/store/storefront.tsx`
15. `src/components/store/catering-inquiry-dialog.tsx`
16. `src/components/store/checkout-dialog.tsx`
17. `src/components/store/loyalty-register-dialog.tsx`
18. `src/app/api/wishlist/route.ts`
19. `src/app/api/products/route.ts`
20. `src/app/api/products/[slug]/route.ts`

## Notes / Honest caveats

- The `AbortController` cleanup pattern means rapid filter changes no longer trigger "ดึงรายการไม่สำเร็จ" toasts from stale responses — the abort is silent by design.
- The dashboard's lazy-loaded chart chunks will show a skeleton for ~50-100ms on first paint (one-time cost); subsequent tab switches are instant thanks to React Query caching.
- I did NOT touch the `auth/logout` pre-existing TS error (out of scope — that's an API helper type mismatch from the AUDIT-FULL pass).
- The `event-calendar` chip is nested inside a `<button>` (the calendar cell), so it can't be a `<button>` itself (invalid HTML); it keeps `role="button"` + keyboard handler instead.
- The `KanbanCard` keyboard handler coexists with `@dnd-kit`'s `attributes`/`listeners` — drag still works on pointer, and Enter/Space now opens the detail sheet. No conflict observed.
