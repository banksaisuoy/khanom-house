import Link from 'next/link'
import { Award, Leaf, Heart, Truck } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-gold text-lg">❀</span><span className="font-bold">Khanom House</span></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← กลับหน้าร้าน</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">เกี่ยวกับเรา</h1>
          <p className="text-muted-foreground">ขนมไทยโบราณ สูตรตำรับช่างหลวง ตั้งแต่ปี ๒๕๔๗</p>
        </div>
        <div className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
          <p>Khanom House คือร้านขนมไทยโบราณที่สืบทอดสูตรตำรับช่างหลวง มากว่า ๒๐ ปี เราเริ่มต้นจากร้านเล็กๆ ในย่านสีลม และได้รับความไว้วางใจจากลูกค้าทั่วกรุงเทพและปริมณฑล</p>
          <p>เราทำขนมสดทุกวัน ด้วยวัตถุดิบคัดสรร กะทิสด แป้งข้าวจ้าวคุณภาพ ไข่เป็ดจากฟาร์มที่ไว้วางใจได้ ทุกขั้นตอนผ่านมือช่างฝีมือที่มีประสบการณ์</p>
          <p>นอกจากขายหน้าร้าน เรายังรับจัดเบรค งานมงคล งานบุญ งานสัมมนา ครบทุกอรรถพิธี พร้อมจัดส่งถึงที่</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-2"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Award className="h-6 w-6" /></div><p className="font-bold">๒๐+ ปี</p><p className="text-xs text-muted-foreground">ประสบการณ์</p></div>
          <div className="text-center space-y-2"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Leaf className="h-6 w-6" /></div><p className="font-bold">ทำสด</p><p className="text-xs text-muted-foreground">ทุกวัน</p></div>
          <div className="text-center space-y-2"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Heart className="h-6 w-6" /></div><p className="font-bold">๕,๐๐๐+</p><p className="text-xs text-muted-foreground">งานจัดสำเร็จ</p></div>
          <div className="text-center space-y-2"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Truck className="h-6 w-6" /></div><p className="font-bold">จัดส่ง</p><p className="text-xs text-muted-foreground">ทั่ว กทม. ปริมณฑล</p></div>
        </div>
      </main>
    </div>
  )
}
