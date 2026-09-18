import React, { useMemo } from 'react'
import { Users, RefreshCcw, ChevronDown } from 'lucide-react'
import TypeaheadSelect from '@/components/TypeaheadSelect'
import DateRangeFilter from '@/components/DateRangeFilter'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import {
  Souscription,
  SouscriptionDisplayRow,
  FiltresSouscription,
  DateFilterValue,
} from './abonnementsTypes'
import {
  Avatar,
  RenewBadge,
  SitBadge,
  EchBadge,
  PayLabel,
  formatMontant,
  formatDate,
  PERIODICITE_LABELS,
  FILTRES,
  EmptyState,
  InlineActionsMenu,
} from './abonnementsUtils'

interface TabSouscriptionsProps {
  souscriptions: Souscription[]
  souscriptionsLoading: boolean
  displayData: SouscriptionDisplayRow[]
  totalCount: number
  page: number
  perPage: number
  sortConfig: { field: string; direction: string }
  filtreActif: FiltresSouscription
  showSousFilters: boolean
  filtreCollabInput: string
  filtreOffreInput: string
  filtreDateDebut: DateFilterValue | null
  groupByCollab: boolean
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
  onSort: (cfg: { field: string; direction: string }) => void
  onSetFiltreActif: (f: FiltresSouscription) => void
  onToggleShowSousFilters: () => void
  onSetFiltreCollabInput: (v: string) => void
  onSetFiltreOffreInput: (v: string) => void
  onSetFiltreDateDebut: (v: DateFilterValue | null) => void
  onSetGroupByCollab: (updater: (prev: boolean) => boolean) => void
  onFetchEcheancesForSouscription: (id: number) => void
  onToggleShowAllEcheances: (id: number) => void
  onOpenSouscrire: () => void
  onOpenDrawerSouscription: (id: number) => void
}

