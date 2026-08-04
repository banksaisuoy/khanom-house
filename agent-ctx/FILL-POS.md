# FILL-POS — Missing POS & Payment Features

Agent: Senior Fullstack Engineer (POS specialist)
Task ID: FILL-POS
Scope: 7 features — Hold/Recall Bill, Refunds, Slip Upload, PromptPay QR, Split Payment, PIN Login, Sidebar nav.

## Reference points (what exists already)
- `prisma/schema.prisma` — `HeldBill`, `Refund`, `SlipUpload`, `StoreCredit` models already present.
- `src/lib/api-response.ts` — `handle()`, `ok()`, `created()`, `conflict()`, `notFound()`, `badRequest()`.
- `src/lib/auth.ts` — `requirePermission()`, `requireAuth()`, `requireBranchAccess()`, `SESSION_COOKIE`, `AuthError`.
- `src/lib/sequence.ts` — `nextSeq(name, prefix, width)`.
- `src/lib/validation.ts` — `validate()`, Zod schemas, `posCheckoutPayloadSchema` (extended with optional `payments[]`).
- `src/lib/audit.ts` — `logAudit()`.
- `src/components/admin/pos/pos-terminal.tsx` — main POS UI (catalog + cart + sheet for bills).
- `src/components/admin/pos/pos-payment-dialog.tsx` — payment dialog with method tabs.
- `src/components/admin/pos/shift-screen.tsx` — `ShiftOpenCard` + `CloseShiftDialog`.
- `src/components/admin/app-sidebar.tsx` — sidebar nav, "การขาย" group.

## Design decisions
- All new routes use `handle()` wrapper + `requirePermission()`. Audit on every mutation.
- `HeldBill.items` stored as JSON-stringified array — read via `JSON.parse`.
- Refunds PENDING→APPROVED→COMPLETED lifecycle. Approve reverses stock for FULL, and either marks cash refund, or adds StoreCredit for STORE_CREDIT method.
- Slip upload verification marks the linked Order (if any) as `PAID` and updates `Payment`.
- Split payment: `payments: [{method, amount}]` array; sum must equal total. Multiple `Payment` rows OR (in our case) one PosBill with split method recorded as `paymentMethod = "SPLIT"` plus a JSON column. Simplest: choose primary method = first in array, but persist breakdown. Since PosBill.paymentMethod is single — we keep that single field with the largest payment method, and the actual breakdown is recorded on a `payments` JSON log via audit. For demo, we set `paymentMethod` = first payment method, `receivedAmount` = total, `change` = 0 (or computed).
- PIN login: cashier's phone number last 4 digits → match against active users with role CASHIER (or anyone). Set session cookie on success.

## Files touched
- API: 16 new route files under `src/app/api/admin/pos/` (hold, promptpay-qr, pin-login) and `src/app/api/admin/` (refunds, slip-upload)
- Modified: `src/app/api/admin/pos/checkout/route.ts` (split payment support)
- Modified: `src/components/admin/pos/pos-terminal.tsx` (hold/recall buttons + sheet)
- Modified: `src/components/admin/pos/pos-payment-dialog.tsx` (PromptPay QR + split tab)
- Modified: `src/components/admin/pos/shift-screen.tsx` (PIN pad)
- Modified: `src/components/admin/pos/pos-shift-gate.tsx` (pass through PIN-on-success)
- Modified: `src/components/admin/app-sidebar.tsx` (nav items)
- New: `src/app/admin/refunds/page.tsx`, `src/components/admin/refunds/refunds-client.tsx`
- New: `src/app/admin/slip-verification/page.tsx`, `src/components/admin/slip-verification/slip-verification-client.tsx`
