import { DynamicEntryModule } from './types'

export const SYNC_ENDPOINTS: Record<DynamicEntryModule, string> = {
  vente: '/ventes/directe',
  livraison: '/livraisons',
  collaborateur: '/collaborateurs',
}
