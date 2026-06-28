import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIX = [
  '/dashboard',
  '/stock',
  '/ventes',
  '/collaborateurs',
  '/finance',
  '/commandes',
  '/settings',
  '/abonnements',
  '/admin-tools',
  '/reports',
  '/pos',
  '/clients',
  '/transferts',
  '/ajustements',
  '/retours',
]

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('pejaa_token')?.value

  const isProtected = PROTECTED_PREFIX.some((p) => pathname.startsWith(p))

  // Logger les requêtes en développement
  if (process.env.NODE_ENV === 'development') {
    const start = Date.now()
    const response = processRequest(req, pathname, token, isProtected)
    const duration = Date.now() - start
    console.log(`[${req.method}] ${pathname} - ${duration}ms`)
    return response
  }

  return processRequest(req, pathname, token, isProtected)
}

function processRequest(
  req: NextRequest,
  pathname: string,
  token: string | undefined,
  isProtected: boolean
) {
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
