// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRecord = Record<string, any>

export type ModeAffichage = 'atomique' | 'aggrege'

export interface VentesFiltersState {
  q: string
  id_point_vente: string
  id_collaborateur: string[]
  statut: string
  date: AnyRecord | null
}

export interface ProduitModalState {
  open: boolean
  idLot?: number
  libelle?: string
}

export interface AnnulationModalState {
  open: boolean
  venteId?: number
  defaultAll: boolean
  locked: boolean
}
