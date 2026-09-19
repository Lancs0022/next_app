import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import MultiSelectTags from '@/components/MultiSelectTags'
import DateRangeFilter from '@/components/DateRangeFilter'
import type { ActionMenuId } from '@/components/Stock/ActionMenu'
import type { LotActif, ProduitCatalogue } from '@/components/Stock/types'
import type { AnyRecord, DetailType, LotsFiltersState, SortConfig } from './stockTypes'

interface TabLotsDisponiblesProps {
  lotsDisponibles: AnyRecord[]
  lotsLoading: boolean
  lotsPage: number
  lotsLimit: number
  lotsTotal: number
  lotsSortConfig: SortConfig
  lotsFilters: LotsFiltersState
  showLotsAdvancedFilters: boolean
  pointsDeVente: AnyRecord[]
  collaborateurs: AnyRecord[]
  onSetLotsFilters: React.Dispatch<React.SetStateAction<LotsFiltersState>>
  onSetShowLotsAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>
  onSetLotsSortConfig: (s: SortConfig) => void
  onFetchLots: (args?: { page?: number; limit?: number }) => Promise<void>
  onOpenDetail: (type: DetailType, row: AnyRecord) => void
  onOpenMouvements: (lot: AnyRecord) => void
  onOpenAjustement: (lot: AnyRecord) => void
  onCatalogueLotAction: (actionId: ActionMenuId, lot: LotActif) => void
  toProduitCatalogue: (row: AnyRecord) => ProduitCatalogue
  toLotActif: (row: AnyRecord, p: ProduitCatalogue) => LotActif
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void
}

