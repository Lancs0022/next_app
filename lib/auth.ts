import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { params: Record<string, string> },
  auth: AuthContext
) => Promise<NextResponse>

export interface AuthContext {
  user: DbUser
  tenantId: number
}

export interface DbUser {
  id_utilisateur: number
  tenant_id: number
  nom: string
  prenom: string
  email: string
  role: string
  actif: boolean
}

type Action = 'read' | 'write' | 'delete' | 'manage'

export function withAuth(
  handler: AuthenticatedHandler,
  domainCode?: string,
  action: Action = 'read'
) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    // 1. Extraire le token : header Authorization en priorité, puis cookie
    let token: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      token = req.cookies.get('pejaa_token')?.value ?? null
    }

    if (!token) {
      return NextResponse.json({ error: 'Token manquant ou invalide' }, { status: 401 })
    }

    // 2. Vérifier et décoder le JWT
    let decoded: { userId: number; tenantId: number }
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as typeof decoded
    } catch (err: unknown) {
      const name = err instanceof Error ? (err as jwt.JsonWebTokenError).name : ''
      if (name === 'TokenExpiredError') {
        return NextResponse.json({ error: 'Token expiré' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    if (!Number.isFinite(decoded.userId) || decoded.userId <= 0) {
      return NextResponse.json({ error: 'Token invalide : userId manquant' }, { status: 401 })
    }

    // 3. Récupérer l'utilisateur via Prisma
    const user = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: decoded.userId },
      select: {
        id_utilisateur: true,
        tenant_id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        actif: true,
      },
    })

    if (!user || !user.actif) {
      return NextResponse.json({ error: 'Utilisateur non trouvé ou inactif' }, { status: 401 })
    }

    // 4. Résoudre le tenantId (header X-Tenant-Id > token)
    const headerTenantRaw = req.headers.get('x-tenant-id')
    const headerTenantId = headerTenantRaw != null ? Number(headerTenantRaw) : null
    const tenantId =
      Number.isFinite(headerTenantId) && headerTenantId! > 0
        ? headerTenantId!
        : Number(user.tenant_id)

    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return NextResponse.json({ error: 'Tenant invalide ou manquant' }, { status: 401 })
    }

    // 5. RBAC (optionnel)
    if (domainCode) {
      const domain = await prisma.accessDomain.findFirst({
        where: { code: domainCode, actif: true },
        select: { id_domain: true },
      })

      if (!domain) {
        return NextResponse.json({ error: 'Domaine non trouvé' }, { status: 404 })
      }

      // Override utilisateur (prioritaire)
      const override = await prisma.userAccessOverride.findUnique({
        where: {
          id_utilisateur_id_domain: {
            id_utilisateur: user.id_utilisateur,
            id_domain: domain.id_domain,
          },
        },
      })

      let hasAccess: boolean | null = null

      if (override) {
        const col = `can_${action}` as keyof typeof override
        const val = override[col]
        if (val !== null && val !== undefined) {
          hasAccess = Boolean(val)
        }
      }

      // Matrice de rôle (fallback)
      if (hasAccess === null) {
        const role = await prisma.role.findFirst({
          where: { code: user.role, actif: true },
          select: { id_role: true },
        })

        if (!role) {
          return NextResponse.json({ error: 'Rôle non trouvé ou inactif' }, { status: 403 })
        }

        const matrix = await prisma.roleAccessMatrix.findUnique({
          where: {
            id_role_id_domain: {
              id_role: role.id_role,
              id_domain: domain.id_domain,
            },
          },
        })

        if (!matrix) {
          return NextResponse.json(
            { error: 'Accès refusé: aucune permission définie pour ce rôle/domaine' },
            { status: 403 }
          )
        }

        const col = `can_${action}` as keyof typeof matrix
        hasAccess = Boolean(matrix[col])
      }

      if (!hasAccess) {
        return NextResponse.json(
          { error: `Accès refusé: action '${action}' non autorisée sur '${domainCode}'` },
          { status: 403 }
        )
      }
    }

    // 6. Résoudre les params (async dans Next.js 16)
    const resolvedParams = await context.params

    // 7. Appeler le handler avec le contexte auth
    try {
      return await handler(req, { params: resolvedParams }, { user: user as DbUser, tenantId })
    } catch (err) {
      const e = err as Error & { httpStatus?: number }
      if (e.httpStatus) {
        return NextResponse.json({ error: e.message }, { status: e.httpStatus })
      }
      console.error('[Route Handler]', err)
      return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
    }
  }
}
