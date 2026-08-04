# FILL-A — Missing Admin Modules (Suppliers/POs, Expenses, Branches, Staff Scheduling)

## Task scope

Added 4 admin modules + 13 API routes + 8 client components to the Khanom House Thai Dessert ERP. All modules use the existing luxury-Thai Gold/Cream/Dark-Green theme, `@tanstack/react-query` for data fetching, `handle()` + `ok/created/etc` from `@/lib/api-response`, `requirePermission` from `@/lib/auth`, `validate()`/Zod from `@/lib/validation`, `nextSeq()` from `@/lib/sequence`, `sonner` toasts, and the shadcn/ui component set.

## Files created (25)

### Module 1 — Suppliers & Purchase Orders (`/admin/suppliers`)
- `src/app/admin/suppliers/page.tsx` (server: pre-fetches suppliers + PO stats + branches)
- `src/components/admin/suppliers/suppliers-client.tsx` (tabs: ซัพพลายเออร์ | ใบสั่งซื้อ, stats, filter, table, AlertDialog for soft-delete)
- `src/components/admin/suppliers/supplier-form-dialog.tsx` (create/edit supplier with star rating)
- `src/components/admin/suppliers/po-form-dialog.tsx` (PO builder: pick supplier + branch + items (manual or from-product), auto-totals)
- `src/components/admin/suppliers/po-detail-sheet.tsx` (Sheet: PO meta, supplier info, items table, receive-goods inline editor, status flow buttons: DRAFT→SENT, SENT/PARTIAL→RECEIVED, CANCEL)
- `src/app/api/admin/suppliers/route.ts` (GET list, POST create — auto-generates code from name)
- `src/app/api/admin/suppliers/[id]/route.ts` (PATCH update, DELETE soft via isActive=false)
- `src/app/api/admin/purchase-orders/route.ts` (GET list, POST create with items in `$transaction`, uses `nextSeq('po', 'PO', 6)` → PO000001)
- `src/app/api/admin/purchase-orders/[id]/route.ts` (GET detail with items+supplier+branch+user, PATCH status with state-machine guard `PO_STATUS_FLOW`)
- `src/app/api/admin/purchase-orders/[id]/receive/route.ts` (POST `{items:[{id,receivedQty}]}` → increments PO item receivedQty (caps at remaining), increases Inventory stock IN, creates StockMovement with `refType:'PO'`, recomputes PO status PARTIAL/RECEIVED, sets `receivedAt` when fully received, requires `inventory.adjust`)

### Module 2 — Expenses (`/admin/expenses`)
- `src/app/admin/expenses/page.tsx` (server: pre-fetches branches)
- `src/components/admin/expenses/expenses-client.tsx` (KPI strip: รวมเดือนนี้/รายการเดือนนี้/หมวด/เฉลี่ย; recharts donut by category; recharts bar trend 14 days; filter bar: date range + category + branch + search; full table)
- `src/components/admin/expenses/expense-form-dialog.tsx` (date, category select, description, amount, branch, receipt URL placeholder)
- `src/app/api/admin/expenses/route.ts` (GET with filters + `byCategory` groupBy aggregation, POST create — requires `accounting.create`)
- `src/app/api/admin/expenses/[id]/route.ts` (PATCH update, DELETE hard delete — requires `accounting.update`/`accounting.delete`)

### Module 3 — Branches (`/admin/branches`)
- `src/app/admin/branches/page.tsx` (server: pre-fetches branches + total user count)
- `src/components/admin/branches/branches-client.tsx` (Card grid: name, code, address, phone, isMain/isActive badges, user count, inventory count; edit + soft-delete; stats: สาขาทั้งหมด/สาขาหลัก/สาขาที่ใช้งาน/พนักงานรวม)
- `src/components/admin/branches/branch-form-dialog.tsx` (name, code, address, phone, isMain toggle (auto-demotes others in tx), isActive toggle)
- `src/app/api/admin/branches/route.ts` (GET list with counts — any admin role; POST create — **SUPER_ADMIN only** via `requireAuth` + role check, demotes other mains in tx)
- `src/app/api/admin/branches/[id]/route.ts` (PATCH update — SUPER_ADMIN; DELETE soft — SUPER_ADMIN, refuses to delete main branch)

### Module 4 — Staff Scheduling (`/admin/staff`)
- `src/app/admin/staff/page.tsx` (server: pre-fetches users + branches)
- `src/components/admin/staff/staff-client.tsx` (Two views: รายวัน (cards grid w/ avatar, role badge, shift times, check-in/out buttons, audit times) | รายสัปดาห์ (grid: rows=users × cols=Mon-Sun); date picker + week nav prev/next/today; stats: พนักงานวันนี้/กะเช้า/กะบ่าย/ขาดงาน)
- `src/components/admin/staff/schedule-form-dialog.tsx` (user select, date, time pickers for shiftStart/shiftEnd, role select, branch select, notes; validates end > start)
- `src/app/api/admin/staff/schedule/route.ts` (GET list by date range — uses `dashboard.read` for view; POST create — requires `users.create`)
- `src/app/api/admin/staff/schedule/[id]/route.ts` (PATCH update, DELETE — refuses to delete already-CHECKED_OUT shifts for audit trail)
- `src/app/api/admin/staff/schedule/[id]/checkin/route.ts` (POST → CHECKED_IN + checkInAt=now; refuses if already CHECKED_IN/OUT)
- `src/app/api/admin/staff/schedule/[id]/checkout/route.ts` (POST → CHECKED_OUT + checkOutAt=now; requires CHECKED_IN status)

## Supporting change

