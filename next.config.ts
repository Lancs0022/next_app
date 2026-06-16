import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const config: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Pendant la migration : renvoyer les endpoints non encore migrés vers Pejaa_Back
  async rewrites() {
    // const pejaaBack = process.env.PEJAA_BACK_URL ?? 'http://localhost:4000'
    // Retirer les entrées au fur et à mesure de la migration
    return []
  },
}

export default config
