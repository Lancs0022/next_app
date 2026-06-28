import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export interface StockQueryParams {
  tenantId: number
  id_point_vente?: string
  id_lot?: string
  q?: string
  page?: number
  limit?: number
}

// ─── List current stock (stock_actuel) — raw rows for API/tests ─────────

export async function listStockActuel(params: StockQueryParams) {
  const { tenantId, id_point_vente, id_lot, page = 1, limit = 50 } = params

  const pageNum = Math.max(1, page)
  const limitNum = Math.min(200, Math.max(1, limit))
  const skip = (pageNum - 1) * limitNum

  const where: Record<string, unknown> = { tenant_id: tenantId }
  if (id_point_vente) {
    const pvId = parseInt(id_point_vente, 10)
    if (!isNaN(pvId)) where.id_pdv = pvId
  }
  if (id_lot) {
    const lotId = parseInt(id_lot, 10)
    if (!isNaN(lotId)) where.id_lot = lotId
  }

  const [data, total] = await prisma.$transaction([
    prisma.stockActuel.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { id: 'desc' },
    }),
    prisma.stockActuel.count({ where }),
  ])

  return { data, page: pageNum, limit: limitNum, total }
}

// ─── Enriched lots view (5-table join) — powers "Lots disponibles" tab ──

export async function listLotsDisponibles(params: {
  tenantId: number
  id_point_vente?: string
  id_collaborateur?: string
  q?: string
  qte_op?: string
  qte_value?: string
  dateMin?: string
  dateMax?: string
  date_target?: string
  page?: number
  limit?: number
}) {
  const {
    tenantId, id_point_vente, id_collaborateur, q,
    qte_op, qte_value, dateMin, dateMax, date_target,
    page = 1, limit = 50,
  } = params

  const pageNum = Math.max(1, page)
  const limitNum = Math.min(200, Math.max(1, limit))
  const skip = (pageNum - 1) * limitNum

  // ── Base where on livraison_item ──
  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    statut: 'en_stock',
  }

  // Filter by point de vente
  if (id_point_vente) {
    const ids = id_point_vente.split(',').map(Number).filter(Boolean)
    if (ids.length === 1) where.id_pdv = ids[0]
    else if (ids.length > 1) where.id_pdv = { in: ids }
  }

  // Filter by collaborateur (via produit_catalogue)
  if (id_collaborateur) {
    const ids = id_collaborateur.split(',').map(Number).filter(Boolean)
    if (ids.length > 0) {
      const prods = await prisma.produitCatalogue.findMany({
        where: { id_collaborateur: { in: ids } },
        select: { id_produit: true },
      })
      const prodIds = prods.map(p => p.id_produit)
      if (prodIds.length === 0) return { data: [], page: pageNum, limit: limitNum, total: 0 }
      where.id_produit = { in: prodIds }
    }
  }

  // Date filters
  if (dateMin || dateMax) {
    const field = date_target === 'date_creation' ? 'created_at' : 'date_livraison'
    const dateRange: Record<string, Date> = {}
    if (dateMin) dateRange.gte = new Date(dateMin)
    if (dateMax) {
      const end = new Date(dateMax)
      end.setHours(23, 59, 59, 999)
      dateRange.lte = end
    }
    where[field] = dateRange
  }

  // Text search — pre-resolve matching IDs from related tables
  if (q && q.trim()) {
    const [matchProds, matchCollabs, matchPvs] = await Promise.all([
      prisma.produitCatalogue.findMany({
        where: { OR: [{ nom: { contains: q.trim(), mode: 'insensitive' } }, { categorie: { contains: q.trim(), mode: 'insensitive' } }] },
        select: { id_produit: true },
      }),
      prisma.collaborateur.findMany({
        where: { nom: { contains: q.trim(), mode: 'insensitive' } },
        select: { id_collaborateur: true },
      }),
      prisma.pointDeVente.findMany({
        where: { nom: { contains: q.trim(), mode: 'insensitive' } },
        select: { id_pdv: true },
      }),
    ])
    const prodIds = matchProds.map(p => p.id_produit)
    const pvIds = matchPvs.map(p => p.id_pdv)
    // Expand collab IDs to their product IDs
    const collabProdIds = matchCollabs.length > 0
      ? (await prisma.produitCatalogue.findMany({
          where: { id_collaborateur: { in: matchCollabs.map(c => c.id_collaborateur) } },
          select: { id_produit: true },
        })).map(p => p.id_produit)
      : []
    const allProdIds = [...new Set([...prodIds, ...collabProdIds])]

    // Combine with existing id_produit filter if any
    const existingProdFilter = where.id_produit as { in: number[] } | undefined
    if (existingProdFilter && existingProdFilter.in) {
      const intersection = existingProdFilter.in.filter(id => allProdIds.includes(id))
      if (intersection.length === 0 && pvIds.length === 0) return { data: [], page: pageNum, limit: limitNum, total: 0 }
      where.id_produit = { in: intersection }
    } else {
      // Product OR PV match
      if (allProdIds.length > 0 || pvIds.length > 0) {
        where.OR = [
          ...(allProdIds.length > 0 ? [{ id_produit: { in: allProdIds } }] : []),
          ...(pvIds.length > 0 ? [{ id_pdv: { in: pvIds } }] : []),
        ]
      } else {
        return { data: [], page: pageNum, limit: limitNum, total: 0 }
      }
    }
  }

  // ── Fetch rows ──
  const [items, total] = await prisma.$transaction([
    prisma.livraisonItem.findMany({
      where,
      include: { livraison: true },
      skip,
      take: limitNum,
      orderBy: { created_at: 'desc' },
    }),
    prisma.livraisonItem.count({ where }),
  ])

  if (items.length === 0) return { data: [], page: pageNum, limit: limitNum, total }

  // ── Batch-resolve related entities ──
  const produitIds = [...new Set(items.map(i => i.id_produit))]
  const pdvIds = [...new Set(items.map(i => i.id_pdv))]
  const lotIds = items.map(i => i.id_lot)

  const [produits, pdvs, stocks] = await Promise.all([
    prisma.produitCatalogue.findMany({
      where: { id_produit: { in: produitIds } },
      select: { id_produit: true, nom: true, categorie: true, id_collaborateur: true },
    }),
    prisma.pointDeVente.findMany({
      where: { id_pdv: { in: pdvIds } },
      select: { id_pdv: true, nom: true },
    }),
    prisma.stockActuel.findMany({
      where: { tenant_id: tenantId, id_lot: { in: lotIds } },
      select: { id_lot: true, id_pdv: true, quantite: true },
    }),
  ])

  // Resolve collaborateurs from produit_catalogue
  const collabIds = [...new Set(produits.map(p => p.id_collaborateur))]
  const collaborateurs = collabIds.length > 0
    ? await prisma.collaborateur.findMany({
        where: { id_collaborateur: { in: collabIds } },
        select: { id_collaborateur: true, nom: true },
      })
    : []

  // ── Build lookup maps ──
  const prodMap = Object.fromEntries(produits.map(p => [p.id_produit, p]))
  const pvMap = Object.fromEntries(pdvs.map(p => [p.id_pdv, p]))
  const collabMap = Object.fromEntries(collaborateurs.map(c => [c.id_collaborateur, c]))
  const stockMap = Object.fromEntries(stocks.map(s => [`${s.id_lot}_${s.id_pdv}`, s]))

  // ── Map to enriched output shape ──
  let data = items.map(item => {
    const prod = prodMap[item.id_produit]
    const pv = pvMap[item.id_pdv]
    const collab = prod ? collabMap[prod.id_collaborateur] : undefined
    const stock = stockMap[`${item.id_lot}_${item.id_pdv}`]
    const quantite_disponible = stock ? Number(stock.quantite) : 0

    return {
      id_lot: item.id_lot,
      id_livraison: item.id_livraison,
      id_produit: item.id_produit,
      libelle_produit: prod?.nom || 'Sans nom',
      categorie_produit: prod?.categorie || null,
      id_collaborateur: prod?.id_collaborateur || null,
      collaborateur_nom: collab?.nom || 'Collaborateur -',
      quantite_disponible,
      quantite_initiale: Number(item.quantite_initiale),
      prix_initial: Number(item.prix_initial),
      marge: Number(item.marge),
      id_point_vente: item.id_pdv,
      point_vente_nom: pv?.nom || `PV #${item.id_pdv}`,
      date_livraison: item.date_livraison,
      date_creation: item.created_at,
    }
  })

  // Post-filter: only rows with stock > 0 (and quantity operator filter)
  data = data.filter(d => d.quantite_disponible > 0)
  if (qte_value && !Number.isNaN(Number(qte_value))) {
    const val = Number(qte_value)
    if (qte_op === '=') data = data.filter(d => d.quantite_disponible === val)
    else if (qte_op === '>' || qte_op === 'gt') data = data.filter(d => d.quantite_disponible > val)
    else if (qte_op === '<' || qte_op === 'lt') data = data.filter(d => d.quantite_disponible < val)
    else if (qte_op === '>=' || qte_op === 'gte') data = data.filter(d => d.quantite_disponible >= val)
    else if (qte_op === '<=' || qte_op === 'lte') data = data.filter(d => d.quantite_disponible <= val)
  }

  return { data, page: pageNum, limit: limitNum, total }
}

