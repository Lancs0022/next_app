import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listAbonnements, createAbonnement } from '@/services/abonnements.service'

/** GET /api/abonnements — liste toutes les offres du tenant */
export const GET = withAuth(
  async (_req, _ctx, { tenantId }) => {
    const result = await listAbonnements(tenantId)
    return NextResponse.json(result)
  },
  'ABO',
  'read'
)

/** POST /api/abonnements — crée une nouvelle offre */
export const POST = withAuth(
  async (req, _ctx, { user, tenantId }) => {
    const body = await req.json()
    const result = await createAbonnement({ body, tenantId, userId: user.id_utilisateur })
    return NextResponse.json(result, { status: 201 })
  },
  'ABO',
  'write'
)
