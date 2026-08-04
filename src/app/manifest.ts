import type { MetadataRoute } from 'next'

// PWA manifest — served at /manifest.webmanifest by Next.js 16.
// Logo is the gold ❀ on dark green circle (public/icon.svg).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Khanom House — ขนมไทย & จัดเบรค',
    short_name: 'Khanom House',
    description: 'ร้านขนมไทยโบราณ รับจัดเบรค งานมงคล งานบุญ ขนมสดขนมแห้งครบครัน',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FAF6F0',
    theme_color: '#1B3A2F',
    categories: ['food', 'shopping', 'business'],
    lang: 'th',
    dir: 'ltr',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
