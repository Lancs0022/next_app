import { useMemo } from 'react'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import type { FilterState } from '@/components/ResponsiveDataTable/ColumnFilterDropdown'
import type { AnyRecord, ModeAffichage } from './ventesTypes'
import { formatStatut, getStatutBadgeClass, STATUT_LETTER } from './ventesUtils'

interface VentesTableProps {
  mode: ModeAffichage
  ventes: AnyRecord[]
  ventesLoading: boolean
  ventesPage: number
  ventesLimit: number
  ventesTotal: number
  onPageChange: (page: number) => void
  onPageSizeChange: (limit: number) => void
  onRowClick: (row: AnyRecord) => void
  onFiltersChange: (colFilters: Record<string, FilterState>) => void
  onAnnulerVente: (venteId: number) => void
  onAnnulerLigne: (row: AnyRecord) => void
}

export default function VentesTable({
  mode,
  ventes,
  ventesLoading,
  ventesPage,
  ventesLimit,
  ventesTotal,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onFiltersChange,
  onAnnulerVente,
  onAnnulerLigne,
}: VentesTableProps) {
  const atomiqueColumns = useMemo(
    () => [
      {
        field: 'libelle_produit',
        headerName: 'Produit / Contexte',
        width: '240px',
        minWidth: '180px',
        sortable: true,
        filterable: true,
        filterKind: 'text' as const,
        renderCell: (row: AnyRecord) => (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
              {row.libelle_produit || `Lot #${row.id_lot}`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
              {row.point_vente_nom || `PV #${row.id_point_vente}`} ·{' '}
              {row.collaborateur_nom || '-'}
            </div>
          </div>
        ),
      },
      {
        field: 'montant_ht',
        headerName: 'Qté / Montant',
        width: '160px',
        minWidth: '130px',
        sortable: true,
        filterable: true,
        filterKind: 'numeric' as const,
        renderCell: (row: AnyRecord) => {
          const qty = Number(row.quantite_vendue)
          const retourne = Number(row.quantite_retournee ?? 0)
          const unite = row.unite_code ? ` ${row.unite_code}` : ''
          return (
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {qty.toLocaleString('fr-FR')}
                {unite} ×{' '}
                {row.montant_ht
                  ? `${Number(row.prix_initial ?? 0).toLocaleString('fr-FR')} Ar`
                  : '-'}
              </div>
              {retourne > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Retourné : {retourne.toLocaleString('fr-FR')}
                  {unite}
                </div>
              )}
              <div className="text-xs text-green-600 dark:text-green-400">
                Marge:{' '}
                {row.montant_marge
                  ? `${Number(row.montant_marge).toLocaleString('fr-FR')} Ar`
                  : '-'}
              </div>
            </div>
          )
        },
      },
      {
        field: 'date_vente',
        headerName: 'Dates',
        width: '180px',
        minWidth: '140px',
        sortable: true,
        filterable: true,
        filterKind: 'date' as const,
        renderCell: (row: AnyRecord) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {row.date_vente
                ? new Date(row.date_vente).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '-'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Par Admin #{row.enregistre_par_admin_id}
            </div>
          </div>
        ),
      },
      {
        field: 'statut',
        headerName: 'Statut',
        width: '60px',
        minWidth: '40px',
        sortable: true,
        filterable: true,
        filterKind: 'select' as const,
        filterOptions: ['en_attente_paiement', 'payee', 'annulee', 'retournee'],
        renderCell: (row: AnyRecord) => (
          <span
            title={formatStatut(row.statut)}
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${getStatutBadgeClass(
              row.statut
            )}`}
          >
            {STATUT_LETTER[row.statut] || '?'}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: '80px',
        minWidth: '70px',
        getActions: (row: AnyRecord) => [
          { label: 'Voir détails', onClick: () => onRowClick(row) },
          { label: 'Annuler cette ligne', onClick: () => onAnnulerLigne(row) },
        ],
      },
    ],
    [onAnnulerLigne, onRowClick]
  )

  const aggregeColumns = useMemo(
    () => [
      {
        field: 'client_nom',
        headerName: 'Client / Contexte',
        width: '240px',
        minWidth: '180px',
        sortable: true,
        renderCell: (row: AnyRecord) => (
          <div>
            <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
              {row.client_nom || 'Client anonyme'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
              {row.point_vente_nom || `PV #${row.id_point_vente}`}
            </div>
          </div>
        ),
      },
      {
        field: 'montant_total',
        headerName: 'Montant',
        width: '160px',
        minWidth: '130px',
        sortable: true,
        renderCell: (row: AnyRecord) => (
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {row.montant_total
                ? `${Number(row.montant_total).toLocaleString('fr-FR')} Ar`
                : '-'}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              Marge:{' '}
              {row.montant_marge
                ? `${Number(row.montant_marge).toLocaleString('fr-FR')} Ar`
                : '-'}
            </div>
          </div>
        ),
      },
      {
        field: 'date_vente',
        headerName: 'Dates',
        width: '180px',
        minWidth: '140px',
        sortable: true,
        renderCell: (row: AnyRecord) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {row.date_vente
                ? new Date(row.date_vente).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '-'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Créé par {row.cree_par_nom || '-'}
            </div>
          </div>
        ),
      },
      {
        field: 'statut',
        headerName: 'Statut',
        width: '60px',
        minWidth: '40px',
        sortable: true,
        renderCell: (row: AnyRecord) => (
          <span
            title={formatStatut(row.statut)}
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${getStatutBadgeClass(
              row.statut
            )}`}
          >
            {STATUT_LETTER[row.statut] || '?'}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: '80px',
        minWidth: '70px',
        getActions: (row: AnyRecord) => [
          { label: 'Voir détails', onClick: () => onRowClick(row) },
          { label: 'Annuler la vente', onClick: () => onAnnulerVente(row.id_vente) },
        ],
      },
    ],
    [onAnnulerVente, onRowClick]
  )

  const columns = mode === 'atomique' ? atomiqueColumns : aggregeColumns
  const tableData = useMemo(
    () =>
      ventes.map((v) => ({
        ...v,
        id: mode === 'atomique' ? v.id_vente_article : v.id_vente,
      })),
    [ventes, mode]
  )

  return (
    <ResponsiveDataTable
      columns={columns}
      data={tableData}
      loading={ventesLoading}
      pagination={{
        page: ventesPage,
        perPage: ventesLimit,
        total: ventesTotal,
      }}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={onRowClick}
      onFiltersChange={onFiltersChange}
    />
  )
}
