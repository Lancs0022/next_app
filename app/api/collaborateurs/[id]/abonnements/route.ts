import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getCollaborateurAbonnements } from '@/services/collaborateurs.service'
import { toErrorResponse } from '@/lib/errors'

/**
 * GET /api/collaborateurs/:id/abonnements
 * Retourne l'historique complet des souscriptions, échéances et paiements
 * d'un collaborateur, dans l'ordre chronologique inverse.
 */
export const GET = withAuth(
  async (_req, ctx, { tenantId }) => {
    const id = Number(ctx.params?.id)
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    try {
      const result = await getCollaborateurAbonnements(id, tenantId)
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'COLLAB',
  'read'
)
