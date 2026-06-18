import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { createStockAjustement } from '@/services/stock.service'

const MAX_BODY_SIZE = 1_048_576 // 1 Mo

export const POST = withAuth(
  async (req, _ctx, { user, tenantId }) => {
    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'Payload trop volumineux (max 1 Mo)' }, { status: 413 })
    }
    const body = await req.json()
    const result = await createStockAjustement({
      body,
      user: { id_utilisateur: user.id_utilisateur, tenant_id: tenantId },
    })
    return NextResponse.json(result.payload, { status: result.status })
  },
  'STOCK',
  'write'
)
