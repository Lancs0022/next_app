import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listCollaborateurs, createCollaborateur } from '@/services/collaborateurs.service'

export const GET = withAuth(
  async (req: NextRequest, _ctx, { tenantId }) => {
    const { searchParams } = req.nextUrl
    const data = await listCollaborateurs({
      tenantId,
      statut: searchParams.get('statut') ?? undefined,
    })
    return NextResponse.json(data)
  },
  'COLLABORATEURS',
  'read'
)

export const POST = withAuth(
  async (req: NextRequest, _ctx, { tenantId }) => {
    const body = await req.json()
    const result = await createCollaborateur({ body, tenantId })
    return NextResponse.json(result, { status: 201 })
  },
  'COLLABORATEURS',
  'write'
)
