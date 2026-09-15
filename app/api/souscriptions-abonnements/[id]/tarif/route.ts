import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { updateSouscriptionTarif } from '@/services/abonnements.service'
import { toErrorResponse } from '@/lib/errors'

/**
 * PATCH /api/souscriptions-abonnements/:id/tarif
 * Body: { montant: number }
 *
 * Le nouveau tarif s'applique aux futures échéances uniquement.
 * Les échéances et paiements existants restent intacts.
 */
export const PATCH = withAuth(
  async (req, ctx, { user, tenantId }) => {
    const id = Number(ctx.params?.id)
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    const body = await req.json()
    const montant = Number(body?.montant)
    if (!montant || montant <= 0) {
      return NextResponse.json({ error: "'montant' doit être > 0" }, { status: 400 })
    }
    try {
      const result = await updateSouscriptionTarif({ id, tenantId, montant, userId: user.id_utilisateur })
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'write'
)
