# UAT Checklist — Khanom House

## Storefront
- [ ] หน้าแรกโหลดได้
- [ ] Flash Sale countdown แสดง
- [ ] สินค้าขายดีแสดง
- [ ] คลิกสินค้า → หน้ารายละเอียด
- [ ] สารก่อภูมิแพ้แสดง
- [ ] เพิ่มลงตะกร้า → badge อัปเดต
- [ ] เปิดตะกร้า → ปรับจำนวนได้
- [ ] ใส่คูปอง KH10 → ลดราคา
- [ ] Checkout → กรอกข้อมูล → สั่งซื้อสำเร็จ
- [ ] ได้เลขออเดอร์

## Order Tracking
- [ ] `/tracking` กรอกเลขออเดอร์ → แสดงสถานะ
- [ ] Timeline แสดงสถานะถูกต้อง

## Admin Login
- [ ] `/login` โหลด
- [ ] Login สำเร็จ → redirect `/admin`
- [ ] Login ผิด → error message
- [ ] Dashboard แสดง KPI

## POS
- [ ] `/admin/pos` เปิดได้
- [ ] เลือกหมวดสินค้า
- [ ] เพิ่มสินค้าลงตะกร้า
- [ ] ชำระเงินสด → บิลสร้าง
- [ ] สต็อกลด
- [ ] พักบิล → เรียกบิล
- [ ] ยกเลิกบิล + เหตุผล → สต็อกกลับ

## Inventory
- [ ] `/admin/inventory` โหลด
- [ ] ปรับสต็อก → อัปเดต
- [ ] ปรับสต็อกเกินจำนวน → ปฏิเสธ
- [ ] ประวัติ movement แสดง

## Refund
- [ ] สร้างคำขอคืนเงิน
- [ ] อนุมัติ → สต็อกกลับ
- [ ] อนุมัติซ้ำ → ปฏิเสธ
- [ ] Audit log บันทึก

## Gift Card
- [ ] สร้างบัตร (฿500)
- [ ] Cashier ไม่สามารถสร้างได้ (403)
- [ ] ใช้บัตร → ยอดลด

## Customer OTP
- [ ] ส่ง OTP → ไม่แสดงรหัสใน response
- [ ] ยืนยัน OTP → login สำเร็จ
- [ ] cookie ถูกต้อง (HttpOnly, kh_customer_session)

## RBAC
- [ ] CASHIER ไม่เข้า `/admin/users` ได้
- [ ] CASHIER ไม่สร้าง gift card ได้
- [ ] CASHIER ใช้ POS ได้

## Export
- [ ] Export CSV รายงาน → ดาวน์โหลด
- [ ] Export ใบกำกับภาษี → พิมพ์ได้

## PWA
- [ ] Install บนมือถือได้
- [ ] ไอคอนแสดง

## Dark Mode
- [ ] สลับ dark/light ได้
- [ ] สีคงที่ทุกหน้า

## Mobile Responsive
- [ ] หน้าร้าน 375px ใช้ได้
- [ ] Admin 768px ใช้ได้
- [ ] POS แท็บเล็ตใช้ได้
