import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getAbonnement, deleteAbonnement } from '@/services/abonnements.service'
import { toErrorResponse } from '@/lib/errors'

/** GET /api/abonnements/:id — détail d'une offre avec ses souscriptions */
export const GET = withAuth(
  async (_req, ctx, { tenantId }) => {
    const id = Number(ctx.params?.id)
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    try {
      const result = await getAbonnement(id, tenantId)
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'read'
)

/**
 * DELETE /api/abonnements/:id
 * Suppression définitive uniquement si aucune souscription n'a jamais existé.
 * Sinon, utiliser PATCH /statut avec { statut: 'ARCHIVED' }.
 */
export const DELETE = withAuth(
  async (_req, ctx, { tenantId }) => {
    const id = Number(ctx.params?.id)
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    try {
      const result = await deleteAbonnement({ id, tenantId })
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'delete'
)
