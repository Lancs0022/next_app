import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getSouscription } from '@/services/abonnements.service'
import { toErrorResponse } from '@/lib/errors'

/** GET /api/souscriptions-abonnements/:id — détail complet avec échéances et paiements */
export const GET = withAuth(
  async (_req, ctx, { tenantId }) => {
    const id = Number(ctx.params?.id)
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }
    try {
      const result = await getSouscription(id, tenantId)
      return NextResponse.json(result)
    } catch (e: unknown) {
      return toErrorResponse(e)
    }
  },
  'ABO',
  'read'
)
