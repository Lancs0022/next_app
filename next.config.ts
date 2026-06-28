import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

/**
 * Origines autorisées en dev pour l'accès mobile / réseau local.
 * Next.js compare des hostnames (pas de notation CIDR).
 * Wildcards supportés : segments par point, ex. "192.168.*.*"
 * "192.168.0.0/16" et "*" seuls ne fonctionnent pas.
 * @see node_modules/next/dist/server/app-render/csrf-protection.js
 */
const devAllowedOrigins = [
  'localhost',
  '127.0.0.1',
  '*.localhost',
  '192.168.*.*',
  '10.*.*.*',
  ...(process.env.DEV_ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? []),
]

const config: NextConfig = {
  // Top-level (Next.js 16+) — pas sous "experimental"
  allowedDevOrigins: devAllowedOrigins,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  async rewrites() {
    return []
  },
}

export default config
