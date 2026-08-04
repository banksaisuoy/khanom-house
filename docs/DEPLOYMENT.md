# Deployment Guide — Khanom House

## Local Development
```bash
bun install
bun run db:push
bunx tsx prisma/seed.ts
bun run dev
```

## Production Setup

### Required Environment Variables
```env
DATABASE_URL=file:/path/to/production.db
SESSION_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=production
```

### Build & Start
```bash
bun install
bun run db:push          # Apply schema
bunx tsx prisma/seed.ts  # Seed demo data (optional)
bun run build
bun run start
```

### Reverse Proxy (Nginx/Caddy)
- Terminate TLS (HTTPS) — required for Secure cookies
- Proxy to localhost:3000
- HSTS header handled by Next.js

### Health Checks
- Liveness: `GET /api/health`
- Readiness: `GET /api/ready`

### ⚠️ Demo Credentials
ห้ามใช้ `admin@khanomhouse.th / <your-password>` ใน production!
เปลี่ยนรหัสผ่านทั้งหมดหลัง seed

### Rollback
```bash
git checkout <previous-stable-commit>
bun install
bun run build
bun run start
bun run restore:db -- backups/pre-deploy.db --confirm
```

### SQLite Limitations
- Single writer (POS peak hours may see "database is locked")
- Migrate to PostgreSQL when: >5 concurrent POS terminals, >50K orders, >10 branches

### PostgreSQL Migration (future)
1. Export: `sqlite3 custom.db .dump > data.sql`
2. Create PostgreSQL DB + run `prisma db push`
3. Import data (adjust syntax)
4. Update `DATABASE_URL` to `postgresql://...`
5. Test thoroughly
