import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { updateSouscriptionStatut } from '@/services/abonnements.service'
import type { SouscriptionStatut } from '@/services/abonnements.service'
import { toErrorResponse } from '@/lib/errors'

/**
 * PATCH /api/souscriptions-abonnements/:id/statut
 * Body: { statut: 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE' }
 *
 * TERMINEE : date_fin = aujourd'hui, renouvellement_auto = false
 * ANNULEE  : canceled_at = maintenant (annulation non-destructive)
 */
export const PATCH = withAuth(
  async (req, ctx, { user, tenantId }) => {
    const id = Number(ctx.params?.id)
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    const body = await req.json()
    const statut = body?.statut as SouscriptionStatut | undefined
    const STATUTS: SouscriptionStatut[] = ['ACTIVE', 'SUSPENDUE', 'TERMINEE', 'ANNULEE']
    if (!statut || !STATUTS.includes(statut)) {
      return NextResponse.json(
        { error: `'statut' doit être parmi : ${STATUTS.join(', ')}` },
        { status: 400 }
      )
    }
    try {
      const result = await updateSouscriptionStatut({ id, tenantId, statut, userId: user.id_utilisateur })
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'write'
)