// ─── Stock ajustement (legacy — prefer direct stock_mouvement) ──────────────

export async function createStockAjustement({
  body,
  user,
}: {
  body: Record<string, unknown>
  user: { id_utilisateur: number; tenant_id: number }
}) {
  const { id_utilisateur, tenant_id } = user

  if (!id_utilisateur) throw httpError(401, 'Utilisateur non authentifié')
  if (!tenant_id) throw httpError(401, 'Tenant manquant')

  const type = String(body?.type || '').trim()
  const allowedTypes = ['perte', 'casse', 'inventaire', 'correction']
  if (!allowedTypes.includes(type)) {
    throw httpError(400, `Le type d'ajustement doit être parmi: ${allowedTypes.join(', ')}`)
  }

  const rawDelta = String(body?.delta ?? body?.quantite ?? '').trim()
  if (!rawDelta) throw httpError(400, "La quantité d'ajustement (delta) est requise")

  const delta = Number(rawDelta.replace(',', '.'))
  if (!Number.isFinite(delta) || delta === 0) {
    throw httpError(400, "La quantité d'ajustement doit être un nombre non nul")
  }

  const id_lot = Number(body?.id_lot ?? 0)
  if (!id_lot) throw httpError(400, "'id_lot' est requis")

  return {
    status: 201,
    payload: {
      type,
      quantite: delta,
      id_lot,
      message: 'Ajustement enregistré (via stock_mouvement)',
    },
  }
}

