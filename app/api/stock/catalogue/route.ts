import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listCatalogueStock } from '@/services/stock.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const idCollaborateur = req.nextUrl.searchParams.get('id_collaborateur') || undefined
    const data = await listCatalogueStock(tenantId, idCollaborateur)
    return NextResponse.json(data)
  },
  'STOCK',
  'read'
)
