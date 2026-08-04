# Production Risk Register — Khanom House

| # | Risk | Severity | Likelihood | Mitigation | Migration Trigger |
|---|------|----------|------------|------------|-------------------|
| 1 | SQLite single-writer bottleneck | High | Medium | Pilot with <5 POS | >5 concurrent POS or "database is locked" errors |
| 2 | No real payment gateway | High | Certain | Cash + slip upload only | Integrate Omise/Stripe/PromptPay API |
| 3 | No SMS provider for OTP | Medium | Certain | Dev: console.log | Integrate Twilio/Vonage/Thai SMS |
| 4 | No LINE Notify | Medium | Certain | Check notifications page | Integrate LINE Messaging API |
| 5 | Playwright E2E unverified | Low | Medium | 78 integration tests cover flows | Run E2E in CI with browser |
| 6 | Backup maturity | Medium | Low | Script exists, manual | Automate with cron + offsite |
| 7 | Monitoring maturity | Medium | Low | Health endpoints exist | Add Sentry + Uptime Kuma |
| 8 | Tax invoice compliance | Medium | Low | Format follows RD template | Legal review by accountant |
| 9 | ~100 routes without Zod | Medium | Low | Critical routes covered | Systematic validation pass |
| 10 | No 2FA for admin | Low | Low | Password + RBAC | Add TOTP for SUPER_ADMIN |
| 11 | Session cookie 7-day expiry | Low | Low | Acceptable for pilot | Shorten to 8h + refresh token |
| 12 | No audit log on all mutations | Low | Medium | Sensitive ops logged | Systematic audit pass |
