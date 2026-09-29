import type {
  EnrichedStockMouvement,
  StockEvent,
  StockEventType,
  StockEventMerchandiseItem,
} from './journalTypes'

// ─── Formatters de date ──────────────────────────────────────────────────────

export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatShortDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatQuantity(
  qty: number,
  estDecimal: boolean = false
): string {
  return Number(qty).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: estDecimal ? 3 : 0,
  })
}

// ─── Styles sémantiques par famille d'événement ──────────────────────────────

export function getEventTypeBadge(type: StockEventType) {
  switch (type) {
    case 'ENTREE':
      return {
        label: 'ENTRÉE',
        fullBadge: 'bg-emerald-600 text-white shadow-sm',
        softBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        textClass: 'text-emerald-600 dark:text-emerald-400 font-semibold',
        dotColor: 'bg-emerald-500',
      }
    case 'SORTIE':
      return {
        label: 'SORTIE',
        fullBadge: 'bg-rose-600 text-white shadow-sm',
        softBadge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        textClass: 'text-rose-600 dark:text-rose-400 font-semibold',
        dotColor: 'bg-rose-500',
      }
    case 'TRANSFERT':
      return {
        label: 'TRANSFERT',
        fullBadge: 'bg-blue-600 text-white shadow-sm',
        softBadge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        textClass: 'text-blue-600 dark:text-blue-400 font-semibold',
        dotColor: 'bg-blue-500',
      }
    case 'RETOUR':
      return {
        label: 'RETOUR',
        fullBadge: 'bg-teal-600 text-white shadow-sm',
        softBadge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
        textClass: 'text-teal-600 dark:text-teal-400 font-semibold',
        dotColor: 'bg-teal-500',
      }
    case 'RESERVATION':
      return {
        label: 'RÉSERVATION',
        fullBadge: 'bg-amber-600 text-white shadow-sm',
        softBadge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        textClass: 'text-amber-600 dark:text-amber-400 font-semibold',
        dotColor: 'bg-amber-500',
      }
    case 'AJUSTEMENT':
      return {
        label: 'AJUSTEMENT',
        fullBadge: 'bg-purple-600 text-white shadow-sm',
        softBadge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        textClass: 'text-purple-600 dark:text-purple-400 font-semibold',
        dotColor: 'bg-purple-500',
      }
    case 'ANNULATION':
      return {
        label: 'ANNULATION',
        fullBadge: 'bg-red-600 text-white shadow-sm',
        softBadge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
        textClass: 'text-red-600 dark:text-red-400 font-semibold',
        dotColor: 'bg-red-500',
      }
  }
}

// ─── Normalisation & Agrégation métier (StockEvent) ──────────────────────────

