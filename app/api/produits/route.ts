import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listProduits, createProduit } from '@/services/produits.service'

export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const data = await listProduits(tenantId)
    return NextResponse.json(data)
  },
  'PRODUITS',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { tenantId }) => {
    const body = await req.json()
    const result = await createProduit({ body, tenantId })
    return NextResponse.json(result, { status: 201 })
  },
  'PRODUITS',
  'write'
)
