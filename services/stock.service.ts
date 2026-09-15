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
  id_produit?: string
  id_point_vente?: string
  id_collaborateur?: string
  q?: string
  qte_op?: string
  qte_value?: string
  dateMin?: string
  dateMax?: string
  date_target?: string
  /** 'tous' pour inclure les lots épuisés, omis = seulement en_stock */
  statut?: string
  page?: number
  limit?: number
}) {
  const {
    tenantId, id_produit, id_point_vente, id_collaborateur, q,
    qte_op, qte_value, dateMin, dateMax, date_target, statut,
    page = 1, limit = 50,
  } = params

  const pageNum = Math.max(1, page)
  const limitNum = Math.min(500, Math.max(1, limit))
  const skip = (pageNum - 1) * limitNum

  // ── Base where on livraison_item ──
  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    // 'tous' = pas de filtre statut (dispo + épuisés)
    ...(statut !== 'tous' ? { statut: 'en_stock' } : {}),
  }

  // Filter by point de vente
  if (id_point_vente) {
    const ids = id_point_vente.split(',').map(Number).filter(Boolean)
    if (ids.length === 1) where.id_pdv = ids[0]
    else if (ids.length > 1) where.id_pdv = { in: ids }
  }

  if (id_produit) {
    const productId = Number(id_produit)
    if (!Number.isNaN(productId)) where.id_produit = productId
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

  const [produits, pdvs, stocks, mouvements] = await Promise.all([
    prisma.produitCatalogue.findMany({
      where: { id_produit: { in: produitIds } },
      select: {
        id_produit: true,
        nom: true,
        description: true,
        categorie: true,
        id_collaborateur: true,
        id_unite: true,
        created_at: true,
        created_by: true,
      },
    }),
    prisma.pointDeVente.findMany({
      where: { id_pdv: { in: pdvIds } },
      select: { id_pdv: true, nom: true, ville: true },
    }),
    prisma.stockActuel.findMany({
      where: { tenant_id: tenantId, id_lot: { in: lotIds } },
      select: { id_lot: true, id_pdv: true, quantite: true },
    }),
    // NEW: Fetch stock movements to calculate physical quantity sold
    prisma.stockMouvement.findMany({
      where: {
        tenant_id: tenantId,
        id_lot: { in: lotIds },
        OR: [
          { type: 'sortie', source_type: 'VENTE' },
          { type: 'annulation_vente', source_type: 'VENTE' },
        ],
      },
      select: { id_lot: true, type: true, quantite: true },
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

  // Resolve unités de mesure (batch — une requête pour tous les lots)
  const uniteIds = [...new Set(produits.map(p => p.id_unite).filter((id): id is number => id != null))]
  const unites = uniteIds.length > 0
    ? await prisma.uniteDeMesure.findMany({
        where: { id_unite: { in: uniteIds } },
        select: { id_unite: true, code: true, label: true, est_decimal: true, precision: true },
      })
    : []
  const uniteMap = Object.fromEntries(unites.map(u => [u.id_unite, u]))

  const userIds = [
    ...new Set([
      ...produits.map(p => p.created_by).filter((id): id is number => id != null),
      ...items.map(i => i.created_by).filter((id): id is number => id != null),
    ]),
  ]
  const utilisateurs = userIds.length > 0
    ? await prisma.utilisateur.findMany({
        where: { id_utilisateur: { in: userIds } },
        select: { id_utilisateur: true, nom: true, prenom: true },
      })
    : []

  // ── Build lookup maps ──
  const prodMap = Object.fromEntries(produits.map(p => [p.id_produit, p]))
  const pvMap = Object.fromEntries(pdvs.map(p => [p.id_pdv, p]))
  const collabMap = Object.fromEntries(collaborateurs.map(c => [c.id_collaborateur, c]))
  const userMap = Object.fromEntries(utilisateurs.map(u => [u.id_utilisateur, [u.prenom, u.nom].filter(Boolean).join(' ') || u.nom]))
  const stockMap = Object.fromEntries(stocks.map(s => [`${s.id_lot}_${s.id_pdv}`, s]))

  // NEW: Calculate quantity sold per lot (ventes - annulations)
  const quantiteVendueMap: Record<number, number> = {}
  const chiffreAffairesMap: Record<number, number> = {}
  const beneficeMap: Record<number, number> = {}
  const lotSaleRecords = await prisma.venteArticle.findMany({
    where: {
      tenant_id: tenantId,
      id_lot: { in: lotIds },
    },
    select: {
      id_lot: true,
      quantite_vendue: true,
      prix_initial: true,
      marge: true,
    },
  })

  mouvements.forEach(m => {
    if (!quantiteVendueMap[m.id_lot]) quantiteVendueMap[m.id_lot] = 0
    const qty = Number(m.quantite) || 0
    if (m.type === 'sortie') quantiteVendueMap[m.id_lot] += qty
    else if (m.type === 'annulation_vente') quantiteVendueMap[m.id_lot] -= qty
  })

  lotSaleRecords.forEach((article) => {
    const qty = Number(article.quantite_vendue || 0)
    const prix = Number(article.prix_initial || 0)
    const marge = Number(article.marge || 0)
    chiffreAffairesMap[article.id_lot] = (chiffreAffairesMap[article.id_lot] ?? 0) + qty * (prix + marge)
    beneficeMap[article.id_lot] = (beneficeMap[article.id_lot] ?? 0) + qty * marge
  })

  // ── Map to enriched output shape ──
  let data = items.map(item => {
    const itemWithLegacyFields = item as typeof item & { ventes_fermees?: number }
    const prod = prodMap[item.id_produit]
    const pv = pvMap[item.id_pdv]
    const collab = prod ? collabMap[prod.id_collaborateur] : undefined
    const stock = stockMap[`${item.id_lot}_${item.id_pdv}`]
    const quantite_disponible = stock ? Number(stock.quantite) : 0
    const quantite_vendue = quantiteVendueMap[item.id_lot] ?? 0
    const prixInitial = Number(item.prix_initial)
    const marge = Number(item.marge)
    const unite = prod?.id_unite ? uniteMap[prod.id_unite] : undefined

    return {
      id_lot: item.id_lot,
      id_livraison: item.id_livraison,
      id_produit: item.id_produit,
      libelle_produit: prod?.nom || 'Sans nom',
      categorie_produit: prod?.categorie || null,
      description_produit: prod?.description || null,
      produit_created_at: prod?.created_at || null,
      produit_created_by: prod?.created_by || null,
      produit_createur_nom: prod?.created_by ? userMap[prod.created_by] || null : null,
      id_collaborateur: prod?.id_collaborateur || null,
      collaborateur_nom: collab?.nom || 'Collaborateur -',
      id_unite: prod?.id_unite || null,
      unite_code: unite?.code || null,
      unite_label: unite?.label || null,
      est_decimal: unite?.est_decimal ?? false,
      precision: unite?.precision ?? 0,
      quantite_disponible,
      quantite_vendue, // NEW: quantity sold (calculated from stock_mouvement)
      quantite_initiale: Number(item.quantite_initiale),
      prix_initial: prixInitial,
      marge,
      ventes_fermees: Number(itemWithLegacyFields.ventes_fermees || 0),
      chiffre_affaires: Number(chiffreAffairesMap[item.id_lot] ?? (quantite_vendue * (prixInitial + marge))),
      benefice: Number(beneficeMap[item.id_lot] ?? (quantite_vendue * marge)),
      id_point_vente: item.id_pdv,
      point_vente_nom: pv?.nom || `PV #${item.id_pdv}`,
      point_vente_ville: pv?.ville || null,
      date_livraison: item.date_livraison,
      date_creation: item.created_at,
      created_by: item.created_by,
      created_by_nom: item.created_by ? userMap[item.created_by] || null : null,
      livraison_created_at: item.livraison.created_at,
      livraison_commentaire: item.livraison.commentaire,
    }
  })

  // Post-filter: only rows with stock > 0 sauf si statut='tous'
  if (statut !== 'tous') {
    data = data.filter(d => d.quantite_disponible > 0)
  }
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

  const date_ajustement = body?.date_ajustement ? new Date(String(body.date_ajustement)) : new Date()
  const motif = body?.motif ? String(body.motif) : null

  const payload = await prisma.$transaction(async tx => {
    const lot = await tx.livraisonItem.findFirst({
      where: { tenant_id, id_lot },
      select: { id_lot: true, id_pdv: true },
    })
    if (!lot) throw httpError(404, 'Lot introuvable')

    const stock = await tx.stockActuel.findFirst({
      where: { tenant_id, id_lot, id_pdv: lot.id_pdv },
    })
    const beforeQty = stock ? Number(stock.quantite) : 0
    const afterQty = beforeQty + delta
    if (afterQty < 0) throw httpError(400, "L'ajustement rendrait le stock négatif")

    const ajustement = await tx.stockAjustement.create({
      data: {
        id_lot,
        id_utilisateur,
        type,
        quantite: delta,
        motif,
        date_ajustement,
        statut: 'valide',
        created_by: id_utilisateur,
      },
    })

    await tx.stockMouvement.create({
      data: {
        tenant_id,
        id_lot,
        type: 'ajustement',
        quantite: delta,
        before_qty: beforeQty,
        after_qty: afterQty,
        source_type: 'AJUSTEMENT',
        source_id: ajustement.id_stock_ajustement,
        date_mouvement: date_ajustement,
        created_by: id_utilisateur,
      },
    })

    if (stock) {
      await tx.stockActuel.update({
        where: { id: stock.id },
        data: { quantite: afterQty },
      })
    } else {
      await tx.stockActuel.create({
        data: {
          tenant_id,
          id_lot,
          id_pdv: lot.id_pdv,
          quantite: afterQty,
          quantite_reservee: 0,
          created_by: id_utilisateur,
        },
      })
    }

    return ajustement
  })

  return { status: 201, payload }
}

export async function createStockTransfert({
  body,
  user,
}: {
  body: Record<string, unknown>
  user: { id_utilisateur: number; tenant_id: number }
}) {
  const { id_utilisateur, tenant_id } = user
  const id_lot = Number(body?.id_lot ?? 0)
  const id_point_vente_source = Number(body?.id_point_vente_source ?? body?.id_pdv_source ?? 0)
  const id_point_vente_destination = Number(body?.id_point_vente_destination ?? body?.id_pdv_destination ?? 0)
  const quantite = Number(String(body?.quantite ?? '').replace(',', '.'))
  const commentaire = body?.commentaire ? String(body.commentaire) : null

  if (!id_lot) throw httpError(400, "'id_lot' est requis")
  if (!id_point_vente_source) throw httpError(400, "'id_point_vente_source' est requis")
  if (!id_point_vente_destination) throw httpError(400, "'id_point_vente_destination' est requis")
  if (id_point_vente_source === id_point_vente_destination) {
    throw httpError(400, 'Le point de vente destination doit être différent de la source')
  }
  if (!Number.isFinite(quantite) || quantite <= 0) {
    throw httpError(400, 'La quantité transférée doit être un nombre positif')
  }

  const payload = await prisma.$transaction(async tx => {
    const sourceStock = await tx.stockActuel.findFirst({
      where: { tenant_id, id_lot, id_pdv: id_point_vente_source },
    })
    const sourceBefore = sourceStock ? Number(sourceStock.quantite) : 0
    if (sourceBefore < quantite) throw httpError(400, 'Stock source insuffisant pour ce transfert')

    const destinationStock = await tx.stockActuel.findFirst({
      where: { tenant_id, id_lot, id_pdv: id_point_vente_destination },
    })
    const destinationBefore = destinationStock ? Number(destinationStock.quantite) : 0

    const transfert = await tx.stockTransfert.create({
      data: {
        id_point_vente_source,
        id_point_vente_destination,
        id_utilisateur,
        commentaire,
        created_by: id_utilisateur,
      },
    })

    await tx.stockMouvement.create({
      data: {
        tenant_id,
        id_lot,
        type: 'transfert',
        quantite,
        before_qty: sourceBefore,
        after_qty: sourceBefore - quantite,
        source_type: 'TRANSFERT',
        source_id: transfert.id_stock_transfert,
        created_by: id_utilisateur,
      },
    })

    await tx.stockMouvement.create({
      data: {
        tenant_id,
        id_lot,
        type: 'transfert',
        quantite,
        before_qty: destinationBefore,
        after_qty: destinationBefore + quantite,
        source_type: 'TRANSFERT',
        source_id: transfert.id_stock_transfert,
        created_by: id_utilisateur,
      },
    })

    await tx.stockActuel.update({
      where: { id: sourceStock!.id },
      data: { quantite: sourceBefore - quantite },
    })

    if (destinationStock) {
      await tx.stockActuel.update({
        where: { id: destinationStock.id },
        data: { quantite: destinationBefore + quantite },
      })
    } else {
      await tx.stockActuel.create({
        data: {
          tenant_id,
          id_lot,
          id_pdv: id_point_vente_destination,
          quantite,
          quantite_reservee: 0,
          created_by: id_utilisateur,
        },
      })
    }

    return transfert
  })

  return { status: 201, payload }
}

export async function updateLotPrixMarge({
  idLot,
  body,
  user,
}: {
  idLot: number
  body: Record<string, unknown>
  user: { id_utilisateur: number; tenant_id: number }
}) {
  const prix_initial = Number(String(body?.prix_initial ?? '').replace(',', '.'))
  const marge = Number(String(body?.marge ?? '').replace(',', '.'))

  if (!idLot) throw httpError(400, "'id_lot' est requis")
  if (!Number.isFinite(prix_initial) || prix_initial < 0) throw httpError(400, 'Prix initial invalide')
  if (!Number.isFinite(marge) || marge < 0) throw httpError(400, 'Marge invalide')

  const lot = await prisma.livraisonItem.findFirst({
    where: { id_lot: idLot, tenant_id: user.tenant_id },
    select: { id_lot: true },
  })
  if (!lot) throw httpError(404, 'Lot introuvable')

  const updated = await prisma.livraisonItem.update({
    where: { id_lot: idLot },
    data: {
      prix_initial,
      marge,
      modified_by: user.id_utilisateur,
    },
  })

  return { status: 200, payload: updated }
}

// ─── Catalogue with aggregated stock quantities ────────────────────────────

export async function listCatalogueStock(tenantId: number, id_collaborateur?: string) {
  // ── Contexte métier — slog annote uniquement, Prisma mesure automatiquement ──
  // Ne jamais appeler slog.db() ou slog.success() ici.
  const { slog } = await import('@/lib/server-logger')
  slog.section('Chargement du catalogue stock')

  const where: Record<string, unknown> = { tenant_id: tenantId, statut: 'actif' }
  if (id_collaborateur) {
    const cid = Number(id_collaborateur)
    if (!isNaN(cid)) where.id_collaborateur = cid
  }

  slog.step('Récupération du catalogue produit')
  const produits = await prisma.produitCatalogue.findMany({
    where,
    orderBy: { id_produit: 'desc' },
  })

  if (produits.length === 0) return { data: [] }

  slog.step('Récupération des collaborateurs')
  const collabIds = [...new Set(produits.map(p => p.id_collaborateur))]
  const collaborateurs = await prisma.collaborateur.findMany({
    where: { id_collaborateur: { in: collabIds } },
    select: { id_collaborateur: true, nom: true },
  })
  const collabMap = Object.fromEntries(collaborateurs.map(c => [c.id_collaborateur, c.nom]))

  slog.step('Récupération des lots en stock')
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
    slog.step('Agrégation du stock actuel')
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

  slog.step('Récupération des unités de mesure')
  const uniteIds = [...new Set(produits.map(p => p.id_unite).filter((id): id is number => id != null))]
  const unites = uniteIds.length > 0
    ? await prisma.uniteDeMesure.findMany({
        where: { id_unite: { in: uniteIds } },
        select: { id_unite: true, code: true, label: true, est_decimal: true, precision: true },
      })
    : []
  const uniteMap = Object.fromEntries(unites.map(u => [u.id_unite, u]))

  // Map to output shape expected by frontend
  const data = produits.map(p => {
    const unite = p.id_unite ? uniteMap[p.id_unite] : undefined
    return {
      id_produit: p.id_produit,
      libelle: p.nom,
      nom: p.nom,
      categorie: p.categorie || 'Sans catégorie',
      quantite_en_stock: stockByProd[p.id_produit] || 0,
      seuil_alerte: p.seuil_alerte ? Number(p.seuil_alerte) : null,
      statut: p.statut,
      id_collaborateur: p.id_collaborateur,
      collaborateur_nom: collabMap[p.id_collaborateur] || 'Collaborateur -',
      // Unité — les deux formes pour compatibilité frontend
      unite: unite?.label || p.unite || null,
      id_unite: p.id_unite || null,
      unite_code: unite?.code || p.unite || null,
      unite_label: unite?.label || p.unite || null,
      est_decimal: unite?.est_decimal ?? false,
      precision: unite?.precision ?? 0,
      prix_vente_actuel: null,
      prix_achat_actuel: null,
    }
  })

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
