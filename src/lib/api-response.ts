/**
 * Unified API response helpers.
 *
 * WHY: Audit finding — inconsistent error shapes across 58 routes; some leak
 * `e.message` (Prisma internals), some return bare `{ error }`, some return
 * 500 with no body. Standardizing the response envelope lets the frontend
 * treat all errors uniformly and prevents info leaks.
 */
import { NextResponse } from 'next/server'
import { isValidationError } from './validation'
import { AuthError } from './auth'

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init })
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

/** 400 with optional details (for validation). */
export function badRequest(message: string, details?: unknown) {
  return NextResponse.json<ApiError>(
    { error: message, code: 'BAD_REQUEST', details },
    { status: 400 }
  )
}

/** 401 — not authenticated. */
export function unauthorized(message = 'กรุณาเข้าสู่ระบบ') {
  return NextResponse.json<ApiError>(
    { error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}

/** 403 — authenticated but not allowed. */
export function forbidden(message = 'ไม่มีสิทธิ์เข้าถึง') {
  return NextResponse.json<ApiError>(
    { error: message, code: 'FORBIDDEN' },
    { status: 403 }
  )
}

/** 404. */
export function notFound(message = 'ไม่พบข้อมูล') {
  return NextResponse.json<ApiError>(
    { error: message, code: 'NOT_FOUND' },
    { status: 404 }
  )
}

/** 409 — conflict (e.g. duplicate, already-voided). */
export function conflict(message: string) {
  return NextResponse.json<ApiError>(
    { error: message, code: 'CONFLICT' },
    { status: 409 }
  )
}

/** 429 — too many requests (rate limited). Optional Retry-After in seconds. */
export function tooManyRequests(
  message = 'คำขอถี่เกินไป กรุณาลองใหม่ในอีกครู่',
  retryAfterSec?: number
) {
  const headers = retryAfterSec
    ? { 'Retry-After': String(retryAfterSec) }
    : undefined
  return NextResponse.json<ApiError>(
    { error: message, code: 'RATE_LIMITED' },
    { status: 429, headers }
  )
}

/**
 * Thrown inside a `db.$transaction` callback to abort the tx and have the
 * `handle` wrapper return a 409 response. Useful for atomic-guard patterns
 * (e.g. `updateMany` returning count===0 → throw new ConflictError('...')).
 */
export class ConflictError extends Error {
  code = 'CONFLICT' as const
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

/**
 * Thrown inside a `db.$transaction` to abort and return a 404.
 */
export class NotFoundError extends Error {
  code = 'NOT_FOUND' as const
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * 500 — never leak internals. Log server-side, return generic message.
 *
 * Special-case ValidationError → 400 with field details.
 */
export function serverError(e: unknown, fallbackMessage = 'เกิดข้อผิดพลาดในระบบ') {
  // Validation errors are client errors, not server errors.
  if (isValidationError(e)) {
    return badRequest(e.message, { issues: e.issues })
  }
  // Log full error server-side; never send to client.
  console.error('[api:error]', e)
  return NextResponse.json<ApiError>(
    { error: fallbackMessage, code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

/**
 * Wrap an async route handler with structured error handling.
 *
 * WHY: Audit finding — every route has its own try/catch that varies in
 * shape and sometimes leaks `e.message`. This wrapper centralizes it.
 *
 * Usage:
 *   export const POST = handle(async (req, ctx) => { ... return ok({...}) })
 */
export function handle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<NextResponse>
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof AuthError) {
        return e.code === 'UNAUTHORIZED' ? unauthorized(e.message) : forbidden(e.message)
      }
      if (e instanceof ConflictError) return conflict(e.message)
      if (e instanceof NotFoundError) return notFound(e.message)
      if (isValidationError(e)) return badRequest(e.message, { issues: e.issues })
      // Prisma known errors → map to friendly messages
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Unique constraint')) {
        return conflict('ข้อมูลซ้ำ — มีอยู่แล้วในระบบ')
      }
      if (msg.includes('Foreign key constraint')) {
        return badRequest('อ้างอิงข้อมูลที่ไม่มีอยู่')
      }
      return serverError(e)
    }
  }
}
