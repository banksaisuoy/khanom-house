import Link from 'next/link'
export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-gold text-lg">❀</span><span className="font-bold">Khanom House</span></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← กลับหน้าร้าน</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">นโยบายการคืนเงิน</h1>
        <div className="space-y-4 text-muted-foreground">
          <section className="space-y-2"><h2 className="font-bold text-foreground">กรณีที่สามารถคืนได้</h2><ul className="list-disc pl-5 space-y-1"><li>สินค้าเสีย บุบ หรือผิดพลาดจากการจัดส่ง</li><li>สินค้าผิดชนิดหรือผิดรายการ</li><li>สินค้าหมดอายุก่อนกำหนด</li></ul></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">ระยะเวลาแจ้งคืน</h2><p>แจ้งคืนภายใน 24 ชั่วโมงหลังรับสินค้า พร้อมแนบรูปหลักฐาน</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">วิธีการคืนเงิน</h2><ul className="list-disc pl-5 space-y-1"><li>โอนคืนผ่านบัญชีธนาคาร (3-5 วันทำการ)</li><li>คืนเป็นเครดิตร้าน (ทันที)</li><li>คืนเงินสด (สำหรับกรณีรับที่ร้าน)</li></ul></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">กรณีไม่รับคืน</h2><ul className="list-disc pl-5 space-y-1"><li>สินค้าที่เก็บในสภาพที่ไม่เหมาะสม</li><li>สินค้าที่ผ่านการใช้งานแล้ว</li><li>สินค้าพรีออเดอร์ที่ผลิตเสร็จแล้ว ยกเว้นกรณีความผิดพลาดจากร้าน</li></ul></section>
        </div>
      </main>
    </div>
  )
}
