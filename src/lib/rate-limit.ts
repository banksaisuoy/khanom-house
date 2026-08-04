/**
 * In-memory IP-based rate limiter (token bucket).
 *
 * WHY: Audit finding P3-9 — public POST endpoints (storefront checkout,
 * catering inquiry, customer registration) have no rate limiting, making
 * them vulnerable to spam/abuse. Without Redis we use an in-process
 * token bucket per IP. In a multi-instance deploy this should be
 * replaced with a Redis-backed limiter (e.g. @upstash/ratelimit).
 *
 * Configuration: 5 requests per 60 seconds per IP (default).
 *
 * Algorithm: classic token bucket.
 *   - Each IP has a bucket with `max` tokens.
 *   - Tokens refill at a rate of `max / windowSec` per second.
 *   - Each request consumes 1 token. If empty → 429 with Retry-After.
 *   - Stale buckets (idle > 5 min) are evicted lazily.
 */

import { NextResponse } from 'next/server'
import { tooManyRequests } from './api-response'

type Bucket = { tokens: number; lastRefill: number }

const buckets = new Map<string, Bucket>()

const STALE_AFTER_MS = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(now: number) {
  if (now - lastCleanup < 60_000) return // at most once per minute
  lastCleanup = now
  for (const [key, b] of buckets) {
    if (now - b.lastRefill > STALE_AFTER_MS) buckets.delete(key)
  }
}

/**
 * Extract the client IP from a Next.js Request. Falls back to 'unknown'
 * if no proxy headers are present (all such requests share a single
 * bucket — acceptable degradation for rate-limiting purposes).
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Try to consume 1 token from the IP's bucket.
 *
 * @returns `{ ok: true }` if allowed, or
 *          `{ ok: false, retryAfterSec }` if rate-limited.
 */
export function rateLimit(
  key: string,
  max = 20,
  windowSec = 60
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  cleanup(now)
  const refillIntervalMs = (windowSec * 1000) / max

  const bucket = buckets.get(key)
  if (!bucket) {
    // First request from this IP — start with max-1 tokens (consume 1 now).
    buckets.set(key, { tokens: max - 1, lastRefill: now })
    return { ok: true }
  }

  // Refill tokens based on elapsed time since last refill.
  const elapsed = now - bucket.lastRefill
  const refilled = Math.floor(elapsed / refillIntervalMs)
  if (refilled > 0) {
    bucket.tokens = Math.min(max, bucket.tokens + refilled)
    bucket.lastRefill = bucket.lastRefill + refilled * refillIntervalMs
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { ok: true }
  }

  // Time until the next token becomes available.
  const remainingMs = refillIntervalMs - (elapsed % refillIntervalMs)
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)) }
}

/**
 * Convenience helper for Next.js route handlers — returns a 429
 * NextResponse if the request is rate-limited, or null if allowed.
 *
 * Usage:
 *   export const POST = handle(async (req) => {
 *     const limited = rateLimitResponse(req)
 *     if (limited) return limited
 *     ...
 *   })
 */
export function rateLimitResponse(
  req: Request,
  max = 20,
  windowSec = 60
): NextResponse | null {
  const ip = getClientIp(req)
  const r = rateLimit(ip, max, windowSec)
  if (r.ok) return null
  return tooManyRequests(undefined, r.retryAfterSec)
}

/**
 * Reset all rate-limit buckets. For TEST USE ONLY — do not call in
 * production code. Allows integration tests to reset state between
 * test cases so they don't interfere with each other.
 */
export function _resetRateLimitForTests() {
  buckets.clear()
  lastCleanup = Date.now()
}
