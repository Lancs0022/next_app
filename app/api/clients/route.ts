import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listClients, createClient } from '@/services/clients.service'

export const GET = withAuth(
  async (req, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const data = await listClients({
      tenantId,
      q: searchParams.get('q') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 200),
    })
    return NextResponse.json(data)
  },
  'VENTES',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { tenantId }) => {
    const body = await req.json()
    const result = await createClient({ body, tenantId })
    return NextResponse.json({ data: result }, { status: 201 })
  },
  'VENTES',
  'write'
)
