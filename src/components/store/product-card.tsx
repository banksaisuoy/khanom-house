'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Plus, Star, Clock, Snowflake, AlertTriangle, Leaf, Sparkles, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart-store'
import { useWishlist } from '@/lib/wishlist-store'
import { getProductVisual } from '@/lib/product-emoji'
import {
  ProductDTO,
  formatTHB,
  formatNumber,
} from '@/lib/types'
import { ProductReviewsDialog } from './product-reviews-dialog/product-reviews-dialog'

interface Props {
  product: ProductDTO
  compact?: boolean
}

export function ProductCard({ product, compact = false }: Props) {
  const addItem = useCart((s) => s.addItem)
  const wishlistIds = useWishlist((s) => s.ids)
  const toggleWishlist = useWishlist((s) => s.toggle)
  const visual = getProductVisual(product.slug, product.name, product.type)
  const [reviewsOpen, setReviewsOpen] = useState(false)

  // Hydration-safe flash-sale check. On the server and on the first
  // client render we trust the product's isFlashSale flag without
  // checking the expiry timestamp (new Date() differs across the
  // SSR/hydration boundary). After mount we re-check against the
  // current time so expired sales stop showing the discount.
  const [isFlash, setIsFlash] = useState<boolean>(
    !!product.isFlashSale
  )
  useEffect(() => {
    if (!product.isFlashSale || !product.flashSaleEndAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFlash(false)
      return
    }
    setIsFlash(new Date(product.flashSaleEndAt).getTime() > Date.now())
  }, [product.isFlashSale, product.flashSaleEndAt])

  const flashPrice = isFlash ? product.flashSalePrice! : null
  const displayPrice = flashPrice ?? product.price
  const wished = wishlistIds.includes(product.id)

  const handleAdd = () => {
    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        nameEn: product.nameEn,
        price: displayPrice,
        originalPrice: flashPrice ? product.price : undefined,
        unit: product.unit,
        emoji: visual.emoji,
        gradient: visual.gradient,
        type: product.type,
        isFlashSale: !!isFlash,
      },
      1
    )
    toast.success(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`, {
      description: `${formatTHB(displayPrice)} × 1`,
    })
  }

  const handleWish = () => {
    toggleWishlist(product.id)
    toast.success(
      wished ? 'นำออกจากรายการโปรด' : 'เพิ่มในรายการโปรดแล้ว'
    )
  }

  const discountPct =
    isFlash && flashPrice
      ? Math.round((1 - flashPrice / product.price) * 100)
      : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl"
    >
      {/* Image area */}
      <Link href={`/products/${product.slug}`} className={`relative aspect-square bg-gradient-to-br ${visual.gradient} flex items-center justify-center overflow-hidden block`}>
        <span className="text-6xl md:text-7xl drop-shadow-lg select-none transition-transform duration-500 group-hover:scale-110">
          {visual.emoji}
        </span>

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isBestSeller && (
            <Badge className="bg-gold text-gold-foreground shadow text-[10px] font-semibold">
              🏆 ขายดี
            </Badge>
          )}
          {isFlash && (
            <Badge className="bg-red-600 text-white shadow text-[10px] font-semibold">
              🔥 แฟลชเซล
            </Badge>
          )}
          {discountPct > 0 && (
            <Badge className="bg-red-500 text-white shadow text-[10px] font-bold">
              -{discountPct}%
            </Badge>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWish}
          aria-label="เพิ่มในรายการโปรด"
          className={`absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition ${
            wished
              ? 'bg-red-500 text-white'
              : 'bg-white/70 text-foreground hover:bg-white'
          }`}
        >
          <Heart className="h-4 w-4" fill={wished ? 'currentColor' : 'none'} />
        </button>

        {/* hover overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="mb-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-foreground shadow">
            ดูรายละเอียด
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold leading-tight text-foreground">
            <Link href={`/products/${product.slug}`} className="hover:text-primary transition-colors">{product.name}</Link>
          </h3>
        </div>
        {product.nameEn && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {product.nameEn}
          </p>
        )}

        {!compact && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setReviewsOpen(true)
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-gold"
          >
            <Star className="h-3 w-3 fill-gold text-gold" />
            <span className="font-medium text-foreground">
              {product.rating.toFixed(1)}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {formatNumber(product.reviewCount)} รีวิว
            </span>
            <span>·</span>
            <span>ขาย {formatNumber(product.soldCount)}</span>
          </button>
        )}

        {!compact && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {product.description}
          </p>
        )}

        {!compact && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {product.tags.slice(0, 3).map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="text-[9px] px-1.5 py-0"
              >
                {t}
              </Badge>
            ))}
          </div>
        )}

        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            {product.shelfLifeHours && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {product.shelfLifeHours}ชม.
              </span>
            )}
            {product.needsRefrigeration && (
              <span className="inline-flex items-center gap-0.5">
                <Snowflake className="h-3 w-3" />
                แช่เย็น
              </span>
            )}
            {product.storageInstructions && (
              <span className="inline-flex items-center gap-0.5">
                <Snowflake className="h-3 w-3" />
                {product.storageInstructions}
              </span>
            )}
            {product.consumeWithin && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                กินภายใน {product.consumeWithin}
              </span>
            )}
          </div>
        )}

        {/* Allergen badges (Task FILL-MULTI) */}
        {!compact && product.allergens && product.allergens.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {product.allergens.slice(0, 4).map((a) => (
              <Badge
                key={a}
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-[9px] px-1.5 py-0 text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                {a}
              </Badge>
            ))}
            {product.allergens.length > 4 && (
              <span className="text-[9px] text-muted-foreground">+{product.allergens.length - 4}</span>
            )}
          </div>
        )}

        {/* Dietary badges: เจ / ฮาลาล / มังสวิรัติ (Task FILL-MULTI) */}
        {!compact && (product.isVegan || product.isHalal || product.isVegetarian) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {product.isVegan && (
              <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 text-[9px] px-1.5 py-0">
                <Leaf className="mr-0.5 h-2.5 w-2.5" />เจ
              </Badge>
            )}
            {product.isVegetarian && (
              <Badge className="bg-green-600/15 text-green-700 dark:text-green-300 text-[9px] px-1.5 py-0">
                🥬 มังสวิรัติ
              </Badge>
            )}
            {product.isHalal && (
              <Badge className="bg-[var(--gold)]/15 text-[var(--gold)] text-[9px] px-1.5 py-0">
                <Sparkles className="mr-0.5 h-2.5 w-2.5" />ฮาลาล
              </Badge>
            )}
          </div>
        )}

        {/* Footer price + add */}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-gold">
                {formatTHB(displayPrice)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                /{product.unit}
              </span>
            </div>
            {isFlash && flashPrice && (
              <div className="text-[10px] text-muted-foreground">
                <span className="line-through">
                  {formatTHB(product.price)}
                </span>
              </div>
            )}
            {!isFlash && product.memberPrice && (
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                สมาชิก {formatTHB(product.memberPrice)}
              </div>
            )}
          </div>
          <Button
            onClick={handleAdd}
            size="icon"
            aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
            className="h-11 w-11 rounded-full bg-gold text-gold-foreground shadow-md hover:bg-gold/90"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ProductReviewsDialog
        product={product}
        open={reviewsOpen}
        onOpenChange={setReviewsOpen}
      />
    </motion.div>
  )
}
