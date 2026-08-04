import Link from 'next/link'
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-gold text-lg">❀</span><span className="font-bold">Khanom House</span></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← กลับหน้าร้าน</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">นโยบายความเป็นส่วนตัว (PDPA)</h1>
        <div className="space-y-4 text-muted-foreground">
          <section className="space-y-2"><h2 className="font-bold text-foreground">ข้อมูลที่เก็บรวบรวม</h2><p>เราเก็บข้อมูลที่จำเป็นสำหรับการให้บริการ ได้แก่ ชื่อ เบอร์โทร อีเมล ที่อยู่จัดส่ง และประวัติการสั่งซื้อ</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">วัตถุประสงค์การเก็บข้อมูล</h2><ul className="list-disc pl-5 space-y-1"><li>เพื่อดำเนินการสั่งซื้อและจัดส่งสินค้า</li><li>เพื่อบริการลูกค้าและติดตามออเดอร์</li><li>เพื่อสะสมแต้มและสิทธิประโยชน์สมาชิก</li><li>เพื่อปรับปรุงบริการและนำเสนอโปรโมชัน</li></ul></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">การคุ้มครองข้อมูล</h2><p>เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม เพื่อป้องกันการเข้าถึงหรือเปิดเผยข้อมูลโดยไม่ได้รับอนุญาต รหัสผ่านถูกเข้ารหัสด้วย bcrypt</p></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">สิทธิของคุณ</h2><ul className="list-disc pl-5 space-y-1"><li>ขอเข้าถึงและสำเนาข้อมูลส่วนบุคคล</li><li>ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</li><li>ขอลบข้อมูลส่วนบุคคล</li><li>ขอระงับการใช้ข้อมูล</li></ul></section>
          <section className="space-y-2"><h2 className="font-bold text-foreground">การติดต่อ</h2><p>หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อได้ที่เบอร์ 02-123-4567 หรือ LINE: @khanomhouse</p></section>
        </div>
      </main>
    </div>
  )
}
