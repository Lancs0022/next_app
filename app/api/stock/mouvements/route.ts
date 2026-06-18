import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listStockMouvements } from '@/services/stock.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const data = await listStockMouvements({
      tenantId,
      id_lot: searchParams.get('id_lot') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 100),
    })
    return NextResponse.json(data)
  },
  'STOCK',
  'read'
)
