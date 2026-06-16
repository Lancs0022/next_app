import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listPointsDeVente, createPointDeVente } from '@/services/pointsDeVente.service'

export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const data = await listPointsDeVente(tenantId)
    return NextResponse.json(data)
  },
  'POINTS_DE_VENTE',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { tenantId }) => {
    const body = await req.json()
    const result = await createPointDeVente({ body, tenantId })
    return NextResponse.json(result, { status: 201 })
  },
  'POINTS_DE_VENTE',
  'write'
)