`src/lib/auth.ts` — added `accounting.create`, `accounting.update`, `accounting.delete` permissions to `BRANCH_MANAGER` and `ACCOUNTANT` roles (only `accounting.read` existed before). SUPER_ADMIN inherits all via `*` wildcard.

## Permission matrix

| Module | Read | Create/Update/Delete |
|---|---|---|
| Suppliers | `products.read` | `products.create` / `products.update` / `products.delete` |
| Purchase Orders (create/edit) | `products.read` | `products.create` / `products.update` |
| PO receive-goods | — | `inventory.adjust` (creates stock movements) |
| Expenses | `accounting.read` | `accounting.create` / `accounting.update` / `accounting.delete` |
| Branches (view) | `dashboard.read` | — |
| Branches (create/edit/delete) | — | SUPER_ADMIN role only (explicit `requireAuth` + role check) |
| Staff schedule (view) | `dashboard.read` | — |
| Staff schedule (create/edit/check-in/out/delete) | — | `users.create` |

## Smoke tests performed (all pass)

1. GET `/api/admin/suppliers` with super-admin cookie → 200, `{"suppliers":[]}`
2. POST `/api/admin/suppliers` → 201 with auto-generated code `XXXX-001`
3. POST `/api/admin/purchase-orders` with items → 201, `poNo: "PO000001"`
4. GET `/api/admin/purchase-orders/[id]` → 200, total computed correctly
5. PATCH status DRAFT→SENT → 200 ok
6. POST `/api/admin/purchase-orders/[id]/receive` {items:[{id, receivedQty:5}]} → 200, `newStatus:"PARTIAL"`, `receivedTotal: 1250`
7. POST `/api/admin/expenses` → 201; GET with filters returns byCategory aggregation
8. POST `/api/admin/branches` as SUPER_ADMIN → 201; as BRANCH_MANAGER → 403 "เฉพาะ Super Admin เท่านั้น"
9. POST `/api/admin/staff/schedule` with valid ISO datetimes → 201
10. POST `/api/admin/staff/schedule/[id]/checkin` → 200, status CHECKED_IN, checkInAt set
11. POST `/api/admin/staff/schedule/[id]/checkout` → 200, status CHECKED_OUT
12. POST `/api/admin/expenses` as KITCHEN role → 403 "ไม่มีสิทธิ์เข้าถึงส่วนนี้"
13. GET `/admin/suppliers`, `/admin/expenses`, `/admin/branches`, `/admin/staff` HTML pages → all 200 with expected Thai title text rendered

## Verification

- `bun run lint` → **0 errors, 0 warnings** (exit 0)
- `bunx tsc --noEmit` → 0 errors in any new file (only pre-existing errors in `examples/`, `prisma/seed.ts`, `skills/`, `src/app/admin/blog/page.tsx`, `src/app/tracking/page.tsx` — all unrelated)
- `bunx prisma generate` → regenerated client (Supplier/PurchaseOrder/Expense/StaffSchedule models were already in `schema.prisma`)
- Dev server cleaned of corrupted turbopack cache and restarted cleanly

## Key design decisions

1. **PO receive-goods** uses `inventory.adjust` permission (not `products.update`) because it actually mutates Inventory stock and creates StockMovement records — same permission as the existing `/api/admin/inventory/adjust` endpoint. This means BRANCH_MANAGER (has both `inventory.adjust` and `products.update`) and SUPER_ADMIN can receive goods; KITCHEN/CASHIER/etc cannot.

2. **PO status state-machine** — explicit `PO_STATUS_FLOW` map guards transitions. DRAFT can only go to SENT or CANCELLED; SENT can go to PARTIAL/RECEIVED/CANCELLED; PARTIAL can go to RECEIVED/CANCELLED; RECEIVED and CANCELLED are terminal. This prevents invalid jumps (e.g. directly from DRAFT to RECEIVED).

3. **Branch create/edit/delete** is **role-gated** (not permission-gated) — uses `requireAuth()` then checks `user.role === 'SUPER_ADMIN'`. This is stricter than `requirePermission('users.create')` because BRANCH_MANAGER has `users.create` and we explicitly want to exclude them per the task spec.

4. **Expense delete is hard delete** (not soft delete). Expenses are correctable accounting entries — keeping a soft-deleted row would complicate `groupBy` aggregations. Audit log preserves the before-image for traceability.

5. **Staff schedule delete** refuses already-CHECKED_OUT shifts to preserve historical attendance records. SCHEDULED/CHECKED_IN/ABSENT can be deleted (e.g. to fix scheduling mistakes).

6. **All API routes use the `handle()` wrapper** which centralizes AuthError → 401/403, ConflictError → 409, NotFoundError → 404, ValidationError → 400 with Zod issues, and Prisma unique/FK constraint errors → 409/400. No `e.message` leaks to client.

7. **Sidebar already had all 4 routes** wired in `src/components/admin/app-sidebar.tsx` (lines 83, 109, 123, 124) — no change needed there.

8. **Supplier code auto-generation** uses `name.slice(0,4).toUpperCase()` + count-based suffix. Falls back gracefully if user leaves code blank.

9. **PO item builder** supports both "manual name" mode (for ad-hoc raw material purchases) and "pick from product" mode (auto-fills unit + suggests costPrice). Both produce the same `PurchaseOrderItem` shape; only the latter sets `productId` so receive-goods can update Inventory.

10. **Week view table** uses sticky first column for user names + horizontal scroll on small screens. Today's column is highlighted with `bg-[var(--gold)]/10`.

11. **Client components use `useQuery` with `initialData`** where the server pre-fetches (suppliers, branches) so the first paint is instant and TanStack Query handles background refresh. For filtered/scheduled data (expenses, POs, staff schedule), `initialData` is omitted and `cache: 'no-store'` ensures fresh data.
