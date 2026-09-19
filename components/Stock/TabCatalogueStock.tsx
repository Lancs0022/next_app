import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import TypeaheadSelect from '@/components/TypeaheadSelect'
import type { AnyRecord, DetailType } from './stockTypes'

interface TabCatalogueStockProps {
  catalogueRows: AnyRecord[]
  catalogueStockLoading: boolean
  catalogueFilterCollab: string
  catalogueSearch: string
  showCatalogueFilters: boolean
  collaborateurs: AnyRecord[]
  onSetCatalogueFilterCollab: (v: string) => void
  onSetCatalogueSearch: (v: string) => void
  onSetShowCatalogueFilters: React.Dispatch<React.SetStateAction<boolean>>
  onOpenCatalogueDrawer: () => void
  onOpenCatalogueExplorer: (row: AnyRecord) => void
  onOpenDetail: (type: DetailType, row: AnyRecord) => void
  onOpenEditSeuil: (produit: AnyRecord) => void
}

export default function TabCatalogueStock({
  catalogueRows,
  catalogueStockLoading,
  catalogueFilterCollab,
  catalogueSearch,
  showCatalogueFilters,
  collaborateurs,
  onSetCatalogueFilterCollab,
  onSetCatalogueSearch,
  onSetShowCatalogueFilters,
  onOpenCatalogueDrawer,
  onOpenCatalogueExplorer,
  onOpenDetail,
  onOpenEditSeuil,
}: TabCatalogueStockProps) {
  const [pagination, setPagination] = useState({ page: 1, perPage: 20 })
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: string }>({
    key: null,
    direction: 'asc',
  })
  const [, setFiltersState] = useState<AnyRecord>({})

  const catalogueColumns = useMemo(
    () => [
      {
        field: 'libelle',
        headerName: 'Produit',
        width: '220px',
        minWidth: '180px',
        sortable: true,
        filterable: true,
        renderCell: (row: AnyRecord) => (
          <div className="flex flex-col gap-1">
            <div
              className="font-medium text-slate-900 dark:text-white truncate"
              title={row.libelle || 'Sans nom'}
            >
              {row.libelle || 'Sans nom'}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {row.collaborateur_nom || 'Collaborateur -'}
            </span>
          </div>
        ),
      },
      {
        field: 'categorie',
        headerName: 'Catégorie',
        width: '130px',
        minWidth: '100px',
        sortable: true,
        filterable: true,
      },
      {
        field: 'stock_seuil',
        headerName: 'Stock / Seuil',
        width: '140px',
        minWidth: '120px',
        sortable: true,
        renderCell: (row: AnyRecord) => {
          const qty = row.quantite_en_stock || 0
          const seuil = row.seuil_alerte
          const isAlert = seuil != null && qty <= Number(seuil)
          return (
            <div className="flex flex-col gap-0.5 text-xs">
              <div
                className={`font-medium ${
                  isAlert ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {qty.toLocaleString('fr-FR')}
                {row.unite ? ` ${row.unite}` : ''}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Seuil: {seuil != null ? Number(seuil).toLocaleString('fr-FR') : '-'}
              </div>
            </div>
          )
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: '80px',
        minWidth: '70px',
        getActions: (row: AnyRecord) => [
          { label: 'Voir les lots', onClick: () => onOpenCatalogueExplorer(row) },
          { label: 'Voir détails', onClick: () => onOpenDetail('catalogue', row) },
          { label: 'Modifier le seuil', onClick: () => onOpenEditSeuil(row) },
        ],
      },
    ],
    [onOpenCatalogueExplorer, onOpenDetail, onOpenEditSeuil]
  )

  return (
    <div className="space-y-4 -mx-4 md:mx-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 px-4 md:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSetShowCatalogueFilters((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 h-[38px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Filter size={14} />
            Filtres
          </button>
          {catalogueFilterCollab && (
            <span className="px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              Collaborateur:{' '}
              {collaborateurs.find((c) => String(c.id_collaborateur) === catalogueFilterCollab)
                ?.nom || catalogueFilterCollab}
            </span>
          )}
          {catalogueSearch && (
            <span className="px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              Recherche: {catalogueSearch}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenCatalogueDrawer}
          className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Ajouter au catalogue
        </button>
      </div>

      {showCatalogueFilters && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <TypeaheadSelect
                label="Collaborateur"
                options={collaborateurs.map((c) => ({
                  value: String(c.id_collaborateur),
                  label: c.nom,
                }))}
                value={catalogueFilterCollab}
                onChange={(value) => onSetCatalogueFilterCollab(value)}
                placeholder="Choisir un collaborateur"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Produit
              </label>
              <input
                type="text"
                value={catalogueSearch}
                placeholder="Recherche produit"
                onChange={(e) => onSetCatalogueSearch(e.target.value)}
                className="w-full h-[42px] px-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onSetCatalogueFilterCollab('')
                  onSetCatalogueSearch('')
                }}
                className="w-full h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      <ResponsiveDataTable
        columns={catalogueColumns}
        data={catalogueRows}
        pagination={{ ...pagination, total: catalogueRows.length }}
        onPageChange={(page: number) => setPagination((prev) => ({ ...prev, page }))}
        onPageSizeChange={(perPage: number) =>
          setPagination((prev) => ({ ...prev, perPage, page: 1 }))
        }
        onSort={(s: { field: string; direction: string }) =>
          setSortConfig({ key: s.field, direction: s.direction })
        }
        sortConfig={{ field: sortConfig.key || '', direction: sortConfig.direction }}
        onFiltersChange={(f: AnyRecord) => {
          setFiltersState(f)
          setPagination((prev) => ({ ...prev, page: 1 }))
        }}
        loading={catalogueStockLoading}
        onRowClick={(row: AnyRecord) => onOpenCatalogueExplorer(row)}
      />
    </div>
  )
}
