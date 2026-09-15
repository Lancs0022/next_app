import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/lib/errors'
import { withAuth } from '@/lib/auth'
import { listSouscriptions, createSouscription } from '@/services/abonnements.service'
import type { SouscriptionStatut } from '@/services/abonnements.service'

/**
 * GET /api/souscriptions-abonnements
 * Query params: statut? = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE'
 */
export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const statutParam = searchParams.get('statut') as SouscriptionStatut | null

    const STATUTS: SouscriptionStatut[] = ['ACTIVE', 'SUSPENDUE', 'TERMINEE', 'ANNULEE']
    const statut = statutParam && STATUTS.includes(statutParam) ? statutParam : undefined

    const result = await listSouscriptions({ tenantId, statut })
    return NextResponse.json(result)
  },
  'ABO',
  'read'
)

/**
 * POST /api/souscriptions-abonnements
 * Body: { id_abonnement, id_collaborateur, montant, date_debut, date_fin?, renouvellement_auto? }
 *
 * Règles :
 *   - L'offre doit être ACTIVE (statut INACTIVE ou ARCHIVED → 409)
 *   - montant est le tarif applicable au collaborateur (peut différer du catalogue)
 *   - La création ne modifie jamais les souscriptions ou échéances existantes
 */
export const POST = withAuth(
  async (req, _ctx, { user, tenantId }) => {
    const body = await req.json()
    try {
      const result = await createSouscription({ body, tenantId, userId: user.id_utilisateur })
      return NextResponse.json(result, { status: 201 })
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'write'
)
