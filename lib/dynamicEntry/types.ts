export type DynamicEntryModule = 'livraison' | 'vente'

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending'

export interface ProductOption {
  value: string | number
  label: string
  id_collaborateur?: string | number
  categorie?: string
}

export interface EntryRow {
  id: string
  id_produit: string
  prix_initial: string
  marge: string
  quantite: string
  reduction: string
  id_lot: string
  description: string
}

export interface CollaboratorTab {
  id: string
  client_uuid: string
  id_collaborateur: string
  nom: string
  rows: EntryRow[]
}

export interface SessionMeta {
  date: string
  id_pdv: string
  reference: string
  comment: string
  commentaire?: string
  id_client: string
}

export interface SessionSnapshot {
  module: DynamicEntryModule
  meta: SessionMeta
  activeTabId: string
  tabs: CollaboratorTab[]
  updatedAt: number
}

export interface SyncQueueItem {
  client_uuid: string
  module: DynamicEntryModule
  id_collaborateur: number
  id_pdv: number
  date_livraison?: string
  date_vente?: string
  reference?: string | null
  commentaire?: string | null
  id_client?: number
  lines: Array<Record<string, unknown>>
  enqueuedAt: number
}

export interface ColumnDef {
  key: keyof EntryRow | 'total' | 'action'
  header: string
  align: 'left' | 'right' | 'center'
  width: string
  type: 'product' | 'number' | 'computed' | 'action'
  numeric?: boolean
  readOnly?: boolean
}

export interface MetricsSummary {
  totalArticles: number
  totalCost: number
  totalProfit: number
}
