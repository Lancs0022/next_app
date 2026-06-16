import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listEncaissements, createEncaissement } from '@/services/encaissements.service'

export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const data = await listEncaissements(tenantId)
    return NextResponse.json(data)
  },
  'ENCAISSEMENTS',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { tenantId }) => {
    const body = await req.json()
    const result = await createEncaissement({ body, tenantId })
    return NextResponse.json(result, { status: 201 })
  },
  'ENCAISSEMENTS',
  'write'
)
