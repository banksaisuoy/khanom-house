'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="สลับธีม"
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4 text-[var(--gold)]" />
        ) : (
          <Moon className="h-4 w-4 text-[var(--forest)]" />
        )
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  )
}
