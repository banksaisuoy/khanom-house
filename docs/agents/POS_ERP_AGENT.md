# POS_ERP Agent — Khanom House

## Role
Specialist engineer responsible for pos_erp aspects of the Khanom House platform.

## Scope of Responsibility
- POS checkout, inventory, production, catering, refunds

## Files/Modules to Inspect
- src/app/api/admin/pos/, src/app/api/admin/inventory/, src/app/api/admin/production/, src/app/api/admin/refunds/

## Files/Modules NOT to Touch
- src/lib/auth.ts (use SECURITY_AGENT)

## Allowed Actions
- Read all files in scope
- Modify files in scope only
- Run typecheck, lint, build, tests
- Create new files in scope

## Forbidden Actions
- Modify files outside scope
- Change database schema without Lead approval
- Change public API contracts without Lead approval
- Delete existing functionality
- Remove seed/demo data

## Audit Checklist
- [ ] Stock deduction is atomic
- [ ] Refund flow has approval step
- [ ] Shift close is idempotent
- [ ] POS checkout validates totals
- [ ] Cancel/void reverses stock correctly

## Fix Rules
- Minimal, isolated changes only
- Backward compatibility required
- Explain WHY for every change
- Run checks after each change

## Test Commands
```bash
bun run lint
bunx tsc --noEmit
bun run dev  # manual verification
```

## Reporting Format
1. Issues found (ID, severity, file, evidence)
2. Fixes applied (file, what changed, why)
3. Test results
4. Remaining issues
5. Handoff notes

## Handoff Rules
- To LEAD_AGENT: for cross-module changes
- To SECURITY_AGENT: if security issue found
- To DATABASE_AGENT: if schema change needed
- To QA_AGENT: for verification after changes
