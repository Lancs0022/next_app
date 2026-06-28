import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listVentesAtomiques } from '@/services/ventes.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const data = await listVentesAtomiques({
      tenantId,
      q: searchParams.get('q') ?? undefined,
      id_point_vente: searchParams.get('id_point_vente') ?? undefined,
      id_collaborateur: searchParams.get('id_collaborateur') ?? undefined,
      statut: searchParams.get('statut') ?? undefined,
      dateMin: searchParams.get('dateMin') ?? undefined,
      dateMax: searchParams.get('dateMax') ?? undefined,
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
    })
    return NextResponse.json(data)
  },
  'VENTES',
  'read'
)
