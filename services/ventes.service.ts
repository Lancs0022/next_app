import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export interface VenteQueryParams {
  tenantId: number
  q?: string
  id_point_vente?: string
  id_collaborateur?: string
  statut?: string
  dateMin?: string
  dateMax?: string
  page?: number
  limit?: number
}

// ─── Atomic view (one row per VenteArticle) ────────────────────────────────

export async function listVentesAtomiques(params: VenteQueryParams) {
  const { tenantId, q, id_point_vente, id_collaborateur, statut, dateMin, dateMax, page = 1, limit = 20 } = params

  const pageNum = Math.max(1, page)
  const limitNum = Math.min(200, Math.max(1, limit))
  const skip = (pageNum - 1) * limitNum

  // Build Vente-level where
  const venteWhere: Record<string, unknown> = { tenant_id: tenantId, deleted: false }
  if (id_point_vente) venteWhere.id_point_vente = parseInt(id_point_vente, 10)
  if (statut) venteWhere.statut = statut
  if (dateMin || dateMax) {
    const date_vente: Record<string, Date> = {}
    if (dateMin) date_vente.gte = new Date(dateMin)
    if (dateMax) {
      const end = new Date(dateMax)
      end.setHours(23, 59, 59, 999)
      date_vente.lte = end
    }
    venteWhere.date_vente = date_vente
  }

  // Build VenteArticle-level where
  const articleWhere: Record<string, unknown> = { vente: venteWhere, deleted: false }
  if (id_collaborateur) {
    const ids = id_collaborateur.split(',').map(Number).filter(Boolean)
    if (ids.length > 0) articleWhere.id_collaborateur = { in: ids }
  }

  const [articles, total] = await prisma.$transaction([
    prisma.venteArticle.findMany({
      where: articleWhere,
      include: { vente: true },
      skip,
      take: limitNum,
      orderBy: { id_ligne: 'desc' },
    }),
    prisma.venteArticle.count({ where: articleWhere }),
  ])

  if (articles.length === 0) {
    return { data: [], page: pageNum, limit: limitNum, total }
  }

  // Collect IDs for batch lookups
  const pdvIds = [...new Set(articles.map((a) => a.vente.id_point_vente))]
  const lotIds = [...new Set(articles.map((a) => a.id_lot))]
  const collabIds = [...new Set(articles.map((a) => a.id_collaborateur))]
  const clientIds = [...new Set(articles.map((a) => a.vente.id_client).filter(Boolean))] as number[]
  const userIds = [...new Set(articles.map((a) => a.vente.id_utilisateur).filter(Boolean))] as number[]

  const [pdvs, lots, collabs, clients, utilisateurs] = await Promise.all([
    prisma.pointDeVente.findMany({ where: { id_pdv: { in: pdvIds } }, select: { id_pdv: true, nom: true } }),
    lotIds.length > 0
      ? prisma.livraisonItem.findMany({ where: { id_lot: { in: lotIds } }, select: { id_lot: true, id_produit: true } })
      : Promise.resolve([]),
    collabIds.length > 0
      ? prisma.collaborateur.findMany({ where: { id_collaborateur: { in: collabIds } }, select: { id_collaborateur: true, nom: true, prenom: true } })
      : Promise.resolve([]),
    clientIds.length > 0
      ? prisma.client.findMany({ where: { id_client: { in: clientIds } }, select: { id_client: true, nom: true, prenom: true } })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.utilisateur.findMany({ where: { id_utilisateur: { in: userIds } }, select: { id_utilisateur: true, nom: true, prenom: true } })
      : Promise.resolve([]),
  ])

  // Resolve produit names from lots
  const lotProduitIds = [...new Set(lots.map((l) => l.id_produit))]
  const produits = lotProduitIds.length > 0
    ? await prisma.produitCatalogue.findMany({ where: { id_produit: { in: lotProduitIds } }, select: { id_produit: true, nom: true } })
    : []

  const pdvMap = Object.fromEntries(pdvs.map((p) => [p.id_pdv, p.nom]))
  const lotMap = Object.fromEntries(lots.map((l) => [l.id_lot, l.id_produit]))
  const produitMap = Object.fromEntries(produits.map((p) => [p.id_produit, p.nom]))
  const collabMap = Object.fromEntries(collabs.map((c) => [c.id_collaborateur, `${c.prenom ? c.prenom + ' ' : ''}${c.nom}`]))
  const clientMap = Object.fromEntries(clients.map((c) => [c.id_client, `${c.prenom ? c.prenom + ' ' : ''}${c.nom}`]))
  const userMap = Object.fromEntries(utilisateurs.map((u) => [u.id_utilisateur, `${u.prenom ? u.prenom + ' ' : ''}${u.nom}`]))

  // Filter by search query (on resolved names)
  let filtered = articles
  if (q) {
    const search = q.toLowerCase()
    filtered = articles.filter((a) => {
      const pvNom = pdvMap[a.vente.id_point_vente] || ''
      const idProd = lotMap[a.id_lot]
      const prodNom = idProd ? produitMap[idProd] || '' : ''
      const collabNom = collabMap[a.id_collaborateur] || ''
      return pvNom.toLowerCase().includes(search) ||
        prodNom.toLowerCase().includes(search) ||
        collabNom.toLowerCase().includes(search)
    })
  }

  const data = filtered.map((a) => {
    const idProd = lotMap[a.id_lot]
    return {
      id_vente_article: a.id_ligne,
      id_vente: a.id_vente,
      date_vente: a.vente.date_vente,
      id_point_vente: a.vente.id_point_vente,
      point_vente_nom: pdvMap[a.vente.id_point_vente] || `PV #${a.vente.id_point_vente}`,
      id_lot: a.id_lot,
      libelle_produit: idProd ? produitMap[idProd] || `Produit #${idProd}` : `Lot #${a.id_lot}`,
      id_collaborateur: a.id_collaborateur,
      collaborateur_nom: collabMap[a.id_collaborateur] || '-',
      quantite_vendue: a.quantite_vendue,
      montant_ht: Number(a.montant_ht ?? Number(a.quantite_vendue) * Number(a.prix_initial)),
      montant_marge: a.montant_marge ? Number(a.montant_marge) : null,
      statut: a.vente.statut,
      client_nom: a.vente.id_client ? clientMap[a.vente.id_client] || null : null,
      cree_par_nom: a.vente.id_utilisateur ? userMap[a.vente.id_utilisateur] || null : null,
    }
  })

  const adjustedTotal = q ? Math.min(total, data.length + skip) : total

  return { data, page: pageNum, limit: limitNum, total: adjustedTotal }
}

