# 🍯 Khanom House — ระบบขายขนมไทยออนไลน์ + POS + ERP

> แพลตฟอร์ม E-commerce + POS + ERP แบบ Enterprise สำหรับร้านขนมหวานไทย รับจัดเบรค งานมงคล งานบุญ ครบวงจร

[![Deploy on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://my-project-gray-eta.vercel.app)
[![Database](https://img.shields.io/badge/Database-Neon%20PostgreSQL-blue?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Tests](https://img.shields.io/badge/Tests-78%20passed-brightgreen?style=for-the-badge)](#-การทดสอบ)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](#license)

## 🌐 ลิงก์เว็บไซต์

- **หน้าร้าน:** https://my-project-gray-eta.vercel.app
- **แอดมิน:** https://my-project-gray-eta.vercel.app/login
- **API Health:** https://my-project-gray-eta.vercel.app/api/health

---

## 📊 สถิติโปรเจกต์

| รายการ | จำนวน |
|--------|--------|
| หน้าหลังบ้าน (Admin) | 32 หน้า |
| API Routes | 122 routes |
| Prisma Models | 44 models |
| Database Indexes | 103 indexes |
| หน้าหน้าร้าน (Public) | 11 หน้า |
| React Components | 163 ไฟล์ |
| Automated Tests | 78 tests |
| TypeScript Errors | 0 |
| Lint Errors | 0 |

---

## 🛠️ Tech Stack

| Layer | เทคโนโลยี |
|-------|----------|
| **Frontend** | Next.js 16 + React 19 + TypeScript 5 |
| **UI** | Tailwind CSS 4 + shadcn/ui + Lucide Icons |
| **Database** | Prisma ORM + PostgreSQL (Neon) |
| **Auth** | HMAC-signed session + bcrypt + HttpOnly cookie + RBAC 7 roles |
| **State** | Zustand + TanStack Query |
| **Charts** | Recharts |
| **AI** | z-ai-web-dev-sdk (LLM + demand forecasting) |
| **Testing** | Vitest (78 tests) + Playwright (E2E) |
| **CI/CD** | GitHub Actions |
| **Theme** | Gold + Cream + Dark Green (Luxury Thai) + Dark Mode |
| **PWA** | manifest + icons |

---

## 📁 โครงสร้างโปรเจกต์

```
khanom-house/
├── src/
│   ├── app/
│   │   ├── admin/              # 32 หน้าหลังบ้าน
│   │   │   ├── dashboard/      # แดชบอร์ดผู้บริหาร
│   │   │   ├── pos/            # POS หน้าร้าน
│   │   │   ├── orders/         # จัดการคำสั่งซื้อ
│   │   │   ├── products/       # จัดการสินค้า
│   │   │   ├── inventory/      # คลังสินค้า
│   │   │   ├── kitchen/        # ครัว/คิวผลิต
│   │   │   ├── catering/       # จัดงาน/เบรค
│   │   │   ├── customers/      # ลูกค้า & สมาชิก
│   │   │   ├── refunds/        # คืนสินค้า/คืนเงิน
│   │   │   ├── reports/        # รายงาน/BI
│   │   │   ├── accounting/     # บัญชี
│   │   │   ├── ai-assistant/   # ผู้ช่วย AI
│   │   │   └── ...             # และอื่นๆ
│   │   ├── api/                # 122 API routes
│   │   │   ├── admin/          # หลังบ้าน (ต้อง login)
│   │   │   ├── auth/           # login/logout/OTP
│   │   │   ├── products/       # สินค้าสาธารณะ
│   │   │   ├── orders/         # สั่งซื้อสาธารณะ
│   │   │   └── health/         # health check
│   │   ├── products/[slug]/    # หน้ารายละเอียดสินค้า
│   │   ├── blog/               # บล็อก
│   │   ├── tracking/           # ติดตามออเดอร์
│   │   ├── faq/                # คำถามที่พบบ่อย
│   │   └── ...                 # หน้าข้อมูลร้าน
│   ├── components/
│   │   ├── admin/              # 74 components
│   │   ├── store/              # 14 components
│   │   └── ui/                 # shadcn/ui
│   └── lib/
│       ├── auth.ts             # RBAC + HMAC session
│       ├── validation.ts       # Zod schemas
│       ├── api-response.ts     # unified responses
│       ├── session-signing.ts  # HMAC token signing
│       ├── rate-limit.ts       # IP rate limiting
│       ├── sequence.ts         # atomic ID generation
│       └── print.ts            # safe print (XSS-safe)
├── prisma/
│   ├── schema.prisma           # 44 models + 103 indexes
│   └── seed.ts                 # ข้อมูลตัวอย่าง
├── tests/
│   ├── setup.ts                # Vitest config
│   ├── int-*.test.ts           # Integration tests
│   ├── audit-*.test.ts         # Security verification tests
│   └── e2e/                    # Playwright E2E tests
├── docs/
│   ├── DEPLOYMENT.md           # คู่มือ deploy
│   ├── OPERATIONS_RUNBOOK.md   # คู่มือใช้งานประจำวัน
│   ├── BACKUP_RESTORE.md       # คู่มือสำรองข้อมูล
│   ├── DISASTER_RECOVERY.md    # คู่มือกู้คืนระบบ
│   ├── OBSERVABILITY.md        # คู่มือ monitoring
│   ├── MONITORING_CHECKLIST.md # รายการตรวจสอบ
│   ├── ADMIN_USER_GUIDE_TH.md  # คู่มือแอดมิน (ภาษาไทย)
│   ├── UAT_CHECKLIST.md        # รายการทดสอบ
│   ├── RELEASE_NOTES.md        # บันทึกการเปิดตัว
│   ├── PRODUCTION_RISK_REGISTER.md # ทะเบียนความเสี่ยง
│   └── agents/                 # คู่มือสำหรับ AI agents
├── scripts/
│   ├── backup-db.sh            # สคริปต์สำรองข้อมูล
│   └── restore-db.sh           # สคริปต์กู้คืนข้อมูล
├── .github/workflows/ci.yml    # GitHub Actions CI
├── .env.example                # ตัวอย่าง environment variables
├── playwright.config.ts        # Playwright config
├── vitest.config.ts            # Vitest config
└── package.json
```

---

## 🚀 การติดตั้ง (Local Development)

### สิ่งที่ต้องมี
- [Bun](https://bun.sh) (แนะนำ) หรือ Node.js 18+
- PostgreSQL database (แนะนำ [Neon](https://neon.tech) ฟรี)

### ขั้นตอน

```bash
# 1. Clone repo
git clone https://github.com/<your-username>/khanom-house.git
cd khanom-house

# 2. ติดตั้ง dependencies
bun install

# 3. สร้าง .env จาก .env.example
cp .env.example .env
# แก้ไข .env:
#   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
#   SESSION_SECRET=<generate with: openssl rand -hex 32>

# 4. สร้างตารางฐานข้อมูล
bun run db:push

# 5. ใส่ข้อมูลตัวอย่าง (ตั้งรหัสผ่านผ่าน env)
SEED_PASSWORD=your_password bunx tsx prisma/seed.ts

# 6. เริ่มเซิร์ฟเวอร์
bun run dev
```

เปิด http://localhost:3000 ในเบราว์เซอร์

---

## 🔐 การเข้าสู่ระบบ

> ⚠️ **คำเตือน: เปลี่ยนรหัสผ่านทั้งหมดก่อนใช้งานจริง!**

### บัญชีทดลอง (ตั้งรหัสผ่านผ่าน `SEED_PASSWORD` env var)

| บทบาท | อีเมล | สิทธิ์ |
|-------|-------|-------|
| Super Admin | admin@khanomhouse.th | ทุกระบบ |
| Branch Manager | manager@khanomhouse.th | จัดการสาขา |
| Kitchen | kitchen@khanomhouse.th | ครัว + ผลิต |
| Cashier | cashier@khanomhouse.th | POS + ขาย |
| Rider | rider@khanomhouse.th | จัดส่ง |
| Accountant | account@khanomhouse.th | การเงิน |

### วิธีเข้า
1. เปิดหน้าร้านที่ `/`
2. เลื่อนลงล่างสุด → คลิก "🛡 เข้าระบบแอดมิน"
3. กรอกอีเมล + รหัสผ่าน → เข้าสู่ระบบ

---

## 🎛️ ระบบหลัก (32 โมดูล)

### 📊 ภาพรวม
- **แดชบอร์ด** — KPI, กราฟยอดขาย, Heatmap, Alerts, Quick Actions
- **การแจ้งเตือน** — ออเดอร์ใหม่, สต็อกต่ำ, ใกล้หมดอายุ

### 🏪 การขาย
- **POS หน้าร้าน** — Touch UI, พักบิล, ยกเลิก, ปิดกะ, PIN login
- **คำสั่งซื้อ** — Kanban + Table, 9 สถานะ
- **จัดส่ง** — มอบหมาย rider, Google Maps
- **พื้นที่จัดส่ง** — โซน + ค่าจัดส่ง
- **คืนสินค้า/คืนเงิน** — อนุมัติ → คืนสต็อก
- **ตรวจสลิป** — อัปโหลด + ตรวจสอบ

### 📦 สินค้า
- **สินค้า & เมนู** — CRUD, สารก่อภูมิแพ้, เจ/ฮาลาล
- **สูตรผลิต/BOM** — ต้นทุนต่อหน่วย, scaling
- **คลังสินค้า** — ปรับสต็อก atomic
- **โอนสต็อก** — ระหว่างสาขา
- **ของเสีย** — 5 ประเภท, กราฟ
- **ซัพพลายเออร์ & PO** — ใบสั่งซื้อ, รับของ

### 🍳 ครัว
- **คิวผลิต** — Kitchen Display, จับเวลา
- **คุณภาพ/QC** — Checklist, PASS/FAIL

### 👥 ลูกค้า
- **ลูกค้า & สมาชิก** — 360° profile, Tier อัตโนมัติ, PDPA
- **บัตรของขวัญ** — สร้าง, ใช้, ตรวจสอบ
- **รีวิวสินค้า** — ดู, ตอบกลับ
- **โปรโมชั่น** — %, fixed, BOGO, Flash Sale

### 💰 การเงิน
- **รายงาน/BI** — 4 tabs, Export CSV
- **บัญชี** — ปิดยอด, P&L, VAT
- **ใบกำกับภาษี** — เต็มรูปแบบ, พิมพ์
- **ค่าใช้จ่าย** — 6 หมวด

### 📝 เนื้อหา & AI
- **บทความ/Blog** — CMS
- **FAQ** — คำถามที่พบบ่อย
- **ผู้ช่วย AI** — แชทถามยอดขาย/สต็อก

### ⚙️ ระบบ
- **ผู้ใช้ & สิทธิ์** — RBAC 7 roles
- **พนักงาน/ตารางกะ** — ลงเวลา
- **สาขา** — Multi-branch
- **บันทึก Audit** — ใครแก้อะไรเมื่อไหร่
- **ตั้งค่า** — ข้อมูลร้าน, ค่าจัดส่ง

---

## 🔒 ความปลอดภัย

| ระบบ | สถานะ |
|------|-------|
| Authentication | ✅ HMAC-signed session + bcrypt + HttpOnly cookie |
| RBAC | ✅ 7 roles + permission matrix |
| Rate Limiting | ✅ 20 req/min public endpoints |
| Zod Validation | ✅ ทุก mutating API |
| SQL Injection | ✅ Prisma parameterized queries |
| XSS | ✅ escapeHtml + CSP header |
| CSRF | ✅ SameSite=Strict cookies |
| Security Headers | ✅ CSP, HSTS, X-Frame, X-Content-Type, Referrer, Permissions |
| Audit Logging | ✅ บันทึกทุกการเปลี่ยนแปลง |
| PDPA | ✅ ส่งออก/ลบข้อมูลลูกค้า |
| Session Security | ✅ HMAC signed (tamper-proof) |

---

## 🧪 การทดสอบ

### รันเช็คทั้งหมด

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# Automated tests
bun run test

# Build
bun run build

# E2E tests (ต้องรัน dev server ก่อน)
bun run test:e2e
```

### Test Coverage

| กลุ่ม | จำนวน | ครอบคลุม |
|-------|--------|---------|
| Static (source inspection) | 25 | Audit fix verification |
| OTP + Customer session | 12 | OTP send/verify, HMAC cookie |
| RBAC | 7 | CASHIER vs MANAGER permissions |
| Checkout | 6 | Atomic stock, over-sell, invalid input |
| POS checkout | 6 | Bill creation, shift totals, payment methods |
| Cancel bill | 4 | Branch-specific reversal, idempotency |
| Slip verification | 3 | Idempotent verification, audit log |
| Stock transfer | 3 | Missing inventory, valid transfer |
| Refund | 4 | Approval, idempotency, stock return |
| Session HMAC | 5 | Token signing, tamper rejection |
| Health/Readiness | 3 | Liveness, readiness, no secret leak |
| **Total** | **78** | **10 critical business flows** |

---

## 🚢 การ Deploy

### Vercel + Neon PostgreSQL (แนะนำ)

```bash
# 1. สร้าง Neon database ที่ https://neon.tech (ฟรี)
# 2. สร้าง Vercel project ที่ https://vercel.com/new
# 3. ตั้งค่า Environment Variables ใน Vercel:
#    DATABASE_URL=postgresql://... (จาก Neon)
#    SESSION_SECRET=<openssl rand -hex 32>
#    SEED_PASSWORD=<your-admin-password>
# 4. Deploy!
```

ดูรายละเอียดเพิ่มเติมที่ [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### VPS + SQLite (ร้านเดียว)

```bash
bun install
bun run db:push
SEED_PASSWORD=your_password bunx tsx prisma/seed.ts
bun run build
bun run start
```

---

## 📦 การสำรองข้อมูล

```bash
# สำรองข้อมูล
bun run backup:db

# กู้คืนข้อมูล (ต้องมี --confirm)
bun run restore:db -- backups/khanom_house_20240101_120000.db --confirm

# ตรวจสอบความถูกต้อง
bun run verify:db
```

ดูรายละเอียดที่ [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md)

---

## 🔄 CI/CD

GitHub Actions รันอัตโนมัติทุก pull request และ push ไป `main`:

1. **Typecheck** — ตรวจสอบ TypeScript
2. **Lint** — ESLint
3. **Test** — 78 integration tests
4. **Build** — Next.js production build

ดูการตั้งค่าที่ [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

---

## 📚 เอกสาร

| เอกสาร | รายละเอียด |
|--------|-----------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | คู่มือ deploy (local + production) |
| [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md) | คู่มือใช้งานประจำวัน |
| [docs/ADMIN_USER_GUIDE_TH.md](docs/ADMIN_USER_GUIDE_TH.md) | คู่มือแอดมิน (ภาษาไทย) |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | คู่มือสำรอง/กู้คืนข้อมูล |
| [docs/DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md) | คู่มือกู้คืนระบบ (11 สถานการณ์) |
| [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) | คู่มือ monitoring |
| [docs/MONITORING_CHECKLIST.md](docs/MONITORING_CHECKLIST.md) | รายการตรวจสอบ |
| [docs/UAT_CHECKLIST.md](docs/UAT_CHECKLIST.md) | รายการทดสอบรับมอบ |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | บันทึกการเปิดตัว |
| [docs/PRODUCTION_RISK_REGISTER.md](docs/PRODUCTION_RISK_REGISTER.md) | ทะเบียนความเสี่ยง |
| [docs/agents/](docs/agents/) | คู่มือสำหรับ AI agents (10 ไฟล์) |

---

## 🎨 Theme

- **สีหลัก:** ทอง (#C5A572) + ครีม (#FAF6F0) + เขียวเข้ม (#1B3A2F)
- **Dark Mode:** รองรับ
- **Responsive:** มือถือ / แท็บเล็ต / คอม
- **Font:** Noto Sans Thai

---

## ⚠️ ข้อจำกัด

| ข้อจำกัด | รายละเอียด |
|---------|-----------|
| SQLite → PostgreSQL | ใช้ PostgreSQL แล้ว (Neon) |
| ไม่มี SMS Gateway | OTP แสดงใน console (dev) — ต้องต่อ Twilio/Vonage |
| ไม่มี Payment Gateway | PromptPay QR เป็น placeholder — ต้องต่อ Omise/Stripe |
| ไม่มี LINE Notify | ต้องต่อ LINE Messaging API |
| Playwright E2E | สร้างไฟล์แล้ว แต่ยังไม่ได้รันใน CI |

---

## 📄 License

MIT License — ใช้ได้ฟรี ทั้งเพื่อการค้าและไม่ค้า

---

## 🤝 การมีส่วนร่วม

Pull requests ยินดีต้อนรับ! กรุณารัน `bun run typecheck && bun run lint && bun run test` ก่อนส่ง PR

---

© Khanom House — ขนมไทยโบราณ สูตรตำรับช่างหลวง
