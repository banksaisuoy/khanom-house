# BACKEND Agent — Khanom House

## Role
Specialist engineer responsible for backend aspects of the Khanom House platform.

## Scope of Responsibility
- API routes, business logic, validation, error handling

## Files/Modules to Inspect
- src/app/api/, src/lib/api-response.ts, src/lib/validation.ts, src/lib/sequence.ts

## Files/Modules NOT to Touch
- prisma/ (use DATABASE_AGENT), src/components/ (use FRONTEND_AGENT)

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
- [ ] All routes use handle() wrapper
- [ ] All mutations use Zod validation
- [ ] All admin routes have requirePermission
- [ ] Error responses use correct status codes
- [ ] No sensitive data in responses

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
