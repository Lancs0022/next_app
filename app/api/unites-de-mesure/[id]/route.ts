import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { updateUniteDeMesure, deleteUniteDeMesure } from '@/services/unitesDeMesure.service'
import { toErrorResponse } from '@/lib/errors'

export const PUT = withAuth(
  async (req: NextRequest, ctx, { tenantId }) => {
    try {
      const id = Number((ctx?.params as Record<string, string>)?.id)
      if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
      const body = await req.json()
      const result = await updateUniteDeMesure({ id, body, tenantId })
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'UNITES',
  'write'
)

export const DELETE = withAuth(
  async (_req, ctx, { tenantId }) => {
    try {
      const id = Number((ctx?.params as Record<string, string>)?.id)
      if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
      const result = await deleteUniteDeMesure({ id, tenantId })
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'UNITES',
  'write'
)
