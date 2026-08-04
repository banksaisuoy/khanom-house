# Monitoring Checklist — Khanom House

## Daily Checks (ร้านเปิดทุกวัน)
- [ ] `/api/ready` ตอบ 200
- [ ] หน้าร้าน (`/`) โหลดได้
- [ ] หน้า admin (`/admin`) login ได้
- [ ] POS page (`/admin/pos`) เปิดได้
- [ ] ไม่มี 500 error ใน log ของวันนี้
- [ ] Backup สำเร็จ (เช็ค `backups/` folder)

## Weekly Checks
- [ ] ทดสอบ restore จาก backup
- [ ] ตรวจสอบ disk space (`df -h`)
- [ ] ลบ backup เก่ากว่า 30 วัน
- [ ] ตรวจสอบ Audit Log หากิจกรรมผิดปกติ
- [ ] ตรวจสอบสต็อกติดลบ: `sqlite3 db/custom.db "SELECT * FROM Inventory WHERE quantity < 0;"`

## Alert Thresholds (แนะนำ)
| Metric | Warning | Critical |
|--------|---------|----------|
| `/api/ready` response time | > 2s | > 5s |
| 500 error rate | > 1/min | > 5/min |
| Failed checkouts | > 3/hour | > 10/hour |
| Failed POS bills | > 2/hour | > 5/hour |
| Disk usage | > 80% | > 95% |
| DB file size | > 500MB | > 2GB |
| Backup age | > 24 hours | > 48 hours |
| Login failures | > 10/min | > 50/min |

## Common Error Patterns
| Error | สาเหตุ | การแก้ไข |
|-------|--------|---------|
| `PrismaClientKnownRequestError` | DB constraint violation | ตรวจสอบข้อมูล input |
| `Foreign key constraint` | ลบ record ที่มี FK | ลูกก่อนแม่ |
| `Unique constraint` | ข้อมูลซ้ำ | ตรวจสอบ duplicate |
| `SESSION_SECRET not set` | ไม่ได้ตั้ง env | เพิ่มใน `.env` |
| `SQLite database is locked` | concurrent writes | ลด parallelism, migrate PostgreSQL |
