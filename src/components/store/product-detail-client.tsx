'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Star, Heart, ShoppingBag, Snowflake, Clock, Share2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart-store'
import { getProductVisual } from '@/lib/product-emoji'

export function ProductDetailClient({ product, related }: { product: any; related: any[] }) {
  const addItem = useCart((s) => s.addItem)
  const [qty, setQty] = useState(1)
  const visual = getProductVisual(product.slug, product.name, product.type)

  const handleAdd = () => {
    addItem({ id: product.id, slug: product.slug, name: product.name, nameEn: product.nameEn, price: product.price, unit: product.unit, emoji: visual.emoji, gradient: visual.gradient, type: product.type }, qty)
    toast.success(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`, { description: `${qty} × ฿${product.price}` })
  }

  const handleShare = () => {
    const url = window.location.href
    if (navigator.share) { navigator.share({ title: product.name, url }) }
    else { navigator.clipboard.writeText(url); toast.success('คัดลอกลิงก์แล้ว') }
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Image */}
        <div className={`aspect-square rounded-2xl bg-gradient-to-br ${visual.gradient} grid place-items-center relative`}>
          <span className="text-9xl">{visual.emoji}</span>
          {product.isBestSeller && <Badge className="absolute top-4 left-4 bg-[var(--gold)] text-[var(--forest)]">🏆 ขายดี</Badge>}
          {product.isFlashSale && <Badge className="absolute top-4 right-4 bg-red-500 text-white">🔥 แฟลชเซล</Badge>}
        </div>
        {/* Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.nameEn && <p className="text-lg text-muted-foreground">{product.nameEn}</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(product.avgRating) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-muted'}`} />)}</div>
            <span className="text-sm text-muted-foreground">({product.reviewCount} รีวิว)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">฿{product.price}</span>
            <span className="text-muted-foreground">/{product.unit}</span>
            {product.memberPrice && <Badge variant="secondary">สมาชิก ฿{product.memberPrice}</Badge>}
          </div>
          {product.description && <p className="text-muted-foreground">{product.description}</p>}
          {/* Allergens */}
          {product.allergens.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">⚠️ สารก่อภูมิแพ้</p>
              <div className="flex flex-wrap gap-1">{product.allergens.map((a: string) => <Badge key={a} variant="outline" className="border-amber-300 text-amber-700">{a}</Badge>)}</div>
            </div>
          )}
          {/* Storage */}
          <div className="flex flex-wrap gap-3 text-sm">
            {product.needsRefrigeration && <span className="flex items-center gap-1"><Snowflake className="h-4 w-4 text-blue-500" /> ต้องแช่เย็น</span>}
            {product.consumeWithin && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> ทานภายใน {product.consumeWithin}</span>}
            {product.storageInstructions && <span>📦 {product.storageInstructions}</span>}
            {product.isVegan && <Badge className="bg-green-100 text-green-700">🌿 เจ</Badge>}
            {product.isHalal && <Badge className="bg-green-100 text-green-700">清真 ฮาลาล</Badge>}
            {product.isVegetarian && <Badge className="bg-green-100 text-green-700">มังสวิรัติ</Badge>}
          </div>
          {/* Qty + Add */}
          <div className="flex items-center gap-3 pt-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setQty(Math.max(1, qty - 1))}>−</Button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <Button size="sm" variant="outline" onClick={() => setQty(qty + 1)}>+</Button>
            </div>
            <Button size="lg" className="flex-1" onClick={handleAdd}><ShoppingBag className="h-5 w-5" /> หยิบใส่ตะกร้า</Button>
            <Button size="lg" variant="outline" onClick={handleShare}><Share2 className="h-5 w-5" /></Button>
          </div>
        </div>
      </div>
      {/* Reviews */}
      {product.reviews.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5" /> รีวิวจากลูกค้า</h2>
          {product.reviews.map((r: any) => (
            <div key={r.id} className="rounded-lg border p-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.customerName}</span>
                <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-muted'}`} />)}</div>
              </div>
              {r.title && <p className="font-medium">{r.title}</p>}
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              {r.reply && <div className="rounded bg-muted p-2 text-sm"><b>ร้านตอบ:</b> {r.reply}</div>}
            </div>
          ))}
        </div>
      )}
      {/* Related */}
      {related.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">สินค้าที่เกี่ยวข้อง</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {related.map((p) => {
              const v = getProductVisual(p.slug, p.name, p.type)
              return (
                <Link key={p.id} href={`/products/${p.slug}`} className="rounded-lg border p-3 hover:shadow-md transition-shadow">
                  <div className={`aspect-square rounded-md bg-gradient-to-br ${v.gradient} grid place-items-center mb-2`}><span className="text-4xl">{v.emoji}</span></div>
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-primary font-bold">฿{p.price}</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
