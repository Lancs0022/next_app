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

    const result = await cancelVente({
      id_vente,
      raison_suppression: raison,
      user: { id_utilisateur: user.id_utilisateur, tenant_id: tenantId },
    })

    return NextResponse.json({ data: result.payload }, { status: result.status })
  },
  'VENTES',
  'write'
)