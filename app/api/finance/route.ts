import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listTransactions, createTransaction } from '@/services/finance.service'

export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const data = await listTransactions(tenantId)
    return NextResponse.json(data)
  },
  'FINANCE',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { user, tenantId }) => {
    const body = await req.json()
    const result = await createTransaction({
      body,
      user: { id_utilisateur: user.id_utilisateur, tenant_id: tenantId },
    })
    return NextResponse.json(result, { status: 201 })
  },
  'FINANCE',
  'write'
)
