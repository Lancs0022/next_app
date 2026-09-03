import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { cancelVente } from '@/services/ventes.service'

export const POST = withAuth(
  async (req, ctx, { user, tenantId }) => {
    const id_vente = Number(ctx.params?.id)
    if (!id_vente || !Number.isFinite(id_vente)) {
      return NextResponse.json({ error: 'ID de vente invalide' }, { status: 400 })
    }

    const body = await req.json()
    const raison = typeof body.raison === 'string' ? body.raison.trim() : ''
    if (!raison) {
      return NextResponse.json({ error: 'La raison d\'annulation est requise' }, { status: 400 })
    }

    // lignes est optionnel : si absent ou vide, cancelVente annule toutes les lignes
    const lignes = Array.isArray(body.lignes) ? body.lignes : undefined

    try {
      const result = await cancelVente({
        id_vente,
        raison_suppression: raison,
        lignes,
        user: { id_utilisateur: user.id_utilisateur, tenant_id: tenantId },
      })
      return NextResponse.json({ data: result.payload }, { status: result.status })
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
    }
  },
  'VENTES',
  'write'
)