// ─── Aggregated view (one row per Vente) ───────────────────────────────────

export async function listVentes(params: VenteQueryParams) {
  const { tenantId, q, id_point_vente, id_collaborateur, statut, dateMin, dateMax, page = 1, limit = 50 } = params

  const pageNum = Math.max(1, page)
  const limitNum = Math.min(200, Math.max(1, limit))
  const skip = (pageNum - 1) * limitNum

  const where: Record<string, unknown> = { tenant_id: tenantId, deleted: false }
  if (id_point_vente) where.id_point_vente = parseInt(id_point_vente, 10)
  if (statut) where.statut = statut
  if (dateMin || dateMax) {
    const date_vente: Record<string, Date> = {}
    if (dateMin) date_vente.gte = new Date(dateMin)
    if (dateMax) {
      const end = new Date(dateMax)
      end.setHours(23, 59, 59, 999)
      date_vente.lte = end
    }
    where.date_vente = date_vente
  }
  if (id_collaborateur) {
    const ids = id_collaborateur.split(',').map(Number).filter(Boolean)
    if (ids.length > 0) where.articles = { some: { id_collaborateur: { in: ids }, deleted: false } }
  }

  const [ventes, total] = await prisma.$transaction([
    prisma.vente.findMany({
      where,
      include: { articles: { where: { deleted: false } } },
      skip,
      take: limitNum,
      orderBy: { date_vente: 'desc' },
    }),
    prisma.vente.count({ where }),
  ])

  if (ventes.length === 0) {
    return { data: [], page: pageNum, limit: limitNum, total }
  }

  // Batch lookups
  const pdvIds = [...new Set(ventes.map((v) => v.id_point_vente))]
  const clientIds = [...new Set(ventes.map((v) => v.id_client).filter(Boolean))] as number[]
  const userIds = [...new Set(ventes.map((v) => v.id_utilisateur).filter(Boolean))] as number[]

  const [pdvs, clients, utilisateurs] = await Promise.all([
    prisma.pointDeVente.findMany({ where: { id_pdv: { in: pdvIds } }, select: { id_pdv: true, nom: true } }),
    clientIds.length > 0
      ? prisma.client.findMany({ where: { id_client: { in: clientIds } }, select: { id_client: true, nom: true, prenom: true } })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.utilisateur.findMany({ where: { id_utilisateur: { in: userIds } }, select: { id_utilisateur: true, nom: true, prenom: true } })
      : Promise.resolve([]),
  ])

  const pdvMap = Object.fromEntries(pdvs.map((p) => [p.id_pdv, p.nom]))
  const clientMap = Object.fromEntries(clients.map((c) => [c.id_client, `${c.prenom ? c.prenom + ' ' : ''}${c.nom}`]))
  const userMap = Object.fromEntries(utilisateurs.map((u) => [u.id_utilisateur, `${u.prenom ? u.prenom + ' ' : ''}${u.nom}`]))

  let data = ventes.map((v) => ({
    id_vente: v.id_vente,
    date_vente: v.date_vente,
    id_point_vente: v.id_point_vente,
    point_vente_nom: pdvMap[v.id_point_vente] || `PV #${v.id_point_vente}`,
    id_client: v.id_client,
    client_nom: v.id_client ? clientMap[v.id_client] || 'Client anonyme' : 'Client anonyme',
    montant_total: Number(v.montant_total ?? 0),
    montant_marge: v.montant_marge ? Number(v.montant_marge) : null,
    statut: v.statut,
    cree_par_nom: v.id_utilisateur ? userMap[v.id_utilisateur] || '-' : '-',
  }))

  // Search filter
  if (q) {
    const search = q.toLowerCase()
    data = data.filter((v) =>
      v.point_vente_nom.toLowerCase().includes(search) ||
      (v.client_nom || '').toLowerCase().includes(search) ||
      (v.cree_par_nom || '').toLowerCase().includes(search)
    )
  }

  const adjustedTotal = q ? Math.min(total, data.length + skip) : total

  return { data, page: pageNum, limit: limitNum, total: adjustedTotal }
}

