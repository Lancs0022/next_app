import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listUnitesDeMesure, createUniteDeMesure } from '@/services/unitesDeMesure.service'
import { toErrorResponse } from '@/lib/errors'

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
      return toErrorResponse(e)
    }
  },
  'UNITES',
  'write'
)
