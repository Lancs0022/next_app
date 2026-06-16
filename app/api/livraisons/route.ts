import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listLivraisons, createLivraison } from '@/services/livraisons.service'

export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const data = await listLivraisons(tenantId)
    return NextResponse.json(data)
  },
  'LIVRAISONS',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { tenantId }) => {
    const body = await req.json()
    const result = await createLivraison({ body, tenantId })
    return NextResponse.json(result, { status: 201 })
  },
  'LIVRAISONS',
  'write'
)
