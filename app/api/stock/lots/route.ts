import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listLotsDisponibles } from '@/services/stock.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const data = await listLotsDisponibles({
      tenantId,
      id_point_vente: searchParams.get('id_point_vente') ?? undefined,
      id_collaborateur: searchParams.get('id_collaborateur') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      qte_op: searchParams.get('qte_op') ?? undefined,
      qte_value: searchParams.get('qte_value') ?? undefined,
      dateMin: searchParams.get('dateMin') ?? undefined,
      dateMax: searchParams.get('dateMax') ?? undefined,
      date_target: searchParams.get('date_target') ?? undefined,
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 50),
    })
    return NextResponse.json(data)
  },
  'STOCK',
  'read'
)
