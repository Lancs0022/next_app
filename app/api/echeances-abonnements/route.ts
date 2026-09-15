import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/lib/errors'
import { withAuth } from '@/lib/auth'
import { createEcheance } from '@/services/abonnements.service'

/**
 * POST /api/echeances-abonnements
 * Body: { id_souscription_abonnement, montant, periode_debut, periode_fin }
 *
 * Génération manuelle d'une échéance.
 * montant = snapshot figé du tarif applicable au moment de la génération.
 */
export const POST = withAuth(
  async (req, _ctx, { user, tenantId }) => {
    const body = await req.json()
    try {
      const result = await createEcheance({ body, tenantId, userId: user.id_utilisateur })
      return NextResponse.json(result, { status: 201 })
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'write'
)
