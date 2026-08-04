'use client'

import { Facebook, Instagram, LineChart, Phone, Mail, MapPin, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

interface Props {
  onCategoryClick: (slug: string) => void
  onCateringClick: () => void
  onLoyaltyClick: () => void
}

export function Footer({
  onCategoryClick,
  onCateringClick,
  onLoyaltyClick,
}: Props) {
  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gold text-gold-foreground text-lg">
                ❀
              </span>
              <div>
                <p className="font-bold">Khanom House</p>
                <p className="text-[11px] text-primary-foreground/70">
                  ขนมไทยโบราณ สูตรตำรับช่างหลวง
                </p>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              ร้านขนมไทยโบราณดั้งเดิม ทำสดทุกวัน รับจัดเบรค งานมงคล งานบุญ ครบทุกอรรถพิธี
            </p>
            <div className="flex gap-2">
              <SocialBtn icon={<Facebook className="h-4 w-4" />} />
              <SocialBtn icon={<Instagram className="h-4 w-4" />} />
              <SocialBtn icon={<LineChart className="h-4 w-4" />} />
            </div>
          </div>

          {/* Menu */}
          <div>
            <h4 className="font-semibold mb-3 text-gold">เมนู</h4>
            <ul className="space-y-2 text-sm">
              <FooterLink onClick={() => onCategoryClick('fresh')}>ขนมสด</FooterLink>
              <FooterLink onClick={() => onCategoryClick('dry')}>ขนมแห้ง</FooterLink>
              <FooterLink onClick={() => onCategoryClick('drinks')}>เครื่องดื่ม</FooterLink>
              <FooterLink onClick={() => onCategoryClick('gift')}>ชุดของขวัญ</FooterLink>
              <FooterLink onClick={() => onCategoryClick('ceremony')}>ชุดงานมงคล</FooterLink>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-3 text-gold">บริการ</h4>
            <ul className="space-y-2 text-sm">
              <FooterLink onClick={onCateringClick}>จัดเบรค · งานมงคล</FooterLink>
              <FooterLink onClick={onLoyaltyClick}>สมัครสมาชิก</FooterLink>
              <li><Link href="/tracking" className="text-primary-foreground/80 hover:text-gold transition-colors">ติดตามออเดอร์</Link></li>
              <li><Link href="/faq" className="text-primary-foreground/80 hover:text-gold transition-colors">คำถามที่พบบ่อย</Link></li>
              <FooterLink onClick={() => onCategoryClick('all')}>ดูสินค้าทั้งหมด</FooterLink>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-semibold mb-3 text-gold">ข้อมูล</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-primary-foreground/80 hover:text-gold transition-colors">เกี่ยวกับร้าน</Link></li>
              <li><Link href="/shipping-policy" className="text-primary-foreground/80 hover:text-gold transition-colors">เงื่อนไขการจัดส่ง</Link></li>
              <li><Link href="/return-policy" className="text-primary-foreground/80 hover:text-gold transition-colors">นโยบายคืนเงิน</Link></li>
              <li><Link href="/privacy" className="text-primary-foreground/80 hover:text-gold transition-colors">นโยบายความเป็นส่วนตัว</Link></li>
              <li><Link href="/terms" className="text-primary-foreground/80 hover:text-gold transition-colors">เงื่อนไขการใช้งาน</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-3 text-gold">ติดต่อ</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>ถนนสีลม กรุงเทพฯ 10500</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>02-123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span>line: @khanomhouse</span>
              </li>
            </ul>
            <div className="mt-3 rounded-md bg-primary-foreground/10 p-2 text-xs">
              <p className="font-medium">เวลาทำการ</p>
              <p className="text-primary-foreground/80">
                จ-อา 08:00 - 20:00
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/70">
          <p>© 2024 Khanom House. สงวนลิขสิทธิ์</p>
          <div className="flex flex-wrap gap-4 items-center">
            <a href="#" className="hover:text-gold">
              นโยบายความเป็นส่วนตัว
            </a>
            <a href="#" className="hover:text-gold">
              เงื่อนไขการใช้งาน
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1 font-medium text-gold hover:bg-gold hover:text-gold-foreground transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              เข้าระบบแอดมิน
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function SocialBtn({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="grid h-9 w-9 place-items-center rounded-full border border-primary-foreground/20 hover:bg-gold hover:text-gold-foreground transition-colors">
      {icon}
    </button>
  )
}

function FooterLink({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="text-primary-foreground/80 hover:text-gold transition-colors"
      >
        {children}
      </button>
    </li>
  )
}