// ─── Vente detail (aggregated) ─────────────────────────────────────────────

export async function getVenteDetail(id_vente: number, tenantId: number) {
  const vente = await prisma.vente.findFirst({
    where: { id_vente, tenant_id: tenantId, deleted: false },
    include: { articles: { where: { deleted: false } } },
  })

  if (!vente) throw httpError(404, 'Vente non trouvée')

  const [pdv, client, user, lots, collabs] = await Promise.all([
    prisma.pointDeVente.findUnique({ where: { id_pdv: vente.id_point_vente }, select: { nom: true } }),
    vente.id_client ? prisma.client.findUnique({ where: { id_client: vente.id_client }, select: { nom: true, prenom: true } }) : Promise.resolve(null),
    vente.id_utilisateur ? prisma.utilisateur.findUnique({ where: { id_utilisateur: vente.id_utilisateur }, select: { nom: true, prenom: true } }) : Promise.resolve(null),
    prisma.livraisonItem.findMany({
      where: { id_lot: { in: vente.articles.map((a) => a.id_lot) } },
      select: { id_lot: true, id_produit: true },
    }),
    prisma.collaborateur.findMany({
      where: { id_collaborateur: { in: vente.articles.map((a) => a.id_collaborateur) } },
      select: { id_collaborateur: true, nom: true, prenom: true },
    }),
  ])

  // Resolve produit names
  const produitIds = [...new Set(lots.map((l) => l.id_produit))]
  const produits = produitIds.length > 0
    ? await prisma.produitCatalogue.findMany({ where: { id_produit: { in: produitIds } }, select: { id_produit: true, nom: true } })
    : []

  const lotMap = Object.fromEntries(lots.map((l) => [l.id_lot, l.id_produit]))
  const produitMap = Object.fromEntries(produits.map((p) => [p.id_produit, p.nom]))
  const collabMap = Object.fromEntries(collabs.map((c) => [c.id_collaborateur, `${c.prenom ? c.prenom + ' ' : ''}${c.nom}`]))

  const lignes = vente.articles.map((a) => {
    const idProd = lotMap[a.id_lot]
    return {
      id: a.id_ligne,
      id_lot: a.id_lot,
      libelle_produit: idProd ? produitMap[idProd] || `Produit #${idProd}` : `Lot #${a.id_lot}`,
      collaborateur_nom: collabMap[a.id_collaborateur] || '-',
      quantite_vendue: Number(a.quantite_vendue),
      montant_ht: Number(a.montant_ht ?? Number(a.quantite_vendue) * Number(a.prix_initial)),
      montant_marge: a.montant_marge ? Number(a.montant_marge) : null,
    }
  })

  return {
    id_vente: vente.id_vente,
    date_vente: vente.date_vente,
    id_point_vente: vente.id_point_vente,
    point_vente_nom: pdv?.nom || `PV #${vente.id_point_vente}`,
    client_nom: client ? `${client.prenom ? client.prenom + ' ' : ''}${client.nom}` : 'Client anonyme',
    montant_total: Number(vente.montant_total ?? 0),
    montant_marge: vente.montant_marge ? Number(vente.montant_marge) : null,
    statut: vente.statut,
    cree_par_nom: user ? `${user.prenom ? user.prenom + ' ' : ''}${user.nom}` : '-',
    lignes,
  }
}

