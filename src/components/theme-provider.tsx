'use client'

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

/**
 * Theme provider wrapper.
 *
 * WHY: Audit finding M18 — the props type was `ReactNode & {...}` which
 * is semantically wrong. Use the official `ThemeProviderProps` from
 * next-themes instead.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