export default function TabSouscriptions({
  souscriptions,
  souscriptionsLoading,
  displayData,
  totalCount,
  page,
  perPage,
  sortConfig,
  filtreActif,
  showSousFilters,
  filtreCollabInput,
  filtreOffreInput,
  filtreDateDebut,
  groupByCollab,
  onPageChange,
  onPageSizeChange,
  onSort,
  onSetFiltreActif,
  onToggleShowSousFilters,
  onSetFiltreCollabInput,
  onSetFiltreOffreInput,
  onSetFiltreDateDebut,
  onSetGroupByCollab,
  onFetchEcheancesForSouscription,
  onToggleShowAllEcheances,
  onOpenSouscrire,
  onOpenDrawerSouscription,
}: TabSouscriptionsProps) {
  // Options de filtrage
  const optionsCollab = useMemo(
    () => [
      ...new Map(
        souscriptions.map((s) => [
          s.id_collaborateur,
          { value: String(s.id_collaborateur), label: s.collaborateur_nom },
        ])
      ).values(),
    ],
    [souscriptions]
  )

  const optionsOffre = useMemo(
    () => [
      ...new Map(
        souscriptions.map((s) => [
          s.id_abonnement,
          { value: String(s.id_abonnement), label: s.abonnement_nom },
        ])
      ).values(),
    ],
    [souscriptions]
  )

  const hasFiltersActifs = !!(filtreCollabInput || filtreOffreInput || filtreDateDebut)

  const columns = useMemo(
    () => [
      // ── Col 1 : Collaborateur ──────────────────────────────────────────────
      {
        field: 'collaborateur_nom',
        headerName: 'Collaborateur',
        sortable: true,
        minWidth: '180px',
        width: '22%',
        renderCell: (row: any, depth: number = 0) => {
          if (row._type === 'ech_header') {
            return (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-4">
                Période
              </span>
            )
          }

          if (row._type === 'ech_footer') {
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleShowAllEcheances(row.id_souscription)
                }}
                className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline py-1 pl-4"
              >
                {row.expanded ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                    Réduire à 5 échéances
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Voir les {row.remainingCount} autres échéances
                  </>
                )}
              </button>
            )
          }

          if (row._type === 'collab') {
            return (
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={row.collaborateur_nom} size={26} />
                <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {row.collaborateur_nom}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  {row.nb_souscriptions} souscription{row.nb_souscriptions > 1 ? 's' : ''}
                </span>
                {row.nb_impayees > 0 && (
                  <span className="text-[11px] font-semibold text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded shrink-0">
                    {row.nb_impayees} impayée{row.nb_impayees > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )
          }

          if (row._type === 'ech') {
            const isPast = row.statut === 'payee' || row.statut === 'impayee'
            return (
              <div className="flex items-center gap-2 text-xs py-0.5 pl-2">
                <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-600 shrink-0 ml-1" />
                <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 2v6h8"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  className={`font-medium whitespace-nowrap ${
                    isPast ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatDate(row.periode_debut)}{' '}
                  <span className="text-slate-400 font-normal">→</span>{' '}
                  {formatDate(row.periode_fin)}
                </span>
              </div>
            )
          }

          // Souscription
          if (depth === 0) {
            return (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={row.collaborateur_nom} size={24} />
                <span className="font-medium text-slate-900 dark:text-white text-sm truncate">
                  {row.collaborateur_nom}
                </span>
              </div>
            )
          }

          return (
            <div className="flex items-center gap-2">
              <RenewBadge auto={row.renouvellement_auto} />
            </div>
          )
        },
        renderMobilePrimary: (row: any, depth: number = 0) => {
          if (row._type === 'ech_header') return null

          if (row._type === 'ech_footer') {
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleShowAllEcheances(row.id_souscription)
                }}
                className="text-xs text-primary font-medium py-1"
              >
                {row.expanded
                  ? 'Réduire à 5 échéances'
                  : `Voir les ${row.remainingCount} autres échéances`}
              </button>
            )
          }

          if (row._type === 'collab') {
            return (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={row.collaborateur_nom} size={28} />
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">
                    {row.collaborateur_nom}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {row.nb_souscriptions} souscription{row.nb_souscriptions > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )
          }

          if (row._type === 'ech') {
            const paye = row.montant_paye ?? (row.montant - (row.reste ?? 0))
            return (
              <div className="text-xs">
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {formatDate(row.periode_debut)} → {formatDate(row.periode_fin)}
                </div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Montant : {formatMontant(row.montant)} · Payé : {formatMontant(paye)}
                </div>
                {row.reste > 0 && (
                  <div className="text-red-600 dark:text-red-400 font-medium">
                    Restant : {formatMontant(row.reste)}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {depth === 0 && <Avatar name={row.collaborateur_nom} size={22} />}
                <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                  {row.collaborateur_nom}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5 leading-tight">
                {row.abonnement_nom}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formatMontant(row.montant)} ·{' '}
                {PERIODICITE_LABELS[row.abonnement_periodicite] ?? row.abonnement_periodicite}
              </p>
            </div>
          )
        },
        renderMobileSecondary: (row: any) => {
          if (row._type === 'ech_header' || row._type === 'ech_footer') return null
          if (row._type === 'collab') {
            return <PayLabel statut={row.globalPayStatut} />
          }
          if (row._type === 'ech') {
            return <EchBadge statut={row.statut} />
          }
          return (
            <div className="flex flex-col items-end gap-1">
              <SitBadge statut={row.statut} />
              <PayLabel statut={row.paiementStatut} />
            </div>
          )
        },
      },

      // ── Col 2 : Offre ──────────────────────────────────────────────────────
      {
        field: 'abonnement_nom',
        headerName: 'Offre',
        sortable: true,
        minWidth: '160px',
        width: '26%',
        renderCell: (row: any) => {
          if (row._type === 'ech_header') {
            return (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Montant total
              </span>
            )
          }
          if (row._type === 'ech_footer' || row._type === 'collab') return null

          if (row._type === 'ech') {
            return (
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {formatMontant(row.montant)}
              </span>
            )
          }

          return (
            <div className="min-w-0">
              <div className="font-medium text-slate-900 dark:text-white text-sm truncate leading-tight">
                {row.abonnement_nom}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                {formatMontant(row.montant)} ·{' '}
                {PERIODICITE_LABELS[row.abonnement_periodicite] ?? row.abonnement_periodicite}
              </div>
            </div>
          )
        },
      },

      // ── Col 3 : Contrat ────────────────────────────────────────────────────
      {
        field: 'date_debut',
        headerName: 'Contrat',
        sortable: true,
        minWidth: '150px',
        width: '20%',
        renderCell: (row: any, depth: number = 0) => {
          if (row._type === 'ech_header') {
            return (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Statut
              </span>
            )
          }
          if (row._type === 'ech_footer' || row._type === 'collab') return null

          if (row._type === 'ech') {
            return <EchBadge statut={row.statut} />
          }

          return (
            <div className="min-w-0 text-xs leading-tight">
              <div className="text-slate-900 dark:text-white">Depuis le {formatDate(row.date_debut)}</div>
              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                {row.date_fin ? `→ ${formatDate(row.date_fin)}` : 'Sans date de fin'}
              </div>
              {depth === 0 && (
                <div className="mt-1.5">
                  <RenewBadge auto={row.renouvellement_auto} />
                </div>
              )}
            </div>
          )
        },
      },

      // ── Col 4 : Situation ──────────────────────────────────────────────────
      {
        field: 'statut',
        headerName: 'Situation',
        sortable: true,
        minWidth: '130px',
        width: '16%',
        renderCell: (row: any) => {
          if (row._type === 'ech_header') {
            return (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Date paiement
              </span>
            )
          }
          if (row._type === 'ech_footer') return null

          if (row._type === 'collab') {
            return <PayLabel statut={row.globalPayStatut} />
          }

          if (row._type === 'ech') {
            return (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {row.date_paiement
                  ? `payé le ${formatDate(row.date_paiement)}`
                  : row.statut === 'a_venir'
                  ? 'Prévue'
                  : '—'}
              </span>
            )
          }

          return (
            <div className="flex flex-col gap-1">
              <div>
                <SitBadge statut={row.statut} />
              </div>
              <div>
                <PayLabel statut={row.paiementStatut} />
              </div>
            </div>
          )
        },
      },

      // ── Col 5 : Prochaine échéance / Règlement financier ───────────────────
      {
        field: 'prochaine_echeance',
        headerName: 'Prochaine échéance',
        minWidth: '150px',
        width: '15%',
        renderCell: (row: any) => {
          if (row._type === 'ech_header') {
            return (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Payé / Reste dû
              </span>
            )
          }
          if (row._type === 'ech_footer' || row._type === 'collab') return null

          if (row._type === 'ech') {
            const paye = row.montant_paye ?? (row.montant - (row.reste ?? 0))
            return (
              <div className="flex flex-col text-xs leading-tight">
                <span
                  className={
                    paye > 0
                      ? 'text-slate-700 dark:text-slate-300 font-medium'
                      : 'text-slate-400 dark:text-slate-500'
                  }
                >
                  Payé : {formatMontant(paye)}
                </span>
                {row.reste > 0 ? (
                  <span className="text-red-600 dark:text-red-400 font-medium mt-0.5">
                    Restant : {formatMontant(row.reste)}
                  </span>
                ) : (
                  row.statut === 'payee' && (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-0.5 font-medium">
                      Soldé
                    </span>
                  )
                )}
              </div>
            )
          }

          const e = row.prochaine_echeance
          if (!e) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>

          const paye = e.montant_paye ?? (e.montant_du - (e.reste ?? 0))

          return (
            <div className="min-w-0 text-xs leading-tight">
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {formatDate(e.periode_fin)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Payé : {formatMontant(paye)}
              </div>
              {e.reste > 0 && (
                <div className="text-red-600 dark:text-red-400 font-medium text-[11px] mt-0.5">
                  Restant : {formatMontant(e.reste)}
                </div>
              )}
            </div>
          )
        },
      },

      // ── Col 6 : Actions ────────────────────────────────────────────────────
      {
        field: 'actions',
        headerName: '',
        width: '3%',
        renderCell: (row: any) => {
          if (row._type !== 'sous') return null
          return (
            <InlineActionsMenu
              actions={[
                {
                  label: 'Voir le détail',
                  onClick: () => onOpenDrawerSouscription(row.id_souscription_abonnement),
                },
              ]}
            />
          )
        },
      },
    ],
    [onOpenDrawerSouscription, onToggleShowAllEcheances]
  )

  return (
    <div className="space-y-3">
      {/* ── Barre principale : filtres statut + switch tri collab + bouton new + toggle filtres avancés ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Filtres statut — scroll horizontal sur mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1 pb-0.5">
          {FILTRES.map((f) => {
            const count =
              f.id === 'TOUTES'
                ? souscriptions.length
                : f.id === 'IMPAYEES'
                ? souscriptions.filter(
                    (s) =>
                      s.prochaine_echeance &&
                      ['en_attente', 'partiellement_payee'].includes(s.prochaine_echeance.statut)
                  ).length
                : souscriptions.filter((s) => s.statut === f.id).length
            return (
              <button
                key={f.id}
                onClick={() => {
                  onSetFiltreActif(f.id)
                  onPageChange(1)
                }}
                className={`flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filtreActif === f.id
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {f.label}
                <span
                  className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    filtreActif === f.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Switch Trier par collaborateur — Style exact de app/stock/page.tsx */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none h-[42px] px-3">
            <div
              onClick={() => {
                onSetGroupByCollab((prev) => !prev)
                onPageChange(1)
              }}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                groupByCollab ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  groupByCollab ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
              Trier par collaborateur
            </span>
          </label>

          {/* Toggle filtres avancés */}
          <button
            onClick={onToggleShowSousFilters}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              showSousFilters
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
            Filtres
            {hasFiltersActifs && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
          <button
            onClick={onOpenSouscrire}
            className="px-3 py-1.5 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Nouvelle souscription
          </button>
        </div>
      </div>

      {/* ── Filtres avancés (dépliables) ──────────────────────────────────────── */}
      {showSousFilters && (
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Collaborateur */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Collaborateur
              </label>
              <TypeaheadSelect
                options={optionsCollab}
                value={filtreCollabInput}
                onChange={(v) => {
                  onSetFiltreCollabInput(v)
                  onPageChange(1)
                }}
                placeholder="Tous les collaborateurs…"
              />
            </div>
            {/* Offre */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Offre
              </label>
              <TypeaheadSelect
                options={optionsOffre}
                value={filtreOffreInput}
                onChange={(v) => {
                  onSetFiltreOffreInput(v)
                  onPageChange(1)
                }}
                placeholder="Toutes les offres…"
              />
            </div>
            {/* Date de début */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Date de début
              </label>
              <DateRangeFilter
                value={filtreDateDebut}
                onChange={(v) => {
                  onSetFiltreDateDebut(v as DateFilterValue | null)
                  onPageChange(1)
                }}
                hideTargetSelect
                defaultTarget="date_debut"
              />
            </div>
          </div>
          {/* Reset */}
          {hasFiltersActifs && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  onSetFiltreCollabInput('')
                  onSetFiltreOffreInput('')
                  onSetFiltreDateDebut(null)
                  onPageChange(1)
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Table / Cards ResponsiveDataTable ─────────────────────────────────── */}
      <div className="-mx-4 md:mx-0">
        {displayData.length === 0 && !souscriptionsLoading ? (
          <EmptyState
            icon={<Users className="w-10 h-10 text-slate-400" />}
            title={
              filtreActif === 'TOUTES' && !hasFiltersActifs
                ? 'Aucune souscription'
                : 'Aucun résultat'
            }
            description={
              filtreActif === 'TOUTES' && !hasFiltersActifs
                ? "Les souscriptions apparaîtront ici lorsqu'un collaborateur souscrit à une offre."
                : 'Aucune souscription ne correspond aux filtres appliqués.'
            }
            action={
              filtreActif === 'TOUTES' && !hasFiltersActifs ? (
                <button
                  onClick={onOpenSouscrire}
                  className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Nouvelle souscription
                </button>
              ) : (
                <button
                  onClick={() => {
                    onSetFiltreActif('TOUTES')
                    onSetFiltreCollabInput('')
                    onSetFiltreOffreInput('')
                    onSetFiltreDateDebut(null)
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Effacer les filtres
                </button>
              )
            }
          />
        ) : (
          <ResponsiveDataTable
            columns={columns as Parameters<typeof ResponsiveDataTable>[0]['columns']}
            data={displayData}
            loading={souscriptionsLoading}
            pagination={{ page, perPage, total: totalCount }}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onSort={onSort}
            sortConfig={sortConfig}
            childrenField="children"
            rowClassName={(row) => {
              if (row._type === 'collab') {
                return 'bg-[#eef3f9] hover:bg-[#e4ecf8] dark:bg-slate-800/90 dark:hover:bg-slate-800 border-l-[3px] border-l-blue-500'
              }
              if (row._type === 'ech_header') {
                return 'bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700 select-none py-1'
              }
              if (row._type === 'ech_footer') {
                return 'bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/60'
              }
              if (row._type === 'ech') {
                return 'bg-[#f8fafc] hover:bg-slate-100/70 dark:bg-slate-900/60 dark:hover:bg-slate-900/80'
              }
              return 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }}
            onExpandedChange={(keys) => {
              keys.forEach((k) => {
                const str = String(k)
                if (str.startsWith('sous_')) {
                  const id = Number(str.replace('sous_', ''))
                  if (!isNaN(id)) onFetchEcheancesForSouscription(id)
                } else if (Number.isFinite(Number(k))) {
                  onFetchEcheancesForSouscription(Number(k))
                }
              })
            }}
            onRowClick={(row) => {
              if (row._type === 'sous') {
                onOpenDrawerSouscription(row.id_souscription_abonnement)
              }
            }}
            onFiltersChange={() => {}}
          />
        )}
      </div>
    </div>
  )
}
