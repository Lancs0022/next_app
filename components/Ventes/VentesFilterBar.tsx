import { useRouter } from 'next/navigation'
import MultiSelectTags from '@/components/MultiSelectTags'
import DateRangeFilter from '@/components/DateRangeFilter'
import { getPvId } from '@/lib/pointVente'
import type { FilterState } from '@/components/ResponsiveDataTable/ColumnFilterDropdown'
import type { AnyRecord, ModeAffichage, VentesFiltersState } from './ventesTypes'
import { formatStatut } from './ventesUtils'

interface VentesFilterBarProps {
  mode: ModeAffichage
  onSetMode: (m: ModeAffichage) => void
  filters: VentesFiltersState
  onSetFilters: React.Dispatch<React.SetStateAction<VentesFiltersState>>
  pointsDeVente: AnyRecord[]
  collaborateurs: AnyRecord[]
  columnFilters: Record<string, FilterState>
  onClearColumnFilter: (field: string) => void
}

export default function VentesFilterBar({
  mode,
  onSetMode,
  filters,
  onSetFilters,
  pointsDeVente,
  collaborateurs,
  columnFilters,
  onClearColumnFilter,
}: VentesFilterBarProps) {
  const router = useRouter()

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.id_point_vente ||
      filters.id_collaborateur.length > 0 ||
      filters.statut ||
      filters.date ||
      Object.keys(columnFilters).length > 0
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
      <div className="space-y-3">
        {/* Ligne supérieure : Bascule de Mode + Bouton Nouvelle Vente */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Mode d&apos;affichage
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => onSetMode('atomique')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === 'atomique'
                    ? 'bg-primary text-white'
                    : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Atomique
              </button>
              <button
                type="button"
                onClick={() => onSetMode('aggrege')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === 'aggrege'
                    ? 'bg-primary text-white'
                    : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Agrégé
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/ventes/nouvelle')}
              className="inline-flex items-center justify-center px-3 md:px-4 py-2 rounded-lg bg-primary hover:bg-primary-strong text-white text-sm font-medium transition-colors"
            >
              <span className="text-lg leading-none mr-1">+</span>
              <span>Nouvelle vente</span>
            </button>
          </div>
        </div>

        {/* Grille filtres ligne 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Recherche
            </label>
            <input
              type="text"
              placeholder="Rechercher une vente..."
              value={filters.q}
              onChange={(e) => onSetFilters((prev) => ({ ...prev, q: e.target.value }))}
              className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Point de vente
            </label>
            <select
              value={filters.id_point_vente}
              onChange={(e) =>
                onSetFilters((prev) => ({ ...prev, id_point_vente: e.target.value }))
              }
              className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option key="all-pv" value="">
                Tous les points de vente
              </option>
              {pointsDeVente.map((pv) => {
                const id = getPvId(pv)
                return (
                  <option key={id} value={id}>
                    {pv.nom}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Statut
            </label>
            <select
              value={filters.statut}
              onChange={(e) => onSetFilters((prev) => ({ ...prev, statut: e.target.value }))}
              className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option key="all-statuts" value="">
                Tous les statuts
              </option>
              <option key="en_attente_paiement" value="en_attente_paiement">
                En attente
              </option>
              <option key="payee" value="payee">
                Payée
              </option>
              <option key="annulee" value="annulee">
                Annulée
              </option>
              <option key="retournee" value="retournee">
                Retournée
              </option>
            </select>
          </div>
        </div>

        {/* Grille filtres ligne 2 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <DateRangeFilter
              label="Période"
              value={filters.date}
              onChange={(val) => onSetFilters((prev) => ({ ...prev, date: val }))}
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
              value={filters.id_collaborateur}
              onChange={(val) => onSetFilters((prev) => ({ ...prev, id_collaborateur: val }))}
              placeholder="Tous les collaborateurs"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() =>
                onSetFilters({
                  q: '',
                  id_point_vente: '',
                  id_collaborateur: [],
                  statut: '',
                  date: null,
                })
              }
              className="w-full h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Chips des filtres actifs */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Filtres actifs :
            </span>

            {filters.q && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20">
                Recherche: {filters.q}
                <button
                  onClick={() => onSetFilters((prev) => ({ ...prev, q: '' }))}
                  className="hover:text-primary-strong"
                >
                  ×
                </button>
              </span>
            )}

            {filters.id_point_vente &&
              (() => {
                const pv = pointsDeVente.find(
                  (p) => getPvId(p) === String(filters.id_point_vente)
                )
                return pv ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/15">
                    PV: {pv.nom}
                    <button
                      onClick={() => {
                        onSetFilters((prev) => ({ ...prev, id_point_vente: '' }))
                        onClearColumnFilter('point_vente_nom')
                      }}
                      className="hover:text-primary-strong dark:hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                ) : null
              })()}

            {filters.id_collaborateur.map((collabId) => {
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
                      onSetFilters((prev) => ({
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

            {filters.statut && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                Statut: {formatStatut(filters.statut)}
                <button
                  onClick={() => {
                    onSetFilters((prev) => ({ ...prev, statut: '' }))
                    onClearColumnFilter('statut')
                  }}
                  className="hover:text-purple-900 dark:hover:text-purple-100"
                >
                  ×
                </button>
              </span>
            )}

            {filters.date && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                Période: {filters.date.dateMin} - {filters.date.dateMax}
                <button
                  onClick={() => {
                    onSetFilters((prev) => ({ ...prev, date: null }))
                    onClearColumnFilter('date_vente')
                  }}
                  className="hover:text-orange-900 dark:hover:text-orange-100"
                >
                  ×
                </button>
              </span>
            )}

            {Object.entries(columnFilters).map(([field, state]) => {
              if (
                field === 'point_vente_nom' ||
                field === 'statut' ||
                field === 'date_vente'
              )
                return null
              return (
                <span
                  key={field}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  {field}:{' '}
                  {state.text ||
                    (state.select && state.select.join(', ')) ||
                    (state.numeric && `${state.numeric.min}-${state.numeric.max}`) ||
                    'Filtre'}
                  <button
                    onClick={() => onClearColumnFilter(field)}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
