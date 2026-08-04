# Observability Guide — Khanom House

## Health Check Endpoints

### Liveness: `GET /api/health`
ใช้ตรวจสอบว่า process ยังทำงานอยู่ (ไม่ตรวจสอบ DB)
```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"2024-01-01T00:00:00Z","env":"production","version":"0.2.0"}
```

### Readiness: `GET /api/ready`
ใช้ตรวจสอบว่าระบบพร้อมให้บริการ (ตรวจสอบ DB + SESSION_SECRET)
```bash
curl http://localhost:3000/api/ready
# {"status":"ready","checks":{"database":"ok","sessionSecret":"ok"},"timestamp":"..."}
```

### การใช้งานใน Production
- **Load Balancer / Reverse Proxy:** ใช้ `/api/health` สำหรับ liveness probe (ทุก 10 วินาที)
- **Kubernetes:** livenessProbe → `/api/health`, readinessProbe → `/api/ready`
- **Uptime Monitor (Uptime Kuma):** monitor `/api/ready` ทุก 1 นาที

## Logs ที่ควรเฝ้าระวัง

### Server Logs (`dev.log` / `server.log`)
| Pattern | ความหมาย | การจัดการ |
|---------|---------|----------|
| `prisma:error` | Database error | ตรวจสอบ DB connection, disk space |
| `[api:error]` | Unhandled API error | ตรวจสอบ stack trace |
| `[logAudit] failed` | Audit log write failed | ตรวจสอบ DB, อาจมี column overflow |
| `[security] SESSION_SECRET not set` | ไม่มี secret (dev only) | ตั้งค่า SESSION_SECRET ใน production |
| `[OTP]` | OTP code (dev only) | ไม่ควรปรากฏใน production log |

### การตรวจจับปัญหา
| ปัญหา | วิธีตรวจจับ | การแก้ไข |
|-------|-----------|---------|
| Checkout failure | นับ 500 errors จาก `/api/orders` | ตรวจสอบสต็อก, DB, Prisma |
| POS failure | นับ 500 errors จาก `/api/admin/pos/checkout` | ตรวจสอบ shift, inventory |
| DB issue | `/api/ready` ส่ง `database: fail` | Restart DB, restore backup |
| 500 rate spike | นับ 500 responses ต่อนาที | ตรวจสอบ log, restart server |

## External Tools (แนะนำสำหรับ Production)

### Error Tracking: Sentry
```bash
bun add @sentry/nextjs
```
- ตั้งค่าใน `next.config.ts` + `sentry.client.config.ts`
- จับ unhandled errors อัตโนมัติ

### Uptime Monitoring: Uptime Kuma
- monitor `/api/ready` ทุก 1 นาที
- alert หากไม่ตอบภายใน 10 วินาที

### Log Aggregation: Grafana Loki + Promtail
- ส่ง `dev.log` ไปยัง Loki
- สร้าง dashboard ดู error rate, checkout success rate

### APM: OpenTelemetry (future)
- Trace checkout flow end-to-end
- วัด DB query duration