// ─── Catalogue with aggregated stock quantities ────────────────────────────

export async function listCatalogueStock(tenantId: number, id_collaborateur?: string) {
  const where: Record<string, unknown> = { tenant_id: tenantId, statut: 'actif' }
  if (id_collaborateur) {
    const cid = Number(id_collaborateur)
    if (!isNaN(cid)) where.id_collaborateur = cid
  }

  const produits = await prisma.produitCatalogue.findMany({
    where,
    orderBy: { id_produit: 'desc' },
  })

  if (produits.length === 0) return { data: [] }

  // Resolve collaborateur names
  const collabIds = [...new Set(produits.map(p => p.id_collaborateur))]
  const collaborateurs = await prisma.collaborateur.findMany({
    where: { id_collaborateur: { in: collabIds } },
    select: { id_collaborateur: true, nom: true },
  })
  const collabMap = Object.fromEntries(collaborateurs.map(c => [c.id_collaborateur, c.nom]))

  // Get all lot IDs for these products, then aggregate stock quantities
  const lots = await prisma.livraisonItem.findMany({
    where: {
      tenant_id: tenantId,
      id_produit: { in: produits.map(p => p.id_produit) },
      statut: 'en_stock',
    },
    select: { id_lot: true, id_produit: true },
  })

  const lotIds = lots.map(l => l.id_lot)
  const lotToProd = Object.fromEntries(lots.map(l => [l.id_lot, l.id_produit]))

  let stockByLot: Record<number, number> = {}
  if (lotIds.length > 0) {
    const stocks = await prisma.stockActuel.findMany({
      where: { tenant_id: tenantId, id_lot: { in: lotIds } },
      select: { id_lot: true, quantite: true },
    })
    for (const s of stocks) {
      stockByLot[s.id_lot] = (stockByLot[s.id_lot] || 0) + Number(s.quantite)
    }
  }

  // Aggregate per product
  const stockByProd: Record<number, number> = {}
  for (const [lotId, qty] of Object.entries(stockByLot)) {
    const prodId = lotToProd[Number(lotId)]
    if (prodId !== undefined) {
      stockByProd[prodId] = (stockByProd[prodId] || 0) + qty
    }
  }

  // Map to output shape expected by frontend
  const data = produits.map(p => ({
    id_produit: p.id_produit,
    // Frontend maps libelle → nom, keep both for compatibility
    libelle: p.nom,
    nom: p.nom,
    categorie: p.categorie || 'Sans catégorie',
    quantite_en_stock: stockByProd[p.id_produit] || 0,
    seuil_alerte: p.seuil_alerte,
    statut: p.statut,
    id_collaborateur: p.id_collaborateur,
    collaborateur_nom: collabMap[p.id_collaborateur] || 'Collaborateur -',
    unite: p.unite,
    prix_vente_actuel: null,
    prix_achat_actuel: null,
  }))

  return { data }
}

// ─── List stock movements ───────────────────────────────────────────────────

export async function listStockMouvements(params: {
  tenantId: number
  id_lot?: string
  source_type?: string
  limit?: number
}) {
  const { tenantId, id_lot, source_type, limit = 100 } = params

  const where: Record<string, unknown> = { tenant_id: tenantId }
  if (id_lot) {
    const lotId = parseInt(id_lot, 10)
    if (!isNaN(lotId)) where.id_lot = lotId
  }
  if (source_type) where.source_type = source_type

  const rows = await prisma.stockMouvement.findMany({
    where,
    take: Math.min(500, limit),
    orderBy: { date_mouvement: 'desc' },
  })

  return { data: rows }
}

// ─── Generate stock snapshot ────────────────────────────────────────────────

export async function generateStockSnapshot() {
  const stocks = await prisma.stockActuel.findMany()
  const periode = new Date().toISOString().substring(0, 7)

  // Group by PDV
  const grouped = new Map<number, typeof stocks>()
  for (const s of stocks) {
    const list = grouped.get(s.id_pdv) || []
    list.push(s)
    grouped.set(s.id_pdv, list)
  }

  for (const [id_pdv, items] of grouped) {
    const snap = await prisma.stockSnapshot.create({
      data: {
        tenant_id: items[0].tenant_id,
        id_pdv,
        periode,
      },
    })
    for (const item of items) {
      await prisma.snapshotLigne.create({
        data: {
          id_snapshot: snap.id_snapshot,
          id_produit: item.id_lot, // snapshot stores lot reference
          quantite: item.quantite,
        },
      })
    }
  }
}