export default function TabLotsDisponibles({
  lotsDisponibles,
  lotsLoading,
  lotsPage,
  lotsLimit,
  lotsTotal,
  lotsSortConfig,
  lotsFilters,
  showLotsAdvancedFilters,
  pointsDeVente,
  collaborateurs,
  onSetLotsFilters,
  onSetShowLotsAdvancedFilters,
  onSetLotsSortConfig,
  onFetchLots,
  onOpenDetail,
  onOpenMouvements,
  onOpenAjustement,
  onCatalogueLotAction,
  toProduitCatalogue,
  toLotActif,
  showToast,
}: TabLotsDisponiblesProps) {
  const router = useRouter()

  const hasLotsAdvancedFilters = Boolean(
    lotsFilters.id_point_vente.length > 0 ||
      lotsFilters.id_collaborateur.length > 0 ||
      lotsFilters.qte_op ||
      lotsFilters.qte_value ||
      lotsFilters.date
  )

  const lotsColumns = useMemo(
    () => [
      {
        field: 'produit',
        headerName: 'Produit',
        width: '220px',
        minWidth: '180px',
        sortable: true,
        renderCell: (row: AnyRecord) => (
          <div className="flex flex-col gap-1">
            <div
              className="font-medium text-slate-900 dark:text-white truncate"
              title={row.libelle_produit || 'Sans nom'}
            >
              {row.libelle_produit || 'Sans nom'}
            </div>
            <div className="flex flex-wrap gap-1 items-center">
              {row.categorie_produit && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary dark:bg-primary/15">
                  {row.categorie_produit}
                </span>
              )}
              {row.unite_code && (
                <span
                  title={`Unité : ${row.unite_label || row.unite_code}${
                    row.est_decimal ? ' — décimal' : ' — entier'
                  }`}
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${
                    row.est_decimal
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                  }`}
                >
                  {row.unite_code}
                  {row.est_decimal && (
                    <span className="text-[9px] opacity-60 font-sans">dec</span>
                  )}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        field: 'lot_localisation',
        headerName: 'Lot / Localisation',
        width: '240px',
        minWidth: '200px',
        renderCell: (row: AnyRecord) => (
          <div className="flex flex-col gap-0.5 text-xs">
            <div className="text-slate-700 dark:text-slate-300">
              {row.id_livraison ? `Livraison n°${row.id_livraison}` : 'Livraison -'}
            </div>
            <div className="text-slate-600 dark:text-slate-400">Lot #{row.id_lot}</div>
            <div className="text-slate-600 dark:text-slate-400">
              {row.collaborateur_nom || 'Collaborateur -'} ·{' '}
              {row.point_vente_nom || `PV #${row.id_point_vente}`}
            </div>
          </div>
        ),
      },
      {
        field: 'qte_prix',
        headerName: 'Qté / Prix',
        width: '160px',
        minWidth: '140px',
        sortable: true,
        renderCell: (row: AnyRecord) => (
          <div className="flex flex-col gap-0.5 text-xs">
            <div className="font-medium text-slate-900 dark:text-white">
              {row.quantite_disponible || 0} / {row.quantite_initiale || 0}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Prix:{' '}
              {row.prix_initial
                ? `${Number(row.prix_initial).toLocaleString('fr-FR')} Ar`
                : '-'}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Marge:{' '}
              {row.marge ? `${Number(row.marge).toLocaleString('fr-FR')} Ar` : '-'}
            </div>
          </div>
        ),
      },
      {
        field: 'dates',
        headerName: 'Dates',
        width: '180px',
        minWidth: '160px',
        sortable: true,
        renderCell: (row: AnyRecord) => (
          <div className="flex flex-col gap-0.5 text-xs">
            <div className="text-slate-700 dark:text-slate-300">
              <span className="font-medium">Arrivé:</span>{' '}
              {row.date_livraison
                ? new Date(row.date_livraison).toLocaleDateString('fr-FR')
                : '-'}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">Créé:</span>{' '}
              {row.date_creation
                ? new Date(row.date_creation).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '-'}
            </div>
          </div>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: '80px',
        minWidth: '70px',
        getActions: (row: AnyRecord) => {
          const actions = [
            { label: 'Voir détails', onClick: () => onOpenDetail('lot', row) },
            { label: 'Historique mouvements', onClick: () => onOpenMouvements(row) },
            {
              label: 'Annuler des ventes…',
              onClick: () =>
                onCatalogueLotAction('annuler', toLotActif(row, toProduitCatalogue(row))),
            },
          ]
          if (row.quantite_disponible > 0) {
            actions.push({ label: 'Ajuster stock', onClick: () => onOpenAjustement(row) })
            actions.push({
              label: 'Transférer',
              onClick: () => showToast(`Transfert du lot #${row.id_lot}: bientôt`, 'info'),
            })
          }
          return actions
        },
      },
    ],
    [
      onCatalogueLotAction,
      onOpenAjustement,
      onOpenDetail,
      onOpenMouvements,
      showToast,
      toLotActif,
      toProduitCatalogue,
    ]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Recherche
            </label>
            <input
              type="text"
              placeholder="Rechercher un lot..."
              value={lotsFilters.q}
              onChange={(e) => onSetLotsFilters((prev) => ({ ...prev, q: e.target.value }))}
              className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500"
            />
          </div>

          {/* Switch lots épuisés — visible en permanence */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none h-[42px] px-3">
            <div
              onClick={() =>
                onSetLotsFilters((prev) => ({ ...prev, showEpuise: !prev.showEpuise }))
              }
              className={`relative w-9 h-5 rounded-full transition-colors ${
                lotsFilters.showEpuise ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  lotsFilters.showEpuise ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
              Voir épuisés
            </span>
          </label>

          <button
            type="button"
            onClick={() => onSetShowLotsAdvancedFilters((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                showLotsAdvancedFilters ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Filtres avancés
          </button>
        </div>

        {showLotsAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Points de vente
              </label>
              <MultiSelectTags
                options={pointsDeVente.map((pv) => ({
                  value: String(pv.id_pdv),
                  label: pv.nom,
                }))}
                value={lotsFilters.id_point_vente}
                onChange={(val) =>
                  onSetLotsFilters((prev) => ({ ...prev, id_point_vente: val }))
                }
                placeholder="Tous les PV"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Collaborateurs
              </label>
              <MultiSelectTags
                options={collaborateurs.map((c) => ({
                  value: String(c.id_collaborateur),
                  label: c.nom,
                }))}
                value={lotsFilters.id_collaborateur}
                onChange={(val) =>
                  onSetLotsFilters((prev) => ({ ...prev, id_collaborateur: val }))
                }
                placeholder="Tous les collaborateurs"
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Quantité
                </label>
                <select
                  value={lotsFilters.qte_op}
                  onChange={(e) =>
                    onSetLotsFilters((prev) => ({ ...prev, qte_op: e.target.value }))
                  }
                  className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">Opérateur</option>
                  <option value="=">=</option>
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Valeur
                </label>
                <input
                  type="number"
                  placeholder="Valeur"
                  value={lotsFilters.qte_value}
                  onChange={(e) =>
                    onSetLotsFilters((prev) => ({ ...prev, qte_value: e.target.value }))
                  }
                  className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Période
              </label>
              <DateRangeFilter
                value={lotsFilters.date}
                onChange={(val) => onSetLotsFilters((prev) => ({ ...prev, date: val }))}
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  onSetLotsFilters({
                    q: '',
                    id_point_vente: [],
                    id_collaborateur: [],
                    qte_op: '',
                    qte_value: '',
                    showEpuise: false,
                    date: null,
                  })
                }
                className="w-full h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {(lotsFilters.q || hasLotsAdvancedFilters) && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Filtres actifs :
            </span>
            {lotsFilters.q && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20">
                Recherche: {lotsFilters.q}
                <button
                  onClick={() => onSetLotsFilters((prev) => ({ ...prev, q: '' }))}
                  className="hover:text-primary-strong"
                >
                  ×
                </button>
              </span>
            )}
            {lotsFilters.id_point_vente.map((pvId) => {
              const pv = pointsDeVente.find((p) => String(p.id_pdv) === pvId)
              return pv ? (
                <span
                  key={pvId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/15"
                >
                  PV: {pv.nom}
                  <button
                    onClick={() =>
                      onSetLotsFilters((prev) => ({
                        ...prev,
                        id_point_vente: prev.id_point_vente.filter((id) => id !== pvId),
                      }))
                    }
                    className="hover:text-primary-strong dark:hover:text-primary"
                  >
                    ×
                  </button>
                </span>
              ) : null
            })}
            {lotsFilters.id_collaborateur.map((collabId) => {
              const collab = collaborateurs.find(
                (c) => String(c.id_collaborateur) === collabId
              )
              return collab ? (
                <span
                  key={collabId}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                >
                  Collab: {collab.nom}
                  <button
                    onClick={() =>
                      onSetLotsFilters((prev) => ({
                        ...prev,
                        id_collaborateur: prev.id_collaborateur.filter((id) => id !== collabId),
                      }))
                    }
                    className="hover:text-green-900 dark:hover:text-green-100"
                  >
                    ×
                  </button>
                </span>
              ) : null
            })}
            {lotsFilters.qte_op && lotsFilters.qte_value && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                Qté {lotsFilters.qte_op} {lotsFilters.qte_value}
                <button
                  onClick={() =>
                    onSetLotsFilters((prev) => ({ ...prev, qte_op: '', qte_value: '' }))
                  }
                  className="hover:text-purple-900 dark:hover:text-purple-100"
                >
                  ×
                </button>
              </span>
            )}
            {lotsFilters.date && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                Période: {lotsFilters.date.dateMin} - {lotsFilters.date.dateMax}
                <button
                  onClick={() => onSetLotsFilters((prev) => ({ ...prev, date: null }))}
                  className="hover:text-orange-900 dark:hover:text-orange-100"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => router.push('/livraisons/nouvelle')}
          className="px-3 md:px-4 py-2 bg-[#7e3560] hover:bg-[#6a2f55] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Ajouter une marchandise
        </button>
      </div>

      <ResponsiveDataTable
        columns={lotsColumns}
        data={lotsDisponibles.map((lot) => ({ ...lot, id: lot.id_lot }))}
        loading={lotsLoading}
        pagination={{ page: lotsPage, perPage: lotsLimit, total: lotsTotal }}
        onPageChange={(page: number) => onFetchLots({ page })}
        onPageSizeChange={(perPage: number) => onFetchLots({ page: 1, limit: perPage })}
        onSort={(s: { field: string; direction: string }) => onSetLotsSortConfig(s)}
        sortConfig={lotsSortConfig}
        onFiltersChange={() => {}}
        onRowClick={(row: AnyRecord) => onOpenDetail('lot', row)}
      />
    </div>
  )
}
