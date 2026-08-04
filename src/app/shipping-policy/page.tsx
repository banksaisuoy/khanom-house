import Link from 'next/link'
export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-gold text-lg">❀</span><span className="font-bold">Khanom House</span></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← กลับหน้าร้าน</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">เงื่อนไขการจัดส่ง</h1>
        <div className="space-y-4 text-muted-foreground">
          <section className="space-y-2"><h2 className="font-bold text-foreground">พื้นที่จัดส่ง</h2><p>จัดส่งในเขตกรุงเทพมหานครและปริมณฑล (นนทบุรี สมุทรปราการ ปทุมธานี นครปฐม)</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">ค่าจัดส่ง</h2><ul className="list-disc pl-5 space-y-1"><li>กรุงเทพในเมือง: ฿40 (ฟรีเมื่อสั่งครบ ฿500)</li><li>กรุงเทพชานเมือง: ฿60 (ฟรีเมื่อสั่งครบ ฿800)</li><li>ปริมณฑล: ฿80 (ฟรีเมื่อสั่งครบ ฿1,000)</li></ul></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">ระยะเวลาจัดส่ง</h2><p>จัดส่งภายใน 1-2 วันทำการนับจากวันที่ยืนยันออเดอร์ สำหรับพรีออเดอร์จะจัดส่งตามวันที่นัดหมาย</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">การรับสินค้าเอง</h2><p>สามารถรับสินค้าที่ร้านได้ทุกวัน เวลา 08:00-20:00 น. โดยแจ้งวันเวลาที่ต้องการรับล่วงหน้า</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">ข้อควรระวัง</h2><p>ขนมสดควรรับและเก็บในตู้เย็นภายใน 2 ชั่วโมงหลังจัดส่ง หากไม่ได้อยู่ที่บ้านกรุณาแจ้งล่วงหน้า</p></section>
        </div>
      </main>
    </div>
  )
}
