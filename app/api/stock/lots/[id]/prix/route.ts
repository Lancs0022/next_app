import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { updateLotPrixMarge } from '@/services/stock.service'

export const PATCH = withAuth(
  async (req, ctx, { user, tenantId }) => {
    const idLot = Number(ctx.params?.id)
    const body = await req.json()
    const result = await updateLotPrixMarge({
      idLot,
      body,
      user: { id_utilisateur: user.id_utilisateur, tenant_id: tenantId },
    })
    return NextResponse.json(result.payload, { status: result.status })
  },
  'STOCK',
  'write'
)
