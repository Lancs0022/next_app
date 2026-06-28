import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listLivraisons, createLivraison } from '@/services/livraisons.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const data = await listLivraisons(tenantId, params)
    return NextResponse.json(data)
  },
  'LIVRAISONS',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { user, tenantId }) => {
    const body = await req.json()
    const result = await createLivraison({ body, tenantId, userId: user.id_utilisateur })
    return NextResponse.json(result, { status: 201 })
  },
  'LIVRAISONS',
  'write'
)