export function buildStockEvents(
  movements: EnrichedStockMouvement[]
): StockEvent[] {
  if (!movements || movements.length === 0) return []

  // Regroupement par opération métier déterministe :
  // 1. Annulation de vente / réservation -> clé dédiée "ANNULATION_${source_type}_${source_id}"
  // 2. Opération métier normale -> clé "${source_type}_${source_id}"
  // 3. Sans rattachement métier -> clé "MANUEL_${id_stock_mouvement}"
  const groupedMap = new Map<string, EnrichedStockMouvement[]>()

  for (const m of movements) {
    let key: string
    if (m.type === 'annulation_vente' || m.type === 'annulation_reservation') {
      key = `ANNULATION_${m.source_type}_${m.source_id ?? m.id_stock_mouvement}`
    } else if (m.source_id != null && m.source_type) {
      key = `${m.source_type}_${m.source_id}`
    } else {
      key = `MANUEL_${m.id_stock_mouvement}`
    }

    const existing = groupedMap.get(key) || []
    existing.push(m)
    groupedMap.set(key, existing)
  }

  const events: StockEvent[] = []

  for (const [businessKey, mList] of groupedMap.entries()) {
    const first = mList[0]
    const isGrouped = mList.length > 1
    const movementCount = mList.length

    // 1. Détermination du type d'événement métier
    let type: StockEventType
    if (mList.some((m) => m.type === 'annulation_vente' || m.type === 'annulation_reservation')) {
      type = 'ANNULATION'
    } else if (first.source_type === 'TRANSFERT' || mList.some((m) => m.type === 'transfert')) {
      type = 'TRANSFERT'
    } else if (first.source_type === 'RETOUR' || mList.some((m) => m.type === 'retour')) {
      type = 'RETOUR'
    } else if (first.source_type === 'RESERVATION' || mList.some((m) => m.type === 'reservation')) {
      type = 'RESERVATION'
    } else if (first.source_type === 'AJUSTEMENT' || mList.some((m) => m.type === 'ajustement')) {
      type = 'AJUSTEMENT'
    } else if (first.source_type === 'LIVRAISON' || mList.some((m) => m.type === 'entree')) {
      type = 'ENTREE'
    } else {
      type = 'SORTIE'
    }

    // 2. Référence métier
    let reference = ''
    if (type === 'ANNULATION') {
      reference = `Annulation ${first.source_type === 'VENTE' ? `Vente #${first.source_id}` : `#${first.source_id}`}`
    } else if (first.source_type === 'TRANSFERT' && first.source_id) {
      reference = `Transfert #${first.source_id}`
    } else if (first.source_type === 'VENTE' && first.source_id) {
      reference = `Vente #${first.source_id}`
    } else if (first.source_type === 'LIVRAISON' && first.source_id) {
      reference = `Livraison #${first.source_id}`
    } else if (first.source_type === 'AJUSTEMENT' && first.source_id) {
      reference = `Ajustement #${first.source_id}`
    } else {
      reference = `Mouvement #${first.id_stock_mouvement}`
    }

    // 3. Statut
    let status = 'Effectué'
    if (first.source_statut) {
      const s = String(first.source_statut).toLowerCase()
      if (s === 'payee') status = 'Payée'
      else if (s === 'valide' || s === 'recu') status = 'Validé'
      else if (s === 'annulee' || s === 'annule') status = 'Annulé'
      else if (s === 'en_attente_paiement') status = 'En attente'
      else status = first.source_statut
    }

    // 4. Liste des marchandises (sans addition d'unités incompatibles !)
    const merchandiseList: StockEventMerchandiseItem[] = mList.map((m) => ({
      id_lot: m.id_lot,
      nom: m.libelle_produit || `Produit (Lot #${m.id_lot})`,
      sku: m.sku_produit,
      quantite: m.quantite,
      unite: m.unite_code || 'U',
      est_decimal: m.est_decimal,
    }))

    // 5. Formatage Colonne 1 : Événement (Max 3 lignes)
    const line1Date = formatShortDateTime(first.source_date || first.date_mouvement)
    const line2BadgeType = type
    const line3Ref = isGrouped ? `${reference} · ${movementCount} mouvements` : reference

    // 6. Formatage Colonne 2 : Article / Lot (Max 3 lignes)
    let line1Product = ''
    let line2Sku: string | null = null
    let line3LotAndUnit = ''
    let badgeSoftUnit: string | undefined = undefined

    const uniqueProductNames = [...new Set(mList.map((m) => m.libelle_produit).filter(Boolean))]
    const uniqueLots = [...new Set(mList.map((m) => m.id_lot))]

    if (uniqueProductNames.length === 1 && uniqueLots.length === 1) {
      // Un seul article et un seul lot
      line1Product = first.libelle_produit || 'Sans nom'
      line2Sku = first.sku_produit || null
      line3LotAndUnit = `Lot #${first.id_lot}`
      badgeSoftUnit = first.unite_code || 'U'
    } else if (uniqueProductNames.length === 1) {
      // Même produit sur plusieurs lots
      line1Product = first.libelle_produit || 'Sans nom'
      line2Sku = first.sku_produit || null
      line3LotAndUnit = `${uniqueLots.length} lots · [${first.unite_code || 'U'}]`
    } else {
      // Plusieurs produits distincts
      line1Product = `${uniqueProductNames.length} articles différents`
      line2Sku = mList[0]?.sku_produit ? `Réf : ${mList[0].sku_produit} (+)` : null
      line3LotAndUnit = `${uniqueLots.length} lots concernés`
    }

    // 7. Formatage Colonne 3 : Mouvement (Max 3 lignes, sans soldes avant/après)
    let line1Location = ''
    let line2Delta = ''
    let line3DestinationOrNote: string | undefined = undefined
    let isPositive = false
    let isNeutral = false

    if (type === 'TRANSFERT') {
      const srcName = first.pdv_source_nom || first.nom_pdv || 'Dépôt source'
      const dstName = first.pdv_dest_nom || 'Boutique dest'
      line1Location = `${srcName} → ${dstName}`

      if (uniqueLots.length === 1) {
        const qtyStr = `${formatQuantity(first.quantite, first.est_decimal)} ${first.unite_code || 'U'}`
        line2Delta = `−${qtyStr} → +${qtyStr}`
      } else {
        line2Delta = `${uniqueLots.length} lots transférés`
      }
      line3DestinationOrNote = first.transfert_commentaire || 'Transfert de stock'
      isNeutral = true
    } else if (type === 'ENTREE') {
      line1Location = first.nom_pdv || 'Dépôt central'
      const sameUnit = mList.every((m) => (m.unite_code || 'U') === (first.unite_code || 'U'))
      if (sameUnit) {
        const totalQty = mList.reduce((acc, m) => acc + m.quantite, 0)
        line2Delta = `+${formatQuantity(totalQty, first.est_decimal)} ${first.unite_code || 'U'}`
      } else {
        line2Delta = `+${movementCount} entrées reçues`
      }
      line3DestinationOrNote = first.reference_livraison ? `Bon : ${first.reference_livraison}` : 'Livraison marchandise'
      isPositive = true
    } else if (type === 'SORTIE') {
      line1Location = first.nom_pdv || 'Point de vente'
      const sameUnit = mList.every((m) => (m.unite_code || 'U') === (first.unite_code || 'U'))
      if (sameUnit) {
        const totalQty = mList.reduce((acc, m) => acc + m.quantite, 0)
        line2Delta = `−${formatQuantity(totalQty, first.est_decimal)} ${first.unite_code || 'U'}`
      } else {
        line2Delta = `−${movementCount} articles sortis`
      }
      line3DestinationOrNote = first.client_nom ? `→ ${first.client_nom}` : 'Vente magasin'
      isPositive = false
    } else if (type === 'ANNULATION') {
      line1Location = first.nom_pdv || 'Point de vente'
      const sameUnit = mList.every((m) => (m.unite_code || 'U') === (first.unite_code || 'U'))
      if (sameUnit) {
        const totalQty = mList.reduce((acc, m) => acc + m.quantite, 0)
        line2Delta = `+${formatQuantity(totalQty, first.est_decimal)} ${first.unite_code || 'U'}`
      } else {
        line2Delta = `+${movementCount} mouvements rétablis`
      }
      line3DestinationOrNote = first.client_nom ? `← Annulation ${first.client_nom}` : '← Annulation vente'
      isPositive = true
    } else if (type === 'AJUSTEMENT') {
      line1Location = first.nom_pdv || 'Dépôt'
      const delta = first.quantite
      const sign = delta > 0 ? '+' : ''
      line2Delta = `${sign}${formatQuantity(delta, first.est_decimal)} ${first.unite_code || 'U'}`
      line3DestinationOrNote = first.ajustement_motif || first.ajustement_type || 'Ajustement inventaire'
      isPositive = delta > 0
    } else if (type === 'RESERVATION') {
      line1Location = first.nom_pdv || 'Dépôt'
      line2Delta = `−${formatQuantity(first.quantite, first.est_decimal)} ${first.unite_code || 'U'}`
      line3DestinationOrNote = 'Stock réservé'
      isNeutral = true
    } else {
      line1Location = first.nom_pdv || 'Stock'
      line2Delta = `${first.quantite > 0 ? '+' : ''}${formatQuantity(first.quantite, first.est_decimal)} ${first.unite_code || 'U'}`
      line3DestinationOrNote = 'Mouvement'
    }

    // 8. Formatage Colonne 4 : Opérateur (Max 2 lignes)
    const line1Name = first.created_by_nom || 'Opérateur'
    const line2CreatedAt = `créé le ${formatShortDateTime(first.created_at)}`

    events.push({
      id: `evt-${businessKey}`,
      businessKey,
      type,
      reference,
      eventDate: first.source_date || first.date_mouvement,
      createdAt: first.created_at,
      operator: first.created_by_nom || 'Opérateur',
      status,
      sourceType: first.source_type,
      sourceId: first.source_id,
      movements: mList,
      isGrouped,
      movementCount,
      merchandiseList,
      colEvent: {
        line1Date,
        line2BadgeType,
        line3Ref,
      },
      colArticle: {
        line1Product,
        line2Sku,
        line3LotAndUnit,
        badgeSoftUnit,
      },
      colMovement: {
        line1Location,
        line2Delta,
        line3DestinationOrNote,
        isPositive,
        isNeutral,
      },
      colOperator: {
        line1Name,
        line2CreatedAt,
      },
    })
  }

  // Tri par défaut : date de l'événement DESC
  events.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

  return events
}
