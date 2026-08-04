/**
 * Mock NextRequest helper for integration tests.
 *
 * Next.js route handlers receive a `NextRequest` object. In tests we
 * construct a minimal mock that provides the methods our handlers use:
 * `.json()`, `.headers`, `.cookies`, `.nextUrl.searchParams`.
 */
import { Readable } from 'stream'

interface MockRequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  cookies?: Record<string, string>
  url?: string
  searchParams?: Record<string, string>
}

/**
 * Create a mock NextRequest-compatible object for testing route handlers.
 *
 * Usage:
 *   const req = mockRequest({ body: { phone: '0810000001' }, method: 'POST' })
 *   const res = await POST(req)
 *   const data = await res.json()
 */
export function mockRequest(opts: MockRequestOptions = {}): any {
  const {
    method = 'GET',
    body,
    headers = {},
    cookies = {},
    url = 'http://localhost:3000/api/test',
    searchParams = {},
  } = opts

  // Build cookie header from cookies object
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  const allHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...headers,
    ...(cookieStr ? { cookie: cookieStr } : {}),
  }

  // Build URL with search params
  const fullUrl = new URL(url)
  for (const [k, v] of Object.entries(searchParams)) {
    fullUrl.searchParams.set(k, v)
  }

  // Create body as a readable stream or empty
  const bodyStr = body != null ? JSON.stringify(body) : ''
  const bodyBuffer = Buffer.from(bodyStr)

  return {
    method,
    headers: new Headers(allHeaders),
    url: fullUrl.toString(),
    nextUrl: {
      searchParams: fullUrl.searchParams,
      pathname: fullUrl.pathname,
    },
    json: async () => (body != null ? body : {}),
    text: async () => bodyStr,
    body: Readable.from([bodyBuffer]),
    cookies: {
      get: (name: string) => (cookies[name] ? { name, value: cookies[name] } : undefined),
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
    },
  }
}

/**
 * Extract the JSON body from a NextResponse.
 */
export async function getJson(res: any): Promise<any> {
  if (typeof res.json === 'function') return res.json()
  // Fallback: read body manually
  const text = await res.text()
  return JSON.parse(text)
}

/**
 * Extract Set-Cookie header from a NextResponse.
 */
export function getSetCookie(res: any): string | undefined {
  return res.headers?.get?.('set-cookie') ?? undefined
}

/**
 * Parse cookie name from Set-Cookie header.
 */
export function getCookieName(setCookie: string | undefined): string | undefined {
  if (!setCookie) return undefined
  return setCookie.split('=')[0]?.trim()
}
