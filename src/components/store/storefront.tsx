'use client'

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { FadeIn, Float } from './motion-lite'
import { toast } from 'sonner'
import {
  Flame,
  ChevronRight,
  Snowflake,
  Calendar,
  Truck,
  Leaf,
  Crown,
  Star,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Navbar } from './navbar'
import { Footer } from './footer'
import { ProductCard } from './product-card'
import { CartDrawer } from './cart-drawer'
import { FlashSaleTimer } from './flash-sale-timer'
import { CateringInquiryDialog } from './catering-inquiry-dialog'
import { LoyaltyRegisterDialog } from './loyalty-register-dialog'
import { useWishlist } from '@/lib/wishlist-store'
import { CategoryDTO, ProductDTO } from '@/lib/types'

interface Props {
  initialProducts: ProductDTO[]
  categories: CategoryDTO[]
}

export function Storefront({ initialProducts, categories }: Props) {
  const [fetchedProducts, setFetchedProducts] = useState<ProductDTO[] | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQ, setSearchQ] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [cateringOpen, setCateringOpen] = useState(false)
  const [cateringType, setCateringType] = useState('BREAK')
  const [loyaltyOpen, setLoyaltyOpen] = useState(false)
  const wishIds = useWishlist((s) => s.ids)

  // Tick every 60s so the flash-sale memo recomputes expired sales
  // without a full page reload. Hydration-safe: starts at null and is
  // populated only after mount.
  const [nowTick, setNowTick] = useState<number | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowTick(Date.now())
    const id = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const cateringRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Filtered products: when no filter/search, use server-fetched initial set.
  // Otherwise fetch from API.
  const products = useMemo<ProductDTO[]>(() => {
    if (activeCategory === 'wishlist') return []
    const hasFilter =
      activeCategory !== 'all' || searchQ.trim().length > 0
    if (!hasFilter) return initialProducts
    return fetchedProducts ?? []
  }, [activeCategory, searchQ, fetchedProducts, initialProducts])

  // Refetch when filter or search changes. Debounced (250ms) so we don't
  // fire a request on every keystroke. Uses AbortController so a rapid
  // sequence of searches only applies the latest response.
  useEffect(() => {
    if (activeCategory === 'wishlist') return
    const params: string[] = []
    if (activeCategory && activeCategory !== 'all')
      params.push(`category=${activeCategory}`)
    if (searchQ) params.push(`q=${encodeURIComponent(searchQ)}`)
    if (params.length === 0) return
    const ac = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const t = setTimeout(() => {
      fetch('/api/products?' + params.join('&'), { signal: ac.signal })
        .then((r) => r.json())
        .then((d) => {
          if (!ac.signal.aborted) setFetchedProducts(d.products || [])
        })
        .catch((e) => {
          if ((e as Error).name !== 'AbortError') toast.error('โหลดสินค้าไม่สำเร็จ')
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false)
        })
    }, 250)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [activeCategory, searchQ])

  const flashSaleProducts = useMemo(
    () =>
      nowTick == null
        ? // On first render (server + pre-mount client) trust the server's
          // isFlashSale flag without checking expiry to avoid hydration mismatch.
          initialProducts.filter((p) => p.isFlashSale)
        : initialProducts.filter(
            (p) =>
              p.isFlashSale &&
              p.flashSaleEndAt &&
              new Date(p.flashSaleEndAt).getTime() > nowTick
          ),
    [initialProducts, nowTick]
  )

  const bestSellers = useMemo(
    () =>
      initialProducts
        .filter((p) => p.isBestSeller && p.type !== 'CATERING_SET')
        .slice(0, 8),
    [initialProducts]
  )

  const featured = useMemo(
    () =>
      initialProducts
        .filter((p) => p.isFeatured && p.type !== 'CATERING_SET')
        .slice(0, 8),
    [initialProducts]
  )

  const earliestFlashEnd = flashSaleProducts[0]?.flashSaleEndAt

  const wishProducts = useMemo(
    () => initialProducts.filter((p) => wishIds.includes(p.id)),
    [initialProducts, wishIds]
  )

  const handleCategoryClick = (slug: string) => {
    if (slug === 'catering') {
      cateringRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    setSearchQ('')
    setActiveCategory(slug)
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const isFiltering = activeCategory !== 'all' || searchQ !== ''

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Announcement bar */}
      <div className="bg-gold text-gold-foreground text-xs sm:text-sm py-1.5 text-center font-medium">
        🚚 จัดส่งฟรีเมื่อสั่งครบ ฿500 • 🎁 สะสมแต้มทุกยอดซื้อ 1 บาท = 1 แต้ม
      </div>

      <Navbar
        categories={categories}
        onCategoryClick={handleCategoryClick}
        onCartClick={() => setCartOpen(true)}
        onSearch={(q) => {
          setSearchQ(q)
          setActiveCategory('all')
          toast.success(`ค้นหา "${q}"`)
          setTimeout(() => {
            gridRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 50)
        }}
      />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <div className="absolute inset-0 thai-pattern" />
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:py-20 md:grid-cols-2">
            <FadeIn
              className="space-y-5"
            >
              <Badge className="bg-gold/20 text-gold border border-gold/40">
                ❀ ตำรับช่างหลวง สืบทอดมา 3 รุ่น
              </Badge>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
                ขนมไทยโบราณ
                <br />
                <span className="text-gold">สูตรตำรับช่างหลวง</span>
              </h1>
              <p className="text-base md:text-lg text-primary-foreground/80 max-w-md">
                ขนมสดทำวันจัดส่งวัน รับจัดเบรค งานมงคล งานบุญ ครบทุกอรรถพิธี
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold h-12"
                  onClick={() => handleCategoryClick('all')}
                >
                  สั่งขนมเลย
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold/10 h-12"
                  onClick={() => {
                    setCateringType('BREAK')
                    setCateringOpen(true)
                  }}
                >
                  ขอใบเสนอราคาจัดเบรค
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-primary-foreground/80 pt-2">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-gold text-gold" /> 4.9/5
                  (2,400+ รีวิว)
                </span>
                <span>🏆 ขนมไทยยอดนิยม 2024</span>
                <span className="flex items-center gap-1">
                  <Leaf className="h-4 w-4" /> ทำสดทุกวัน
                </span>
              </div>
            </FadeIn>

            {/* Decorative arrangement */}
            <FadeIn
              className="relative hidden md:block h-96"
            >
              <FloatingCard
                emoji="🧁"
                title="ขนมถ้วยฟู"
                className="left-4 top-6"
                delay={0.3}
              />
              <FloatingCard
                emoji="🍯"
                title="ทองหยิบ"
                className="right-6 top-0"
                delay={0.5}
              />
              <FloatingCard
                emoji="🥥"
                title="สังขยา"
                className="left-12 bottom-4"
                delay={0.7}
              />
              <FloatingCard
                emoji="🫖"
                title="ชาเย็นไทย"
                className="right-12 bottom-10"
                delay={0.9}
              />
              <FloatingCard
                emoji="🟩"
                title="ขนมชั้น"
                className="left-1/2 -translate-x-1/2 top-32"
                delay={1.1}
              />
            </FadeIn>
          </div>
        </section>

        {/* Category pills */}
        <section className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              <CategoryPill
                label="ทั้งหมด"
                icon="🍡"
                active={activeCategory === 'all'}
                onClick={() => {
                  setSearchQ('')
                  setActiveCategory('all')
                }}
              />
              {categories.map((c) => (
                <CategoryPill
                  key={c.id}
                  label={c.name}
                  icon={c.icon || '🍡'}
                  active={activeCategory === c.slug}
                  onClick={() => handleCategoryClick(c.slug)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Main content */}
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-12" ref={gridRef}>
          {/* Wishlist view */}
          {activeCategory === 'wishlist' ? (
            <Section
              title={`❤️ รายการโปรด (${wishProducts.length})`}
              subtitle="ขนมที่คุณถูกใจ"
            >
              {wishProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  <div className="text-5xl mb-3">💝</div>
                  ยังไม่มีรายการโปรด กด ❤️ ที่การ์ดสินค้าเพื่อเพิ่ม
                </div>
              ) : (
                <ProductGrid products={wishProducts} loading={false} />
              )}
            </Section>
          ) : isFiltering ? (
            <Section
              title={
                searchQ
                  ? `🔍 ผลค้นหา "${searchQ}"`
                  : `สินค้าในหมวด: ${
                      categories.find((c) => c.slug === activeCategory)?.name ||
                      'ทั้งหมด'
                    }`
              }
              subtitle={`${products.length} รายการ`}
            >
              <ProductGrid products={products} loading={loading} />
            </Section>
          ) : (
            <>
              {/* Flash sale */}
              {flashSaleProducts.length > 0 && earliestFlashEnd && (
                <FlashSaleSection
                  products={flashSaleProducts}
                  endsAt={earliestFlashEnd}
                />
              )}

              {/* Best sellers */}
              {bestSellers.length > 0 && (
                <Section
                  title="🏆 ขนมไทยขายดี"
                  subtitle="ยอดนิยมจากลูกค้าของเรา"
                >
                  <ProductGrid products={bestSellers} loading={false} />
                </Section>
              )}

              {/* Featured */}
              {featured.length > 0 && (
                <Section
                  title="✨ แนะนำสำหรับคุณ"
                  subtitle="คัดสรรพิเศษ"
                >
                  <ProductGrid products={featured} loading={false} />
                </Section>
              )}

              {/* All products */}
              <Section
                title="🛍️ สินค้าทั้งหมด"
                subtitle={`${initialProducts.length} รายการ`}
              >
                <ProductGrid products={initialProducts} loading={false} />
              </Section>
            </>
          )}

          {/* Catering */}
          <CateringSection
            ref={cateringRef}
            onRequestQuote={(type) => {
              setCateringType(type)
              setCateringOpen(true)
            }}
          />

          {/* Loyalty */}
          <LoyaltySection onRegister={() => setLoyaltyOpen(true)} />

          {/* Freshness */}
          <FreshnessSection />

          {/* Testimonials */}
          <TestimonialsSection />
        </div>
      </main>

      <Footer
        onCategoryClick={handleCategoryClick}
        onCateringClick={() => {
          setCateringType('BREAK')
          setCateringOpen(true)
        }}
        onLoyaltyClick={() => setLoyaltyOpen(true)}
      />

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <CateringInquiryDialog
        open={cateringOpen}
        onOpenChange={setCateringOpen}
        presetType={cateringType}
      />
      <LoyaltyRegisterDialog open={loyaltyOpen} onOpenChange={setLoyaltyOpen} />
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function FloatingCard({
  emoji,
  title,
  className,
  delay,
}: {
  emoji: string
  title: string
  className?: string
  delay: number
}) {
  return (
    <div className={`absolute ${className}`}>
      <Float
        className="flex flex-col items-center gap-1 rounded-xl border border-gold/40 bg-card/95 p-3 shadow-xl backdrop-blur-md"
      >
        <span className="text-4xl">{emoji}</span>
        <span className="text-xs font-medium text-foreground">{title}</span>
      </Float>
    </div>
  )
}

function CategoryPill({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-gold bg-gold text-gold-foreground shadow-sm'
          : 'border-border bg-background hover:border-gold hover:text-gold'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <FadeIn
    >
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </FadeIn>
  )
}

function ProductGrid({
  products,
  loading,
}: {
  products: ProductDTO[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    )
  }
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
        <div className="text-5xl mb-3">🍰</div>
        ไม่พบสินค้า
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}

function FlashSaleSection({
  products,
  endsAt,
}: {
  products: ProductDTO[]
  endsAt: string
}) {
  const totalStock = 50
  const sold = products.reduce(
    (s, p) => s + (totalStock - (p.flashSaleStock ?? totalStock)),
    0
  )
  const pct = Math.min(100, Math.round((sold / (products.length * totalStock)) * 100))
  return (
    <FadeIn
      className="overflow-hidden rounded-2xl border border-gold/30 bg-primary text-primary-foreground"
    >
      <div className="grid gap-4 p-5 md:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <Badge className="bg-red-500 text-white">
            <Flame className="h-3 w-3 mr-1" /> LIVE
          </Badge>
          <h2 className="text-2xl font-bold text-gold">
            🔥 Flash Sale
            <br />
            ขนมสดวันนี้
          </h2>
          <div>
            <p className="text-xs text-primary-foreground/70 mb-1">
              สิ้นสุดใน
            </p>
            <FlashSaleTimer
              endsAt={endsAt}
              className="text-2xl text-white"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-primary-foreground/70 mb-1">
              <span>ขายแล้ว {sold} ชิ้น</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary-foreground/20">
              <FadeIn
                className="h-full bg-gold"
              />
            </div>
            <p className="text-[11px] text-primary-foreground/70 mt-1">
              จากทั้งหมด {products.length * totalStock} ชิ้น
            </p>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
          {products.map((p) => (
            <div key={p.id} className="w-40 shrink-0">
              <ProductCard product={p} compact />
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  )
}

const CATERING_PACKAGES = [
  {
    icon: '🍱',
    title: 'จัดเบรคประชุม',
    desc: 'ขนมไทย 5 ชนิด + เครื่องดื่ม',
    price: 120,
    unit: 'ท่าน',
    includes: ['ขนมสด 3 ชนิด', 'ขนมแห้ง 2 ชนิด', 'ชา/กาแฟ 1 แก้ว', 'จัดพานสวยงาม'],
    type: 'BREAK',
  },
  {
    icon: '🎊',
    title: 'งานมงคล / หมั้น',
    desc: 'ขนมมงคล 4 สูง พร้อมพาน',
    price: 250,
    unit: 'พาน',
    includes: ['ทองหยิบ ทองหยอด ฝอยทอง เม็ดขนุน', 'พานทอง 2 ชั้น', 'ตกแต่งดอกไม้', 'จัดส่งฟรี กทม.'],
    type: 'WEDDING',
  },
  {
    icon: '🙏',
    title: 'งานบุญ / ทำบุญ',
    desc: 'ขนมไทยชุดใหญ่สำหรับทอดกฐิน',
    price: 180,
    unit: 'ชุด',
    includes: ['ขนมสด 6 ชนิด', 'ขนมแห้ง 4 ชนิด', 'หีบห่อสวย', 'จัดเป็นชุด'],
    type: 'MERIT',
  },
  {
    icon: '🏢',
    title: 'งานองค์กร / สัมมนา',
    desc: 'จัดเบรคระดับพรีเมียม',
    price: 200,
    unit: 'ท่าน',
    includes: ['ขนมไทยประณีต 6 ชนิด', 'เครื่องดื่ม 2 ชนิด', 'ผลไม้ตามฤดูกาล', 'พนักงานเสิร์ฟ'],
    type: 'CORPORATE',
  },
]

const CateringSection = forwardRef<
  HTMLDivElement,
  { onRequestQuote: (type: string) => void }
>(function CateringSection({ onRequestQuote }, ref) {
  return (
    <FadeIn
      ref={ref}
      className="scroll-mt-32 rounded-2xl bg-cream p-6 md:p-8 dark:bg-card"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          🎉 รับจัดเบรค · งานมงคล · งานบุญ
        </h2>
        <p className="mt-2 text-muted-foreground">
          ทีมงานมืออาชีพพร้อมดูแลทุกขั้นตอน ตั้งแต่เสนอราคา ทำขนม จัดส่ง
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATERING_PACKAGES.map((pkg, i) => (
          <FadeIn
            key={i}
            
            className="flex flex-col rounded-xl border border-border bg-background p-4 shadow-sm"
          >
            <div className="mb-2 text-4xl">{pkg.icon}</div>
            <h3 className="font-bold text-foreground">{pkg.title}</h3>
            <p className="text-xs text-muted-foreground mb-2">{pkg.desc}</p>
            <p className="mb-3 text-lg font-bold text-gold">
              เริ่มต้น ฿{pkg.price}
              <span className="text-xs text-muted-foreground">/{pkg.unit}</span>
            </p>
            <ul className="mb-4 space-y-1 flex-1">
              {pkg.includes.map((inc, j) => (
                <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-gold mt-0.5">✦</span>
                  {inc}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => onRequestQuote(pkg.type)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              ขอใบเสนอราคา
              <ChevronRight className="h-4 w-4" />
            </Button>
          </FadeIn>
        ))}
      </div>

      {/* Trust stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-primary p-4 text-center text-primary-foreground">
        <Stat number="500+" label="งานจัดสำเร็จ" />
        <Stat number="50+" label="องค์กรไว้วางใจ" />
        <Stat number="10+" label="ปีประสบการณ์" />
      </div>
    </FadeIn>
  )
})

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-gold md:text-3xl">{number}</p>
      <p className="text-xs text-primary-foreground/80">{label}</p>
    </div>
  )
}

const TIERS = [
  {
    name: 'BRONZE',
    label: 'บรอนซ์',
    icon: '🥉',
    threshold: '0 แต้ม',
    perks: ['สะสมแต้ม 1 บาท = 1 แต้ม', 'รับข่าวสารโปรโมชั่น'],
    color: 'from-amber-700 to-amber-900',
  },
  {
    name: 'SILVER',
    label: 'ซิลเวอร์',
    icon: '🥈',
    threshold: '500 แต้ม',
    perks: ['ส่วนลด 5% ทุกออเดอร์', 'จัดส่งฟรีเมื่อสั่ง ฿300'],
    color: 'from-slate-400 to-slate-600',
  },
  {
    name: 'GOLD',
    label: 'โกลด์',
    icon: '🥇',
    threshold: '2,000 แต้ม',
    perks: ['ส่วนลด 10%', 'ส่วนลดสมาชิกพิเศษ', 'จัดส่งฟรีทุกออเดอร์'],
    color: 'from-amber-400 to-amber-600',
  },
  {
    name: 'VIP',
    label: 'วีไอพี',
    icon: '👑',
    threshold: '5,000 แต้ม',
    perks: ['ส่วนลด 15%', 'ของขวัญวันเกิด', 'พรีออเดอร์ขนมฤดูกาล', 'แม่บ้านส่วนตัว'],
    color: 'from-gold to-amber-700',
  },
]

function LoyaltySection({ onRegister }: { onRegister: () => void }) {
  return (
    <FadeIn
      className="overflow-hidden rounded-2xl bg-primary text-primary-foreground"
    >
      <div className="grid gap-6 p-6 md:grid-cols-[300px_1fr] md:p-8">
        <div className="space-y-3">
          <Badge className="bg-gold text-gold-foreground">
            <Crown className="h-3 w-3 mr-1" /> Loyalty Club
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold">
            ⭐ สมาชิก Khanom House Club
          </h2>
          <p className="text-sm text-primary-foreground/80">
            สะสมแต้มทุกยอดซื้อ รับสิทธิพิเศษมากมาย ยิ่งช้อป ยิ่งคุ้ม
          </p>
          <Button
            onClick={onRegister}
            className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold"
          >
            สมัครสมาชิก
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4 backdrop-blur-sm"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-2xl">{t.icon}</span>
                <Badge
                  variant="outline"
                  className="border-gold/50 text-gold text-[10px]"
                >
                  {t.threshold}
                </Badge>
              </div>
              <p className="font-bold text-gold">{t.label}</p>
              <p className="text-[10px] text-primary-foreground/60 mb-2">
                {t.name}
              </p>
              <ul className="space-y-1">
                {t.perks.map((perk, i) => (
                  <li key={i} className="text-[11px] text-primary-foreground/80">
                    ✓ {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  )
}

const FRESHNESS = [
  {
    icon: <Leaf className="h-7 w-7" />,
    title: 'ทำสดทุกวัน',
    desc: 'เริ่มทำตั้งแต่เช้ามืด เพื่อให้คุณได้ขนมสดใหม่ที่สุด',
  },
  {
    icon: <Snowflake className="h-7 w-7" />,
    title: 'ควบคุมอุณหภูมิ',
    desc: 'ระบบโซนเย็นและกล่องฉนวนความเย็น ขนมไม่เสีย',
  },
  {
    icon: <Calendar className="h-7 w-7" />,
    title: 'ระบบติดตามอายุขนม',
    desc: 'แจ้งเตือนอายุขนมและเวลาที่ควรรับประทาน',
  },
  {
    icon: <Truck className="h-7 w-7" />,
    title: 'จัดส่งด่วน 2 ชม.',
    desc: 'พื้นที่กรุงเทพและปริมณฑล ส่งไวภายใน 2 ชั่วโมง',
  },
]

function FreshnessSection() {
  return (
    <FadeIn
    >
      <div className="mb-5 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          ทำไมต้อง Khanom House?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ความสดใหม่และคุณภาพที่เราดูแลทุกขั้นตอน
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FRESHNESS.map((f, i) => (
          <FadeIn
            key={i}
            
            className="rounded-xl border border-border bg-card p-5 text-center shadow-sm"
          >
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold">
              {f.icon}
            </div>
            <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {f.desc}
            </p>
          </FadeIn>
        ))}
      </div>
    </FadeIn>
  )
}

const TESTIMONIALS = [
  {
    name: 'คุณสมหญิง ใจดี',
    role: 'สมาชิก VIP',
    avatar: '👩',
    rating: 5,
    quote:
      'ขนมสดทุกครั้งเลย สั่งมาจัดงานบุญที่บ้าน คุณป้าชมไม่หวาดไม่หวาน กำลังดี รสชาติโบราณแท้ๆ',
  },
  {
    name: 'คุณวิชัย บริษัท ABC',
    role: 'HR Manager',
    avatar: '👨',
    rating: 5,
    quote:
      'จัดเบรคประชุมบ่อยมาก ทีมงานประทับใจทุกครั้ง ขนมสวย รสชาติดี ส่งตรงเวลา แนะนำเลยครับ',
  },
  {
    name: 'คุณมานี',
    role: 'เจ้าสาว',
    avatar: '👰',
    rating: 5,
    quote:
      'สั่งชุดขนมหมั้น 4 สูง สวยมาก พานใหญ่ ขนมทองสวยเด้ง พ่อแม่เข้าฝ่ายชมเลย ขอบคุณมากค่ะ',
  },
]

function TestimonialsSection() {
  return (
    <FadeIn
    >
      <div className="mb-5 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          💬 รีวิวจากลูกค้า
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ความพึงพอใจของลูกค้าคือเป้าหมายของเรา
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <FadeIn
            key={i}
            
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{t.avatar}</span>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
              <Quote className="h-6 w-6 text-gold/40" />
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-gold text-gold" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              &quot;{t.quote}&quot;
            </p>
          </FadeIn>
        ))}
      </div>
    </FadeIn>
  )
}
