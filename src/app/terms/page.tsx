import Link from 'next/link'
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-gold text-lg">❀</span><span className="font-bold">Khanom House</span></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← กลับหน้าร้าน</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">เงื่อนไขการใช้งาน</h1>
        <div className="space-y-4 text-muted-foreground">
          <section className="space-y-2"><h2 className="font-bold text-foreground">การสั่งซื้อ</h2><p>การสั่งซื้อผ่านเว็บไซต์ถือว่าลูกค้ายอมรับเงื่อนไขทั้งหมด ร้านขอสงวนสิทธิ์ในการยืนยันหรือปฏิเสธคำสั่งซื้อ</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">ราคาและการชำระเงิน</h2><p>ราคาที่แสดงในเว็บไซต์เป็นราคาขายปลีก รวมภาษีมูลค่าเพิ่มแล้ว การชำระเงินต้องทำภายในเวลาที่กำหนด</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">การพรีออเดอร์</h2><p>สินค้าพรีออเดอร์ต้องสั่งล่วงหน้าตามที่ระบุ การยกเลิกพรีออเดอร์ต้องแจ้งก่อน 24 ชั่วโมงของวันจัดส่ง</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">การเปลี่ยนแปลง</h2><p>ร้านขอสงวนสิทธิ์ในการเปลี่ยนแปลงเงื่อนไขโดยไม่ต้องแจ้งให้ทราบล่วงหน้า การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนเว็บไซต์</p></section>
        </div>
      </main>
    </div>
  )
}
