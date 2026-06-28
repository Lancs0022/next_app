import type { ColumnDef } from './types'

export const livraisonColumns: ColumnDef[] = [
  { key: 'id_produit', header: 'Produit Catalogue', align: 'left', width: 'min-w-[250px]', type: 'product' },
  { key: 'prix_initial', header: 'Prix Initial (Ar)', align: 'right', width: 'w-32', type: 'number', numeric: true },
  { key: 'marge', header: 'Marge (Ar)', align: 'right', width: 'w-32', type: 'number', numeric: true },
  { key: 'quantite', header: 'Quantité', align: 'center', width: 'w-24', type: 'number', numeric: true },
  { key: 'action', header: 'Action', align: 'center', width: 'w-16', type: 'action' },
]

export const venteColumns: ColumnDef[] = [
  { key: 'id_produit', header: 'Produit Catalogue', align: 'left', width: 'min-w-[250px]', type: 'product' },
  { key: 'prix_initial', header: 'Prix de vente unitaire', align: 'right', width: 'w-36', type: 'number', numeric: true },
  { key: 'quantite', header: 'Quantité vendue', align: 'center', width: 'w-28', type: 'number', numeric: true },
  { key: 'reduction', header: 'Réduction', align: 'right', width: 'w-28', type: 'number', numeric: true },
  { key: 'total', header: 'Total', align: 'right', width: 'w-32', type: 'computed', readOnly: true },
  { key: 'action', header: 'Action', align: 'center', width: 'w-16', type: 'action' },
]
