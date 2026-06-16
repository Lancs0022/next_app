import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listCommandes, createCommande } from '@/services/commandes.service'

export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const data = await listCommandes(tenantId)
    return NextResponse.json(data)
  },
  'COMMANDES',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { tenantId }) => {
    const body = await req.json()
    const result = await createCommande({ body, tenantId })
    return NextResponse.json(result, { status: 201 })
  },
  'COMMANDES',
  'write'
)
