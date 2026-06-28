import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { createVenteDirecte } from '@/services/ventes.service'

export const POST = withAuth(
  async (req, _ctx, { user, tenantId }) => {
    const body = await req.json()
    const result = await createVenteDirecte({
      body,
      user: { id_utilisateur: user.id_utilisateur, tenant_id: tenantId },
    })
    return NextResponse.json(result.payload, { status: result.status })
  },
  'VENTES',
  'write'
)
