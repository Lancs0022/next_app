import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { updateProduit, deleteProduit } from '@/services/produits.service'

export const PUT = withAuth(
  async (req, ctx, { tenantId }) => {
    const id = Number(ctx.params.id)
    const body = await req.json()
    const result = await updateProduit({ id, body, tenantId })
    return NextResponse.json(result)
  },
  'PRODUITS',
  'write'
)

export const PATCH = withAuth(
  async (req, ctx, { tenantId }) => {
    const id = Number(ctx.params.id)
    const body = await req.json()
    const result = await updateProduit({ id, body, tenantId })
    return NextResponse.json(result)
  },
  'PRODUITS',
  'write'
)

export const DELETE = withAuth(
  async (_req, ctx, { tenantId }) => {
    const id = Number(ctx.params.id)
    await deleteProduit({ id, tenantId })
    return NextResponse.json({ message: 'Produit supprimé' })
  },
  'PRODUITS',
  'delete'
)
