import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const GET = withAuth(
  async (req, context, { user, tenantId }) => {
    // Extract id from context.params
    const { id } = context.params
    const lotId = Number(id)
    if (!lotId || !Number.isFinite(lotId)) {
      return NextResponse.json({ error: 'ID de lot invalide' }, { status: 400 })
    }

    // Optional pdvId filter from query string
    const { searchParams } = req.nextUrl
    const id_pdv = searchParams.get('id_pdv')
    const pdvId = id_pdv ? Number(id_pdv) : undefined
    if (id_pdv && (!pdvId || !Number.isFinite(pdvId))) {
      return NextResponse.json({ error: 'ID de point de vente invalide' }, { status: 400 })
    }

    try {
      // Build where clause — stock_mouvement n'a pas de colonne id_pdv,
      // le filtrage par PdV passe par le lot lui-même.
      const where: Record<string, unknown> = {
        tenant_id: tenantId,
        id_lot: lotId,
      }
      // Note: id_pdv ignoré intentionnellement — non présent dans stock_mouvement

      const mouvements = await prisma.stockMouvement.findMany({
        where,
        orderBy: { date_mouvement: 'desc' },
        select: {
          id_stock_mouvement: true,
          type: true,
          quantite: true,
          before_qty: true,
          after_qty: true,
          source_type: true,
          source_id: true,
          date_mouvement: true,
          created_by: true,
        },
      })

      // Resolve created_by names
      const userIdsSet = new Set(
        mouvements
          .map(m => m.created_by)
          .filter((id): id is number => id != null)
      )
      const userIds = Array.from(userIdsSet)
      const users = await prisma.utilisateur.findMany({
        where: { id_utilisateur: { in: userIds } },
        select: { id_utilisateur: true, nom: true, prenom: true },
      })
      const userMap = Object.fromEntries(users.map(u => [u.id_utilisateur, `${u.prenom ? u.prenom + ' ' : ''}${u.nom}`]))

      const data = mouvements.map(m => ({
        id: m.id_stock_mouvement,
        type: m.type,
        quantite: Number(m.quantite),
        beforeQty: m.before_qty ? Number(m.before_qty) : null,
        afterQty: m.after_qty ? Number(m.after_qty) : null,
        sourceType: m.source_type,
        sourceId: m.source_id,
        dateMouvement: m.date_mouvement,
        createdBy: m.created_by ? userMap[m.created_by] || null : null,
      }))

      return NextResponse.json({ data })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Erreur interne du serveur' }, { status: error.status || 500 })
    }
  },
  'STOCK',
  'read'
)