# 📤 วิธีอัปโหลด Khanom House ขึ้น GitHub

## ขั้นตอน (5 นาที)

### 1. สร้าง GitHub Repository
1. ไปที่ https://github.com/new
2. Repository name: `khanom-house`
3. Description: `Thai Dessert E-commerce + POS + ERP Platform`
4. เลือก **Public** หรือ **Private**
5. อย่าติ๊ก "Add a README" (มีในไฟล์แล้ว)
6. กด **Create repository**

### 2. แตกไฟล์ + Push
```bash
# แตกไฟล์
unzip khanom-house.zip
cd khanom-house

# ติดตั้ง dependencies
bun install  # หรือ npm install

# Git init + commit
git init
git add -A
git commit -m "Khanom House — Production Ready"

# Push ขึ้น GitHub (เปลี่ยน <username> เป็นชื่อ GitHub ของคุณ)
git branch -M main
git remote add origin https://github.com/<username>/khanom-house.git
git push -u origin main
```

### 3. ตั้งค่า Vercel Auto-Deploy
1. ไปที่ https://vercel.com → เลือก project "my-project"
2. Settings → Git → เชื่อม GitHub repo `khanom-house`
3. Vercel จะ auto-deploy ทุกครั้งที่ push
4. Environment Variables ที่ตั้งไว้ใน Vercel จะใช้อัตโนมัติ

### 4. ตั้งค่า Environment Variables ใน Vercel
(ถ้ายังไม่มี หรือสร้าง project ใหม่)
- `DATABASE_URL` = `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require`
- `SESSION_SECRET` = `openssl rand -hex 32`
- `SEED_PASSWORD` = รหัสผ่าน admin ที่ต้องการ

### 5. ตั้งค่า Environment Variables สำหรับ Tests
สร้าง `.env.test` ในเครื่อง (ไม่ขึ้น GitHub):
```
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST/test?sslmode=require
SESSION_SECRET=test-secret-not-for-production
```

## ⚠️ ความปลอดภัย
- ✅ ไฟล์ `.env` ไม่ได้อยู่ใน zip (ถูก .gitignore)
- ✅ ไม่มีรหัสผ่านใดๆ ในโค้ด
- ✅ ทุก secret ใช้ผ่าน environment variables
- ✅ ไม่มี database file ใน zip

## 📋 สิ่งที่ต้องมี
- [GitHub Account](https://github.com)
- [Bun](https://bun.sh) หรือ Node.js 18+
- [Neon](https://neon.tech) database (ฟรี)
- [Vercel](https://vercel.com) account (ฟรี)
