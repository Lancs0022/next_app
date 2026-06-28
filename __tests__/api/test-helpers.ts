import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'pejaa-dev-secret-change-in-production-abc123xyz'

export function signTestToken(user: {
  id_utilisateur: number
  tenant_id: number
  nom?: string
  prenom?: string
  email?: string
  role?: string
  actif?: boolean
}) {
  // JWT payload MUST match login route: { userId, tenantId }
  return jwt.sign(
    {
      userId: user.id_utilisateur,
      tenantId: user.tenant_id,
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  )
}

// Default admin user for tests
export const testAdmin = {
  id_utilisateur: 1,
  tenant_id: 1,
  nom: 'Admin',
  prenom: 'Principal',
  email: 'admin@pejaa.com',
  role: 'admin',
  actif: true,
}

export function authHeaders(user = testAdmin) {
  const token = signTestToken(user)
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': String(user.tenant_id),
    'content-type': 'application/json',
  }
}
