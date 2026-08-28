import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listUnitesDeMesure, createUniteDeMesure, httpError } from '@/services/unitesDeMesure.service'

export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const data = await listUnitesDeMesure(tenantId)
    return NextResponse.json(data)
  },
  'UNITES',
  'read'
)

export const POST = withAuth(
  async (req, _ctx, { tenantId }) => {
    try {
      const body = await req.json()
      const result = await createUniteDeMesure({ body, tenantId })
      return NextResponse.json(result, { status: 201 })
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
    }
  },
  'UNITES',
  'write'
)
