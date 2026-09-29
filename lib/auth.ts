import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'
import { withRequestContext, makeRequestContext, updateRequestContext } from '@/lib/server-logger/context'
import { makeRequestId, fmtRequestEnd } from '@/lib/server-logger/formatter'
import { serverLogger } from '@/lib/server-logger/logger'
import { getDefaultSection } from '@/lib/server-logger/route-context'

/**
 * Finalise et log une réponse HTTP.
 * - 2xx/3xx → session.log seulement (via emit sans isError)
 * - 4xx/5xx → session.log + errors.log (via emit avec isError=true)
 * Catégorise: 401=AUTHENTICATION, 403=AUTHORIZATION, autres 4xx=CLIENT_ERROR, 5xx=SERVER_ERROR
 */
function finalizeResponse(
  requestId: string,
  route: string,
  response: NextResponse
): NextResponse {
  const status = response.status
  const isError = status >= 400

  if (serverLogger.config.enabled && isError) {
    const category =
      status === 401 ? 'AUTHENTICATION' :
      status === 403 ? 'AUTHORIZATION' :
      status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR'

    // Safe error context — no credentials, tokens, PII, or full payloads
    serverLogger.emit([
      '',
      `[${requestId}] ✗ ${status} ${category} → ${route}`,
      '',
    ], true)
  }

  // Log request end (success/failure) — reuse existing formatter
  if (serverLogger.config.enabled) {
    const durationMs = 0 // precise duration would need start time tracking; kept for future enhancement
    const ok = status < 400
    serverLogger.emit(fmtRequestEnd(requestId, durationMs, ok))
  }

  return response
}

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
    // ── Contexte ALS — créé immédiatement, avant toute opération Prisma ────
    // Toutes les requêtes DB qui suivent (RBAC + handler métier) sont ainsi
    // rattachées au bon requestId et à la bonne route.
    const requestId = makeRequestId()
    const method    = req.method ?? 'GET'
    const pathname  = req.nextUrl?.pathname ?? 'unknown'
    const route     = `${method} ${pathname}`
    const alsCtx    = makeRequestContext({ requestId, route })

    return withRequestContext(alsCtx, async () => {
      // ── 1. Enregistrement HTTP (détection répétitions HTTP) ───────────────
      // Toujours enregistré, même si le logger textuel est désactivé.
      if (serverLogger.config.enabled) {
        serverLogger.httpMetrics.record(requestId, route)
      }

      // ── 2. Log de début de requête ────────────────────────────────────────
      if (serverLogger.config.enabled) {
        serverLogger.emit([``, `[${requestId}] → ${route}`])
      }

      // ── 3. Section Auth — RBAC ────────────────────────────────────────────
      // Toutes les opérations Prisma suivantes (Utilisateur.findUnique,
      // AccessDomain.findFirst, etc.) sont rattachées à la section "Auth".
      if (serverLogger.config.enabled) {
        serverLogger.emit([``, `[${requestId}] ▸ Auth`, ``])
        updateRequestContext({ section: 'Auth', step: null })
      }

      let response: NextResponse

      // ── Single exit point block ──
      do {
        // 1. Extraire le token : header Authorization en priorité, puis cookie
        let token: string | null = null
        const authHeader = req.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7)
        } else {
          token = req.cookies.get('pejaa_token')?.value ?? null
        }

        if (!token) {
          response = NextResponse.json({ error: 'Token manquant ou invalide' }, { status: 401 })
          break
        }

        // 2. Vérifier et décoder le JWT
        let decoded: { userId: number; tenantId: number }
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET!) as typeof decoded
        } catch (err: unknown) {
          const name = err instanceof Error ? (err as jwt.JsonWebTokenError).name : ''
          if (name === 'TokenExpiredError') {
            response = NextResponse.json({ error: 'Token expiré' }, { status: 401 })
          } else {
            response = NextResponse.json({ error: 'Token invalide' }, { status: 401 })
          }
          break
        }

        if (!Number.isFinite(decoded.userId) || decoded.userId <= 0) {
          response = NextResponse.json({ error: 'Token invalide : userId manquant' }, { status: 401 })
          break
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
          response = NextResponse.json({ error: 'Utilisateur non trouvé ou inactif' }, { status: 401 })
          break
        }

        // 4. Résoudre le tenantId (header X-Tenant-Id > token)
        const headerTenantRaw = req.headers.get('x-tenant-id')
        const headerTenantId = headerTenantRaw != null ? Number(headerTenantRaw) : null
        const tenantId =
          Number.isFinite(headerTenantId) && headerTenantId! > 0
            ? headerTenantId!
            : Number(user.tenant_id)

        if (!Number.isFinite(tenantId) || tenantId <= 0) {
          response = NextResponse.json({ error: 'Tenant invalide ou manquant' }, { status: 401 })
          break
        }

            // 5. RBAC (optionnel)
        if (domainCode) {
          const domain = await prisma.accessDomain.findFirst({
            where: { code: domainCode, actif: true },
            select: { id_domain: true },
          })

          if (!domain) {
            response = NextResponse.json({ error: 'Domaine non trouvé' }, { status: 404 })
            break
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
              response = NextResponse.json({ error: 'Rôle non trouvé ou inactif' }, { status: 403 })
              break
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
              response = NextResponse.json(
                { error: 'Accès refusé: aucune permission définie pour ce rôle/domaine' },
                { status: 403 }
              )
              break
            }

            const col = `can_${action}` as keyof typeof matrix
            hasAccess = Boolean(matrix[col])
          }

          if (!hasAccess) {
            response = NextResponse.json(
              { error: `Accès refusé: action '${action}' non autorisée sur '${domainCode}'` },
              { status: 403 }
            )
            break
          }
        }

                // 6. Résoudre les params (async dans Next.js 16)
        const resolvedParams = await context.params

        // ── 4. Reset du contexte avant le handler métier ──────────────────────
        // Rien de la phase Auth ne doit fuiter dans le contexte métier.
        // La section par défaut de la route est appliquée ici si disponible.
        const defaultSection = getDefaultSection(route)
        updateRequestContext({ section: defaultSection, step: null })

        // 7. Appeler le handler avec le contexte auth
        try {
          response = await handler(req, { params: resolvedParams }, { user: user as DbUser, tenantId })
        } catch (err) {
          const e = err as Error & { httpStatus?: number }
          if (e.httpStatus) {
            response = NextResponse.json({ error: e.message }, { status: e.httpStatus })
          } else {
            console.error('[Route Handler]', err)
            response = NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
          }
        }
      } while (false)

      return finalizeResponse(requestId, route, response)
    })
  }
}
