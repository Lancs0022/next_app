import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listCatalogueStock } from '@/services/stock.service'

export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const data = await listCatalogueStock(tenantId)
    return NextResponse.json(data)
  },
  'STOCK',
  'read'
)
