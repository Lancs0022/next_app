import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import type { AnyRecord, DetailType, SortConfig } from './stockTypes'

interface TabLivraisonsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  livraisonsState: any
  livraisonsSortConfig: SortConfig
  onSetLivraisonsSortConfig: (s: SortConfig) => void
  onFetchLivraisonsList: (args?: { page?: number; limit?: number }) => Promise<void>
  onOpenDetail: (type: DetailType, row: AnyRecord) => void
}

export default function TabLivraisons({
  livraisonsState,
  livraisonsSortConfig,
  onSetLivraisonsSortConfig,
  onFetchLivraisonsList,
  onOpenDetail,
}: TabLivraisonsProps) {
  const router = useRouter()

  const livraisonsColumns = useMemo(
    () => [
      {
        field: 'id_livraison',
        headerName: 'ID',
        width: '80px',
        minWidth: '60px',
        filterable: true,
        sortable: true,
      },
      {
        field: 'date_livraison',
        headerName: 'Date',
        width: '130px',
        minWidth: '110px',
        filterable: true,
        sortable: true,
        renderCell: (row: AnyRecord) =>
          row.date_livraison ? new Date(row.date_livraison).toLocaleDateString('fr-FR') : '-',
      },
      {
        field: 'localisation',
        headerName: 'Collaborateur / Point de vente',
        width: '260px',
        minWidth: '220px',
        renderCell: (row: AnyRecord) => (
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              {row.collaborateur_nom || 'Collaborateur -'}
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {row.point_vente_nom ||
                (row.id_point_vente ? `PV #${row.id_point_vente}` : 'Point de vente -')}
            </span>
          </div>
        ),
      },
      {
        field: 'reference',
        headerName: 'Référence',
        width: '220px',
        minWidth: '180px',
        filterable: true,
        renderCell: (row: AnyRecord) => (
          <span
            className="block truncate max-w-xs text-slate-700 dark:text-slate-200"
            title={row.reference || ''}
          >
            {row.reference || '-'}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: '80px',
        minWidth: '70px',
        getActions: (row: AnyRecord) => [
          { label: 'Voir détails', onClick: () => onOpenDetail('livraison', row) },
        ],
      },
    ],
    [onOpenDetail]
  )

  return (
    <div className="space-y-4 -mx-4 md:mx-0">
      <div className="flex justify-end mb-2 px-4 md:px-0">
        <button
          type="button"
          onClick={() => router.push('/livraisons/nouvelle')}
          className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Nouvelle livraison
        </button>
      </div>

      <ResponsiveDataTable
        columns={livraisonsColumns}
        data={((livraisonsState.items || []) as AnyRecord[]).map((it) => ({
          ...it,
          id: it.id_livraison,
        }))}
        loading={livraisonsState.loading}
        pagination={{
          page: livraisonsState.page,
          perPage: livraisonsState.limit,
          total: livraisonsState.total,
        }}
        onPageChange={(page: number) => onFetchLivraisonsList({ page })}
        onPageSizeChange={(perPage: number) =>
          onFetchLivraisonsList({ page: 1, limit: perPage })
        }
        onSort={(s: { field: string; direction: string }) => onSetLivraisonsSortConfig(s)}
        sortConfig={livraisonsSortConfig}
        onFiltersChange={() => {}}
        onRowClick={(row: AnyRecord) => onOpenDetail('livraison', row)}
      />
    </div>
  )
}
