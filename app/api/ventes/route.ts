import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listVentes, createVenteDirecte } from '@/services/ventes.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const data = await listVentes({
      tenantId,
      id_point_vente: searchParams.get('id_point_vente') ?? undefined,
      statut: searchParams.get('statut') ?? undefined,
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 50),
    })
    return NextResponse.json(data)
  },
  'VENTES',
  'read'
)

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
