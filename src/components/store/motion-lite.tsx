'use client'

/**
 * Lightweight motion replacements — CSS-only animations.
 *
 * WHY: framer-motion adds ~50KB to the client bundle and creates
 * IntersectionObservers + scroll listeners per animated element.
 * In a memory-constrained sandbox this causes the dev server to OOM.
 * These drop-in replacements use CSS transitions + a single
 * IntersectionObserver hook, cutting bundle + runtime cost.
 *
 * Accepts framer-motion compat props (whileHover, animate, etc.) and
 * ignores them — purely for drop-in replacement without TS errors.
 */
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  type ReactNode,
  type CSSProperties,
} from 'react'

interface FadeInProps {
  children?: ReactNode
  delay?: number
  y?: number
  className?: string
  style?: CSSProperties
  immediate?: boolean
  /* eslint-disable @typescript-eslint/no-explicit-any */
  whileHover?: any
  whileInView?: any
  initial?: any
  animate?: any
  transition?: any
  viewport?: any
  exit?: any
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(function FadeIn(
  { children, delay = 0, y = 20, className, style, immediate },
  ref
) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(immediate ?? false)

  useEffect(() => {
    if (immediate) {
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    const el = innerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '-40px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [immediate])

  return (
    <div
      ref={(node) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
})

interface FloatProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /* eslint-disable @typescript-eslint/no-explicit-any */
  whileHover?: any
  animate?: any
  transition?: any
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export const Float = forwardRef<HTMLDivElement, FloatProps>(function Float(
  { children, className, style },
  ref
) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        animation: 'kh-float 3s ease-in-out infinite',
        ...style,
      }}
    >
      {children}
      <style jsx>{`
        @keyframes kh-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
})
