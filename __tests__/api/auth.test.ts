import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { authHeaders, testAdmin } from './test-helpers'

// Import route handlers directly
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { GET as meHandler } from '@/app/api/auth/me/route'

/** Extract a named cookie value from Set-Cookie header(s) */
function extractCookie(res: Response, name: string): string | null {
  const cookies = res.headers.getSetCookie?.() ?? []
  for (const c of cookies) {
    const match = c.match(new RegExp(`${name}=([^;]+)`))
    if (match) return match[1]
  }
  return null
}

describe('Auth API', () => {
  let jwtFromLogin: string | null = null

  it('POST /api/auth/login — returns user + sets pejaa_token cookie', async () => {
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pejaa.com', password: 'Pejaa2026' }),
    })
    const res = await loginHandler(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('user')
    expect(body.user.email).toBe('admin@pejaa.com')
    expect(body.user.role).toBe('admin')

    // Token is set in pejaa_token cookie, not in body
    jwtFromLogin = extractCookie(res, 'pejaa_token')
    expect(jwtFromLogin).toBeTruthy()
  })

  it('POST /api/auth/login — 401 for bad password', async () => {
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pejaa.com', password: 'wrongpass' }),
    })
    const res = await loginHandler(req)
    expect(res.status).toBe(401)
  })

  it('POST /api/auth/login — 401 for non-existent user', async () => {
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'noone@nowhere.com', password: 'Pejaa2026' }),
    })
    const res = await loginHandler(req)
    expect(res.status).toBe(401)
  })

  it('GET /api/auth/me — returns user info with valid Bearer token', async () => {
    const req = new NextRequest('http://localhost/api/auth/me', {
      method: 'GET',
      headers: authHeaders(),
    })
    const ctx = { params: Promise.resolve({}) }
    const res = await meHandler(req, ctx)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('user')
    expect(body.user).toHaveProperty('id_utilisateur')
    expect(body.user.email).toBe('admin@pejaa.com')
  })

  it('GET /api/auth/me — returns user info with cookie from login', async () => {
    // Use the JWT obtained from the login test above
    if (!jwtFromLogin) return // skip if login test didn't run first
    const req = new NextRequest('http://localhost/api/auth/me', {
      method: 'GET',
      headers: { cookie: `pejaa_token=${jwtFromLogin}` },
    })
    const ctx = { params: Promise.resolve({}) }
    const res = await meHandler(req, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe('admin@pejaa.com')
  })

  it('GET /api/auth/me — 401 without token', async () => {
    const req = new NextRequest('http://localhost/api/auth/me', {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
    })
    const ctx = { params: Promise.resolve({}) }
    const res = await meHandler(req, ctx)
    expect(res.status).toBe(401)
  })
})
