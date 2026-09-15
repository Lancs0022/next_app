import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { updateAbonnementStatut } from '@/services/abonnements.service'
import type { AbonnementStatut } from '@/services/abonnements.service'
import { toErrorResponse } from '@/lib/errors'

/**
 * PATCH /api/abonnements/:id/statut
 * Body: { statut: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' }
 *
 * Règles :
 *   INACTIVE → bloque les nouvelles souscriptions, ne touche pas aux existantes
 *   ARCHIVED → bloqué si des souscriptions ACTIVE existent
 */
export const PATCH = withAuth(
  async (req, ctx, { user, tenantId }) => {
    const id = Number(ctx.params?.id)
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const body = await req.json()
    const statut = body?.statut as AbonnementStatut | undefined
    const STATUTS: AbonnementStatut[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED']
    if (!statut || !STATUTS.includes(statut)) {
      return NextResponse.json(
        { error: `'statut' doit être parmi : ${STATUTS.join(', ')}` },
        { status: 400 }
      )
    }

    try {
      const result = await updateAbonnementStatut({
        id,
        tenantId,
        statut,
        userId: user.id_utilisateur,
      })
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'write'
)
