import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/lib/errors'
import { withAuth } from '@/lib/auth'
import { createPaiements, listPaiements } from '@/services/abonnements.service'

/**
 * GET /api/paiements-abonnements
 * Liste tous les paiements d'abonnement du tenant, enrichis des noms collaborateurs et offres.
 */
export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    try {
      const result = await listPaiements({ tenantId })
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'read'
)

/**
 * POST /api/paiements-abonnements
 *
 * Enregistre un paiement pouvant couvrir plusieurs échéances d'une même souscription.
 *
 * Body :
 * {
 *   lignes: [{ id_echeance_abonnement: number, montant: number }, ...],
 *   date_paiement?: string  // ISO date, défaut = maintenant
 * }
 *
 * Règles V1 :
 *   - Au moins une ligne
 *   - Toutes les échéances appartiennent à la même souscription
 *   - Pas d'excédent (montant ≤ restant dû de chaque échéance)
 *   - Crée exactement 1 TransactionFinanciere(IN) pour le groupe
 *   - Atomique : si une ligne échoue, rien n'est persisté
 */
export const POST = withAuth(
  async (req, _ctx, { user, tenantId }) => {
    const body = await req.json()
    try {
      const result = await createPaiements({ body, tenantId, userId: user.id_utilisateur })
      return NextResponse.json(result, { status: 201 })
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'write'
)
