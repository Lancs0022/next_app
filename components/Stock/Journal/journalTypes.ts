export interface EnrichedStockMouvement {
  id_stock_mouvement: number
  tenant_id: number
  id_lot: number
  type: string // entree | sortie | transfert | ajustement | reservation | annulation_vente | annulation_reservation
  quantite: number
  before_qty: number | null
  after_qty: number | null
  source_type: string // VENTE | LIVRAISON | TRANSFERT | AJUSTEMENT | RETOUR
  source_id: number | null
  date_mouvement: string
  created_at: string
  created_by: number | null
  created_by_nom: string | null

  // Produit & Lot
  libelle_produit: string | null
  sku_produit: string | null
  categorie_produit: string | null
  unite_code: string | null
  unite_label: string | null
  est_decimal: boolean
  statut_lot: string | null

  // Localisation
  id_pdv: number | null
  nom_pdv: string | null

  // Source métier
  client_nom: string | null
  reference_livraison: string | null
  source_statut: string | null
  source_date: string | null
  pdv_source_nom: string | null
  pdv_dest_nom: string | null
  transfert_commentaire: string | null
  ajustement_type: string | null
  ajustement_motif: string | null
}

export type StockEventType =
  | 'ENTREE'
  | 'SORTIE'
  | 'TRANSFERT'
  | 'RETOUR'
  | 'RESERVATION'
  | 'AJUSTEMENT'
  | 'ANNULATION'

export interface StockEventMerchandiseItem {
  id_lot: number
  nom: string
  sku: string | null
  quantite: number
  unite: string
  est_decimal: boolean
}

export interface StockEvent {
  id: string
  businessKey: string
  type: StockEventType
  reference: string
  eventDate: string
  createdAt: string
  operator: string
  status: string
  sourceType: string
  sourceId: number | null

  // Movements composition
  movements: EnrichedStockMouvement[]
  isGrouped: boolean
  movementCount: number

  // Merchandises involved
  merchandiseList: StockEventMerchandiseItem[]

  // Column summaries (strictly formatted to max 3 lines per column)
  colEvent: {
    line1Date: string
    line2BadgeType: StockEventType
    line3Ref: string
  }
  colArticle: {
    line1Product: string
    line2Sku: string | null
    line3LotAndUnit: string
    badgeSoftUnit?: string
  }
  colMovement: {
    line1Location: string
    line2Delta: string
    line3DestinationOrNote?: string
    isPositive?: boolean
    isNeutral?: boolean
  }
  colOperator: {
    line1Name: string
    line2CreatedAt: string
  }
}

import type { DateFilterValue } from '@/components/DateRangeFilter'

export interface JournalFiltersState {
  q: string
  type: string // '' or StockEventType
  source_type: string
  id_pdv: string
  id_utilisateur: string
  date: DateFilterValue | null
  statut: string
}
