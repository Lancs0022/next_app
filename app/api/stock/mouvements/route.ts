import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listStockMouvements } from '@/services/stock.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const data = await listStockMouvements({
      tenantId,
      id_lot: searchParams.get('id_lot') ?? undefined,
      source_type: searchParams.get('source_type') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      id_pdv: searchParams.get('id_pdv') ?? undefined,
      id_utilisateur: searchParams.get('id_utilisateur') ?? undefined,
      dateMin: searchParams.get('dateMin') ?? undefined,
      dateMax: searchParams.get('dateMax') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 500),
      page: Number(searchParams.get('page') ?? 1),
    })
    return NextResponse.json(data)
  },
  'STOCK',
  'read'
)
