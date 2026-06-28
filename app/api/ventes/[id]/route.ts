import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getVenteDetail } from '@/services/ventes.service'

export const GET = withAuth(
  async (req, ctx, { tenantId }) => {
    const id_vente = Number(ctx.params?.id)
    if (!id_vente || !Number.isFinite(id_vente)) {
      return NextResponse.json({ error: 'ID de vente invalide' }, { status: 400 })
    }
    const data = await getVenteDetail(id_vente, tenantId)
    return NextResponse.json({ data })
  },
  'VENTES',
  'read'
)
