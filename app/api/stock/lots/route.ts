import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listLotsDisponibles } from '@/services/stock.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const data = await listLotsDisponibles({
      tenantId,
      id_collaborateur: searchParams.get('id_collaborateur') ?? undefined,
      id_point_vente: searchParams.get('id_point_vente') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 50),
    })
    return NextResponse.json(data)
  },
  'STOCK',
  'read'
)
