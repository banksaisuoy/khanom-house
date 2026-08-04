'use client'

import { useState } from 'react'
import { Search, Heart, ShoppingBag, Moon, Sun, Menu, UserCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCart } from '@/lib/cart-store'
import { useWishlist } from '@/lib/wishlist-store'
import { CategoryDTO } from '@/lib/types'
import { OtpLoginDialog } from './otp-login-dialog/otp-login-dialog'

interface Props {
  categories: CategoryDTO[]
  onCategoryClick: (slug: string) => void
  onCartClick: () => void
  onSearch: (q: string) => void
}

export function Navbar({
  categories,
  onCategoryClick,
  onCartClick,
  onSearch,
}: Props) {
  const { theme, setTheme } = useTheme()
  const cartCount = useCart((s) => s.count())
  const cartHydrated = useCart((s) => s.hasHydrated)
  const wishCount = useWishlist((s) => s.ids.length)
  const wishHydrated = useWishlist((s) => s.hasHydrated)
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  const navLinks: { label: string; slug: string }[] = [
    { label: 'หน้าแรก', slug: 'all' },
    { label: 'ขนมสด', slug: 'fresh' },
    { label: 'ขนมแห้ง', slug: 'dry' },
    { label: 'เครื่องดื่ม', slug: 'drinks' },
    { label: 'ชุดของขวัญ', slug: 'gift' },
    { label: 'จัดเบรค/งาน', slug: 'catering' },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(q)
    setSearchOpen(false)
  }

  const handleNavClick = (slug: string) => {
    onCategoryClick(slug)
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 glass-card border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="เมนู"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-lg">
            ❀
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-foreground text-base">
              Khanom House
            </span>
            <span className="text-[10px] text-muted-foreground">
              ขนมไทยโบราณ
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navLinks.map((l) => (
            <Button
              key={l.slug}
              variant="ghost"
              size="sm"
              onClick={() => handleNavClick(l.slug)}
              className="text-sm font-medium hover:text-gold"
            >
              {l.label}
            </Button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        <div className="hidden lg:flex items-center">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาขนม..."
              className="w-44 pl-8 h-9"
            />
          </form>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="ค้นหา"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Dark mode */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="เปลี่ยนธีม"
        >
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="h-5 w-5 hidden dark:block" />
        </Button>

        {/* Member login */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLoginOpen(true)}
          aria-label="เข้าสู่ระบบสมาชิก"
        >
          <UserCircle className="h-5 w-5" />
        </Button>

        {/* Wishlist */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="รายการโปรด"
          onClick={() => onCategoryClick('wishlist')}
        >
          <Heart className="h-5 w-5" />
          {wishHydrated && wishCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 bg-red-500 text-white text-[10px]">
              {wishCount}
            </Badge>
          )}
        </Button>

        {/* Cart */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={onCartClick}
          aria-label="ตะกร้า"
        >
          <ShoppingBag className="h-5 w-5" />
          {cartHydrated && cartCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 bg-gold text-gold-foreground text-[10px] font-bold">
              {cartCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="lg:hidden border-t border-border p-3 bg-background">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาขนม..."
              className="pl-8"
            />
          </form>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border p-2 bg-background">
          {navLinks.map((l) => (
            <Button
              key={l.slug}
              variant="ghost"
              size="sm"
              onClick={() => handleNavClick(l.slug)}
              className="w-full justify-start"
            >
              {l.label}
            </Button>
          ))}
        </div>
      )}

      <OtpLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  )
}
