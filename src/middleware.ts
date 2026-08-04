import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'kh_session'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = req.cookies.get(SESSION_COOKIE)?.value

  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/') && !session) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/api/admin') && !session) {
    return NextResponse.json(
      { error: 'กรุณาเข้าสู่ระบบ', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
