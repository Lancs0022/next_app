import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

export const POST = withAuth(async (_req: NextRequest) => {
  const res = NextResponse.json({ message: 'Déconnexion réussie' })
  res.cookies.set('pejaa_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
})
