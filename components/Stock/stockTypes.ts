// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRecord = Record<string, any>

export interface LotsFiltersState {
  q: string
  id_point_vente: string[]
  id_collaborateur: string[]
  qte_op: string
  qte_value: string
  showEpuise: boolean
  date: AnyRecord | null
}

export interface LivraisonsFiltersState {
  q: string
  id_point_vente: string
  id_collaborateur: string
  date: AnyRecord | null
}

export interface CatalogueFiltersState {
  search: string
  collabId: string
  showFilters: boolean
}

export interface SortConfig {
  field: string
  direction: string
}

export interface PaginationConfig {
  page: number
  perPage: number
  total?: number
}

export type DetailType = 'lot' | 'livraison' | 'catalogue' | 'mouvements' | null

export interface DetailDataLot extends AnyRecord {
  id_lot?: number | string
  libelle_produit?: string
  categorie_produit?: string
  unite_code?: string
  unite_label?: string
  est_decimal?: boolean
  id_livraison?: number | string
  collaborateur_nom?: string
  point_vente_nom?: string
  id_point_vente?: number | string
  date_livraison?: string
  date_creation?: string
  created_by_nom?: string
  quantite_disponible?: number
  quantite_initiale?: number
  quantite_vendue?: number
  prix_initial?: number
  marge?: number
}
