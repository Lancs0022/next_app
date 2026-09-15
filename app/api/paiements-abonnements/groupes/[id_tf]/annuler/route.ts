import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { cancelPaiementGroupe } from '@/services/abonnements.service'
import { toErrorResponse } from '@/lib/errors'

/**
 * POST /api/paiements-abonnements/groupes/:id_tf/annuler
 *
 * Annule toutes les lignes PaiementAbonnement du groupe identifié par id_transaction_financiere.
 *
 * Règles :
 *   - Annule atomiquement toutes les lignes du groupe
 *   - Crée une seule TransactionFinanciere(OUT) compensatoire
 *   - La TF IN d'origine est conservée intacte
 *   - L'annulation partielle de groupe est rejetée (hors scope V1)
 *   - Une seconde tentative d'annulation est rejetée (409)
 */
export const POST = withAuth(
  async (_req, ctx, { user, tenantId }) => {
    const id_transaction_financiere = Number(ctx.params?.id_tf)
    if (!id_transaction_financiere || !Number.isFinite(id_transaction_financiere)) {
      return NextResponse.json({ error: 'id_tf invalide' }, { status: 400 })
    }
    try {
      const result = await cancelPaiementGroupe({
        id_transaction_financiere,
        tenantId,
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
