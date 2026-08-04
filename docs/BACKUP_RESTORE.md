# Backup & Restore Guide — Khanom House

## สรุป
ระบบใช้ SQLite เก็บข้อมูลในไฟล์ `db/custom.db` การสำรองข้อมูลทำได้โดย copy ไฟล์นี้

## การสำรองข้อมูล (Backup)

### สำรองด้วย script
```bash
bun run backup:db
```
- สร้างไฟล์ backup ที่ `backups/khanom_house_YYYYMMDD_HHMMSS.db`
- ตรวจสอบ integrity อัตโนมัติ
- เก็บ backup ล่าสุด 30 ไฟล์

### สำรองด้วยมือ
```bash
cp db/custom.db backups/manual_backup_$(date +%Y%m%d).db
```

### ความถี่แนะนำ
| ประเภท | ความถี่ |
|--------|--------|
| ร้านเล็ก (<100 ออเดอร์/วัน) | วันละครั้ง (ก่อนปิดร้าน) |
| ร้านกลาง (100-500/วัน) | ทุก 6 ชั่วโมง |
| ร้านใหญ่ (>500/วัน) | ทุกชั่วโมง + cron job |

### Cron job ตัวอย่าง
```cron
# Backup ทุกวันเที่ยงคืน
0 0 * * * cd /path/to/khanom-house && bun run backup:db >> logs/backup.log 2>&1
```

## การกู้คืนข้อมูล (Restore)

### คำเตือน
> **การ restore จะเขียนทับข้อมูลปัจจุบันทั้งหมด!**
> ระบบจะสำรองข้อมูลปัจจุบันก่อน restore อัตโนมัติ

### ขั้นตอน
```bash
# 1. ดูไฟล์ backup ที่มี
ls backups/

# 2. Restore (ต้องมี --confirm)
bun run restore:db -- backups/khanom_house_20240101_120000.db --confirm

# 3. ตรวจสอบ
bun run verify:db
# ควรได้: ok
```

### การยกเลิก (Rollback)
หาก restore ผิดพลาด ระบบสำรองข้อมูลเดิมไว้ที่:
```
backups/pre-restore_YYYYMMDD_HHMMSS.db
```
```bash
bun run restore:db -- backups/pre-restore_YYYYMMDD_HHMMSS.db --confirm
```

## ตรวจสอบ Backup
```bash
# ตรวจสอบ integrity
sqlite3 backups/khanom_house_*.db "PRAGMA integrity_check;"
# ควรได้: ok

# ตรวจสอบขนาด
du -h backups/*.db

# นับจำนวน records
sqlite3 backups/khanom_house_*.db "SELECT COUNT(*) FROM 'Order';"
```

## การทดสอบ Restore
1. สำรองข้อมูลปัจจุบัน: `bun run backup:db`
2. Restore ไฟล์ backup เก่า: `bun run restore:db -- backups/old_backup.db --confirm`
3. ตรวจสอบข้อมูล: `bun run dev` → เปิดหน้า admin
4. ยกเลิก: `bun run restore:db -- backups/pre-restore_*.db --confirm`

## คำเตือนสำหรับ Production
- ย้ายไฟล์ backup ไปเก็บที่อื่น (cloud storage, external drive)
- อย่าเก็บ backup ใน server เดียวกับ database
- ทดสอบ restore เดือนละครั้ง
- หาก migrate ไป PostgreSQL ให้ใช้ `pg_dump` แทน
