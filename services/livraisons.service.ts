import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

// ─── List livraisons (enriched, paginated) ───────────────────────────────────

export async function listLivraisons(
  tenantId: number,
  params?: Record<string, unknown>
) {
  const page = Math.max(1, Number(params?.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(params?.limit) || 20))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { tenant_id: tenantId }

  // Text search on reference or commentaire
  if (params?.q && String(params.q).trim()) {
    const q = String(params.q).trim()
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { commentaire: { contains: q, mode: 'insensitive' } },
    ]
  }

  // Filter by point de vente
  if (params?.id_point_vente) {
    const pvId = Number(params.id_point_vente)
    if (!isNaN(pvId)) where.id_pdv = pvId
  }

  // Filter by collaborateur
  if (params?.id_collaborateur) {
    const cId = Number(params.id_collaborateur)
    if (!isNaN(cId)) where.id_collaborateur = cId
  }

  // Date range filter
  if (params?.dateMin || params?.dateMax) {
    const dateFilter: Record<string, Date> = {}
    if (params?.dateMin) dateFilter.gte = new Date(String(params.dateMin))
    if (params?.dateMax) dateFilter.lte = new Date(String(params.dateMax) + 'T23:59:59')
    where.date_livraison = dateFilter
  }

  const [rows, total] = await prisma.$transaction([
    prisma.livraison.findMany({
      where,
      include: { items: true },
      orderBy: { date_livraison: 'desc' },
      skip,
      take: limit,
    }),
    prisma.livraison.count({ where }),
  ])

  // Enrich with collaborateur / point_de_vente names
  const collabIds = [...new Set(rows.map(r => r.id_collaborateur))]
  const pvIds = [...new Set(rows.map(r => r.id_pdv))]

  const [collabs, pvs] = await Promise.all([
    prisma.collaborateur.findMany({
      where: { id_collaborateur: { in: collabIds }, tenant_id: tenantId },
      select: { id_collaborateur: true, nom: true, prenom: true },
    }),
    prisma.pointDeVente.findMany({
      where: { id_pdv: { in: pvIds }, tenant_id: tenantId },
      select: { id_pdv: true, nom: true },
    }),
  ])

  const collabMap = new Map(collabs.map(c => [c.id_collaborateur, `${c.prenom || ''} ${c.nom}`.trim()]))
  const pvMap = new Map(pvs.map(p => [p.id_pdv, p.nom]))

  const items = rows.map(r => ({
    id_livraison: r.id_livraison,
    date_livraison: r.date_livraison,
    id_collaborateur: r.id_collaborateur,
    collaborateur_nom: collabMap.get(r.id_collaborateur) || `Collab #${r.id_collaborateur}`,
    id_point_vente: r.id_pdv,
    point_vente_nom: pvMap.get(r.id_pdv) || `PV #${r.id_pdv}`,
    reference: r.reference,
    commentaire: r.commentaire,
    nb_lots: r.items.length,
    quantite_totale: r.items.reduce((sum, it) => sum + Number(it.quantite_initiale ?? 0), 0),
    created_at: r.created_at,
  }))

  const totalPages = Math.ceil(total / limit)
  return { items, page, limit, total, totalPages }
}

// ─── Create livraison (header + lines) ──────────────────────────────────────

export async function createLivraison({
  body,
  tenantId,
  userId,
}: {
  body: Record<string, unknown>
  tenantId: number
  userId?: number
}) {
  const id_pdv = Number(body?.id_pdv ?? body?.id_point_vente)
  const id_collaborateur = Number(body?.id_collaborateur)
  if (!id_pdv) throw httpError(400, "'id_pdv' est requis")
  if (!id_collaborateur) throw httpError(400, "'id_collaborateur' est requis")

  const client_uuid = body?.client_uuid ? String(body.client_uuid) : null

  if (client_uuid) {
    const existing = await prisma.livraison.findFirst({
      where: { tenant_id: tenantId, client_uuid },
      include: { items: true },
    })
    if (existing) {
      return existing
    }
  }

  const lignes = Array.isArray(body?.lines)
    ? (body.lines as Array<Record<string, unknown>>)
    : Array.isArray(body?.lignes)
      ? (body.lignes as Array<Record<string, unknown>>)
      : []

  if (lignes.length === 0) throw httpError(400, 'Au moins une ligne de livraison est requise')

  const date_livraison = body?.date_livraison
    ? new Date(String(body.date_livraison))
    : new Date()

  const livraison = await prisma.$transaction(async (tx) => {
    const header = await tx.livraison.create({
      data: {
        tenant_id: tenantId,
        id_collaborateur,
        id_pdv,
        client_uuid,
        date_livraison,
        reference: body?.reference ? String(body.reference) : null,
        commentaire: body?.commentaire ? String(body.commentaire) : null,
      },
    })

    // 2. Create lines (LivraisonItem) + StockActuel + StockMouvement

    // Pré-charger les unités de mesure pour toutes les lignes en un seul appel
    const produitIds = lignes.map(l => Number(l.id_produit)).filter(Boolean)
    const produitUnites = await tx.produitCatalogue.findMany({
      where: { id_produit: { in: produitIds } },
      select: { id_produit: true, nom: true, unite_mesure: { select: { code: true, est_decimal: true } } },
    })
    const uniteByProduit = new Map(produitUnites.map(p => [p.id_produit, p]))

    for (const l of lignes) {
      const id_produit = Number(l.id_produit)
      const quantite_initiale = Number(l.quantite_initiale ?? l.quantite ?? 0)
      const prix_initial = Number(l.prix_initial ?? l.prix_unitaire ?? 0)
      const marge = Number(l.marge ?? 0)

      if (!id_produit) throw httpError(400, 'Chaque ligne doit avoir un id_produit')
      if (!quantite_initiale || quantite_initiale <= 0) {
        throw httpError(400, 'quantite_initiale doit être > 0')
      }

      // ── GARDE-FOU UNITÉ ENTIÈRE ──────────────────────────────────────────────
      const produitInfo = uniteByProduit.get(id_produit)
      if (produitInfo?.unite_mesure && !produitInfo.unite_mesure.est_decimal) {
        if (!Number.isInteger(quantite_initiale)) {
          throw httpError(
            400,
            `Quantité décimale (${quantite_initiale}) invalide pour "${produitInfo.nom}" ` +
            `dont l'unité "${produitInfo.unite_mesure.code}" n'accepte que des entiers`
          )
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Create LivraisonItem
      const item = await tx.livraisonItem.create({
        data: {
          tenant_id: tenantId,
          id_produit,
          id_livraison: header.id_livraison,
          id_pdv,
          prix_initial,
          marge,
          quantite_initiale,
          date_livraison,
          created_by: userId ?? null,
        },
      })

      // Create StockActuel entry
      await tx.stockActuel.create({
        data: {
          tenant_id: tenantId,
          id_lot: item.id_lot,
          id_pdv,
          quantite: quantite_initiale,
          created_by: userId ?? null,
        },
      })

      // Create StockMouvement (entree)
      await tx.stockMouvement.create({
        data: {
          tenant_id: tenantId,
          id_lot: item.id_lot,
          type: 'entree',
          quantite: quantite_initiale,
          before_qty: 0,
          after_qty: quantite_initiale,
          source_type: 'LIVRAISON',
          source_id: header.id_livraison,
          created_by: userId ?? null,
        },
      })
    }

    return header
  })

  return livraison
}
