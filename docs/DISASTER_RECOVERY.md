# Disaster Recovery Runbook — Khanom House

## สารบัญ
1. [Database Corrupted](#1-database-corrupted)
2. [Accidental Data Deletion](#2-accidental-data-deletion)
3. [Failed Deployment](#3-failed-deployment)
4. [Broken Migration](#4-broken-migration)
5. [Lost Admin Password](#5-lost-admin-password)
6. [Checkout Failure](#6-checkout-failure)
7. [POS Cannot Open](#7-pos-cannot-open)
8. [Inventory Mismatch](#8-inventory-mismatch)
9. [Refund Error](#9-refund-error)
10. [Compromised Session Secret](#10-compromised-session-secret)
11. [Server Disk Full](#11-server-disk-full)

---

## 1. Database Corrupted
**อาการ:** หน้าเว็บขึ้น 500 error, Prisma errors ใน log
**ขั้นตอน:**
```bash
# 1. ตรวจสอบ integrity
sqlite3 db/custom.db "PRAGMA integrity_check;"

# 2. หาก error ให้ restore จาก backup
bun run restore:db -- backups/khanom_house_latest.db --confirm

# 3. Restart server
bun run dev  # หรือ pm2 restart
```

## 2. Accidental Data Deletion
**อาการ:** ข้อมูลหายจากตารางใดตารางหนึ่ง
**ขั้นตอน:**
```bash
# 1. หยุด server ทันที
pkill -f "next dev"

# 2. Backup ข้อมูลปัจจุบัน (ก่อน restore)
bun run backup:db

# 3. Restore จาก backup ล่าสุดก่อนเหตุการณ์
bun run restore:db -- backups/khanom_house_<วันก่อนหน้า>.db --confirm

# 4. Restart
bun run dev
```

## 3. Failed Deployment
**อาการ:** Build fail, runtime error หลัง deploy
**ขั้นตอน:**
```bash
# 1. Rollback ไป version ก่อนหน้า
git log --oneline -5
git checkout <previous-stable-commit>

# 2. Rebuild
bun install
bun run build

# 3. Restart
bun run start  # หรือ pm2 restart
```

## 4. Broken Migration
**อาการ:** `prisma db push` หรือ `prisma migrate` fail
**ขั้นตอน:**
```bash
# 1. Backup ก่อน
bun run backup:db

# 2. แก้ schema ที่ prisma/schema.prisma

# 3. Push ใหม่
bun run db:push

# 4. หากยัง fail ให้ reset (ระวัง! ลบข้อมูล)
# bun run db:reset  # เฉพาะ dev เท่านั้น
```

## 5. Lost Admin Password
**อาการ:** ไม่สามารถ login เข้า admin ได้
**ขั้นตอน:**
```bash
# 1. สร้าง script รีเซ็ตรหัสผ่าน
bunx tsx -e "
import { db } from './src/lib/db'
import bcrypt from 'bcryptjs'
const hash = await bcrypt.hash('newpassword', 10)
await db.user.update({ where: { email: 'admin@khanomhouse.th' }, data: { passwordHash: hash } })
console.log('Password reset done')
await db.\$disconnect()
"
# 2. Login ด้วยรหัสผ่านใหม่
# 3. เปลี่ยนรหัสผ่านอีกครั้งในหน้า admin
```

## 6. Checkout Failure
**อาการ:** ลูกค้าสั่งซื้อไม่สำเร็จ, 500 error
**ขั้นตอน:**
1. ตรวจสอบ `dev.log` หรือ `server.log`
2. ตรวจสอบว่ามี main branch ใน DB: `sqlite3 db/custom.db "SELECT * FROM Branch WHERE isMain = 1;"`
3. ตรวจสอบสต็อกสินค้า: `sqlite3 db/custom.db "SELECT * FROM Inventory WHERE quantity < 0;"`
4. หากสต็อกติดลบ ให้ปรับแก้: `sqlite3 db/custom.db "UPDATE Inventory SET quantity = 0 WHERE quantity < 0;"`

## 7. POS Cannot Open
**อาการ:** หน้า POS ขาว, หรือ "ไม่พบกะ"
**ขั้นตอน:**
1. ตรวจสอบกะที่เปิดอยู่: `sqlite3 db/custom.db "SELECT * FROM Shift WHERE status = 'OPEN';"`
2. หากไม่มี ให้เปิดกะใหม่ผ่านหน้า POS
3. หากมีหลายกะ ให้ปิดกะเก่า: `sqlite3 db/custom.db "UPDATE Shift SET status = 'CLOSED' WHERE id = '<old-id>';"`
4. ล้าง cache และ reload หน้า

## 8. Inventory Mismatch
**อาการ:** สต็อกในระบบไม่ตรงกับของจริง
**ขั้นตอน:**
1. เปิดหน้า `/admin/inventory`
2. ใช้ "ปรับสต็อก" พร้อมระบุเหตุผล
3. ตรวจสอบ StockMovement: `sqlite3 db/custom.db "SELECT * FROM StockMovement ORDER BY createdAt DESC LIMIT 20;"`
4. หากพบ anomaly ให้บันทึกใน Audit Log

## 9. Refund Error
**อาการ:** คืนเงินไม่สำเร็จ, สต็อกไม่กลับ
**ขั้นตอน:**
1. ตรวจสอบสถานะ refund: `sqlite3 db/custom.db "SELECT * FROM Refund ORDER BY createdAt DESC LIMIT 5;"`
2. หาก status = 'PENDING' ให้ approve ใหม่ผ่านหน้า admin
3. หาก stock ไม่กลับ ให้ปรับสต็อกด้วยมือ + สร้าง StockMovement
4. บันทึกเหตุการณ์ใน Audit Log

## 10. Compromised Session Secret
**อาการ:** SESSION_SECRET รั่วไป, มีผู้ไม่ปลอดภัยได้รับ cookie
**ขั้นตอน:**
```bash
# 1. เปลี่ยน SESSION_SECRET ทันที
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env

# 2. Restart server (ทุก session จะหมดอายุทันที)
bun run dev  # หรือ pm2 restart

# 3. ผู้ใช้ทุกคนต้อง login ใหม่
# 4. ตรวจสอบ Audit Log หากิจกรรมผิดปกติ
sqlite3 db/custom.db "SELECT * FROM AuditLog WHERE action = 'LOGIN' ORDER BY createdAt DESC LIMIT 50;"
```

## 11. Server Disk Full
**อาการ:** ไม่สามารถเขียนไฟล์, DB error
**ขั้นตอน:**
```bash
# 1. ตรวจสอบพื้นที่
df -h

# 2. ลบไฟล์ log เก่า
find logs/ -name "*.log" -mtime +7 -delete
find . -name "dev.log" -size +100M -truncate

# 3. ลบ backup เก่า (เก็บ 7 วันล่าสุด)
ls -t backups/*.db | tail -n +8 | xargs -r rm

# 4. ลบ .next cache
rm -rf .next/cache

# 5. Restart server
bun run dev
```