// ─── Create vente directe (with ledger journal entries) ────────────────────

export async function createVenteDirecte({
  body,
  user,
}: {
  body: Record<string, unknown>
  user: { id_utilisateur: number; tenant_id: number }
}) {
  const { tenant_id, id_utilisateur } = user
  if (!tenant_id) throw httpError(401, 'Tenant manquant')

  const client_uuid = body?.client_uuid ? String(body.client_uuid) : null

  if (client_uuid) {
    const existing = await prisma.vente.findFirst({
      where: { tenant_id, client_uuid, deleted: false },
      include: { articles: { where: { deleted: false } } },
    })
    if (existing) {
      return { status: 200, payload: existing }
    }
  }

  // Header can come as nested object or top-level
  const header = (body?.header as Record<string, unknown>) || body

  const id_point_vente = Number(header?.id_point_vente ?? header?.id_pdv)
  if (!id_point_vente) throw httpError(400, "'id_point_vente' est requis")

  const id_client = Number(header?.id_client ?? 0)
  if (!id_client) throw httpError(400, "'id_client' est requis")

  const lignes = Array.isArray(body?.lines)
    ? (body.lines as Array<Record<string, unknown>>)
    : Array.isArray(body?.lignes)
      ? (body.lignes as Array<Record<string, unknown>>)
      : []

  if (lignes.length === 0) throw httpError(400, 'Au moins une ligne est requise')

  let montant_ht = 0
  let montant_marge = 0
  const articles: Array<{
    id_lot: number
    id_collaborateur: number
    quantite_vendue: number
    prix_initial: number
    marge: number
  }> = []

  for (const l of lignes) {
    const id_lot = Number(l.id_lot)
    const id_collaborateur = Number(l.id_collaborateur)
    const quantite_vendue = Number(String(l.quantite_vendue ?? l.quantite ?? '0').replace(',', '.'))
    const prix_initial = Number(l.prix_initial ?? l.prix_unitaire ?? 0)
    const marge = Number(l.marge ?? 0)

    if (!id_lot || quantite_vendue <= 0)
      throw httpError(400, 'Chaque ligne doit avoir un lot et une quantité > 0')
    if (!id_collaborateur)
      throw httpError(400, 'Chaque ligne doit avoir un id_collaborateur')
    if (!Number.isFinite(quantite_vendue))
      throw httpError(400, `Quantité invalide pour le lot ${id_lot}`)

    montant_ht += quantite_vendue * prix_initial
    montant_marge += marge * quantite_vendue

    articles.push({ id_lot, id_collaborateur, quantite_vendue, prix_initial, marge })
  }

  const montant_total = montant_ht  // simplified: no TVA for now
  const date_vente = header?.date_vente ? new Date(String(header.date_vente)) : new Date()

  const vente = await prisma.$transaction(async (tx) => {
    // 1. Create Vente header
    const v = await tx.vente.create({
      data: {
        tenant_id,
        id_point_vente,
        id_client,
        client_uuid,
        id_utilisateur: id_utilisateur || null,
        enregistre_par_admin_id: id_utilisateur,
        date_vente,
        statut: 'payee',
        montant_ht,
        montant_tva: 0,
        montant_marge,
        montant_total,
      },
    })

    // 2. Create VenteArticles + journal entries
    for (const a of articles) {
      const line_ht = a.quantite_vendue * a.prix_initial
      const line_marge = a.marge * a.quantite_vendue

      await tx.venteArticle.create({
        data: {
          tenant_id,
          id_vente: v.id_vente,
          id_lot: a.id_lot,
          id_collaborateur: a.id_collaborateur,
          quantite_vendue: a.quantite_vendue,
          prix_initial: a.prix_initial,
          marge: a.marge,
          montant_ht: line_ht,
          montant_tva: 0,
          montant_marge: line_marge,
        },
      })

      // 3. StockMouvement (sortie) — read current stock, compute before/after
      const stockActuel = await tx.stockActuel.findFirst({
        where: { tenant_id, id_lot: a.id_lot, id_pdv: id_point_vente },
      })

      const before_qty = stockActuel ? Number(stockActuel.quantite) : 0
      const after_qty = before_qty - a.quantite_vendue

      await tx.stockMouvement.create({
        data: {
          tenant_id,
          id_lot: a.id_lot,
          type: 'sortie',
          quantite: a.quantite_vendue,
          before_qty,
          after_qty,
          source_type: 'VENTE',
          source_id: v.id_vente,
          created_by: id_utilisateur || null,
        },
      })

      // 4. Update stock_actuel
      if (stockActuel) {
        await tx.stockActuel.update({
          where: { id: stockActuel.id },
          data: { quantite: after_qty },
        })
      }
    }

    // 5. TransactionFinanciere (IN) — one for the whole vente
    // Use category_id = 1 (Vente) if exists
    const venteCategory = await tx.transactionFinanciere.findFirst({
      where: { tenant_id, source_module: 'VENTE' },
      select: { id_categorie_financiere: true },
    })
    const id_categorie_financiere = venteCategory?.id_categorie_financiere ?? 1

    await tx.transactionFinanciere.create({
      data: {
        tenant_id,
        type: 'IN',
        montant: montant_total,
        id_categorie_financiere,
        source_module: 'VENTE',
        source_id: v.id_vente,
        description: `Vente #${v.id_vente}`,
        created_by: id_utilisateur,
      },
    })

    return v
  })

  return { status: 201, payload: vente }
}
// ─── Cancel vente (with ledger journal entries) ────────────────────
export async function cancelVente({
  id_vente,
  raison_suppression,
  user,
}: {
  id_vente: number
  raison_suppression: string
  user: { id_utilisateur: number; tenant_id: number }
}) {
  const { tenant_id, id_utilisateur } = user
  if (!tenant_id) throw httpError(401, 'Tenant manquant')

  const vente = await prisma.vente.findUnique({
    where: { id_vente, tenant_id },
    include: { articles: true },
  })

  if (!vente) throw httpError(404, 'Vente non trouvée')
  if (vente.statut === 'annulee') throw httpError(400, 'Vente déjà annulée')

  // Calculate totals
  let montant_ht = 0
  let montant_marge = 0
  for (const a of vente.articles) {
    montant_ht += Number(a.prix_initial) * Number(a.quantite_vendue)
    montant_marge += Number(a.marge) * Number(a.quantite_vendue)
  }
  const montant_total = montant_ht // simplified: no TVA

  const updatedVente = await prisma.$transaction(async (tx) => {
    // 1. Update Vente header: set statut to annulee and reason
    const updated = await tx.vente.update({
      where: { id_vente, tenant_id },
      data: {
        statut: 'annulee',
        raison_suppression,
      },
    })

    // 2. For each article: update quantite_retournee, create stock_mouvement (annulation_vente), update stock_actuel
    for (const a of vente.articles) {
      // Update vente_article to mark returned quantity
      await tx.venteArticle.update({
        where: { id_ligne: a.id_ligne },
        data: { quantite_retournee: a.quantite_vendue },
      })

      // Get current stock
      const stockActuel = await tx.stockActuel.findFirst({
        where: { tenant_id, id_lot: a.id_lot, id_pdv: vente.id_point_vente },
      })

      const before_qty = stockActuel ? Number(stockActuel.quantite) : 0
      const after_qty = before_qty + Number(a.quantite_vendue) // returning stock increases quantity

      // Create stock_mouvement of type annulation_vente
      await tx.stockMouvement.create({
        data: {
          tenant_id,
          id_lot: a.id_lot,
          type: 'annulation_vente',
          quantite: a.quantite_vendue,
          before_qty,
          after_qty,
          source_type: 'ANNULATION_VENTE',
          source_id: vente.id_vente,
          created_by: id_utilisateur || null,
        },
      })

      // Update stock_actuel
      if (stockActuel) {
        await tx.stockActuel.update({
          where: { id: stockActuel.id },
          data: { quantite: after_qty },
        })
      } else {
        // If no stockActuel record, create one (should not happen in normal flow)
        await tx.stockActuel.create({
          data: {
            tenant_id,
            id_lot: a.id_lot,
            id_pdv: vente.id_point_vente,
            quantite: after_qty,
            quantite_reservee: 0,
            created_by: id_utilisateur || null,
          },
        })
      }
    }

    // 3. Create compensating TransactionFinanciere (OUT) for reimbursement
    const venteCategory = await tx.transactionFinanciere.findFirst({
      where: { tenant_id, source_module: 'VENTE' },
      select: { id_categorie_financiere: true },
    })
    const id_categorie_financiere = venteCategory?.id_categorie_financiere ?? 1

    await tx.transactionFinanciere.create({
      data: {
        tenant_id,
        type: 'OUT',
        montant: montant_total,
        id_categorie_financiere,
        source_module: 'VENTE',
        source_id: vente.id_vente,
        description: `Annulation vente #${vente.id_vente}: ${raison_suppression}`,
        created_by: id_utilisateur,
      },
    })

    return updated
  })

  return { status: 200, payload: updatedVente }
}
