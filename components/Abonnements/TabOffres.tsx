import React, { useMemo } from 'react'
import { FileText } from 'lucide-react'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import { Offre } from './abonnementsTypes'
import {
  badgeOffre,
  formatMontant,
  PERIODICITE_LABELS,
  EmptyState,
  InlineActionsMenu,
} from './abonnementsUtils'

interface TabOffresProps {
  offres: Offre[]
  loading: boolean
  paginatedOffres: Offre[]
  totalCount: number
  page: number
  perPage: number
  sortConfig: { field: string; direction: string }
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
  onSort: (cfg: { field: string; direction: string }) => void
  onOpenCreate: () => void
  onOpenDrawer: (id: number) => void
  onSouscrire: (offre: Offre) => void
  onDesactiver: (offre: Offre) => void
  onReactiver: (offre: Offre) => void
  onArchiver: (offre: Offre) => void
  onSupprimer: (offre: Offre) => void
}

export default function TabOffres({
  offres,
  loading,
  paginatedOffres,
  totalCount,
  page,
  perPage,
  sortConfig,
  onPageChange,
  onPageSizeChange,
  onSort,
  onOpenCreate,
  onOpenDrawer,
  onSouscrire,
  onDesactiver,
  onReactiver,
  onArchiver,
  onSupprimer,
}: TabOffresProps) {
  const columns = useMemo(
    () => [
      {
        field: 'nom',
        headerName: 'Offre',
        sortable: true,
        filterable: true,
        minWidth: '160px',
        renderCell: (row: Offre) => (
          <div>
            <span className="font-medium text-slate-900 dark:text-white">{row.nom}</span>
            {row.description && (
              <p
                className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]"
                title={row.description}
              >
                {row.description}
              </p>
            )}
          </div>
        ),
      },
      {
        field: 'montant',
        headerName: 'Prix catalogue',
        sortable: true,
        width: '140px',
        renderCell: (row: Offre) => (
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatMontant(row.montant)}
          </span>
        ),
      },
      {
        field: 'periodicite',
        headerName: 'Périodicité',
        sortable: true,
        filterable: true,
        filterKind: 'select' as const,
        filterOptions: ['mensuel', 'trimestriel', 'annuel', 'ponctuel'],
        width: '120px',
        renderCell: (row: Offre) => (
          <span className="text-slate-700 dark:text-slate-300">
            {PERIODICITE_LABELS[row.periodicite] ?? row.periodicite}
          </span>
        ),
      },
      {
        field: 'statut',
        headerName: 'Statut',
        sortable: true,
        filterable: true,
        filterKind: 'select' as const,
        filterOptions: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
        width: '110px',
        renderCell: (row: Offre) => {
          const { cls, label } = badgeOffre(row.statut)
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}`}
            >
              {label}
            </span>
          )
        },
      },
      {
        field: 'nb_souscriptions',
        headerName: 'Souscriptions',
        sortable: true,
        width: '150px',
        hideBelow: 'md' as const,
        renderCell: (row: Offre) => (
          <span className="text-slate-700 dark:text-slate-300">
            {row.nb_souscriptions_actives} active{row.nb_souscriptions_actives !== 1 ? 's' : ''}
            {row.nb_souscriptions > row.nb_souscriptions_actives && (
              <span className="text-slate-400 dark:text-slate-500">
                {' '}
                / {row.nb_souscriptions} total
              </span>
            )}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: '56px',
        renderCell: (row: Offre) => {
          const actions: { label: string; onClick: () => void; variant?: string }[] = []
          if (row.statut === 'ACTIVE') {
            actions.push({
              label: 'Voir le détail',
              onClick: () => onOpenDrawer(row.id_abonnement),
            })
            actions.push({
              label: 'Souscrire un collaborateur',
              onClick: () => onSouscrire(row),
            })
            actions.push({
              label: 'Désactiver',
              onClick: () => onDesactiver(row),
            })
            actions.push({
              label: 'Archiver',
              onClick: () => onArchiver(row),
            })
          }
          if (row.statut === 'INACTIVE') {
            actions.push({
              label: 'Voir le détail',
              onClick: () => onOpenDrawer(row.id_abonnement),
            })
            actions.push({
              label: 'Réactiver',
              onClick: () => onReactiver(row),
            })
            actions.push({
              label: 'Archiver',
              onClick: () => onArchiver(row),
            })
          }
          if (row.statut === 'ARCHIVED') {
            actions.push({
              label: 'Voir le détail',
              onClick: () => onOpenDrawer(row.id_abonnement),
            })
            actions.push({
              label: 'Réactiver',
              onClick: () => onReactiver(row),
            })
          }
          if (row.nb_souscriptions === 0) {
            actions.push({
              label: 'Supprimer',
              onClick: () => onSupprimer(row),
              variant: 'danger',
            })
          }
          return <InlineActionsMenu actions={actions} />
        },
      },
    ],
    [
      onOpenDrawer,
      onSouscrire,
      onDesactiver,
      onReactiver,
      onArchiver,
      onSupprimer,
    ]
  )

  return (
    <div className="-mx-4 md:mx-0">
      {offres.length === 0 && !loading ? (
        <EmptyState
          icon={<FileText className="w-10 h-10 text-slate-400" />}
          title="Aucune offre"
          description="Créez votre première offre d'abonnement pour commencer."
          action={
            <button
              onClick={onOpenCreate}
              className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors"
            >
              Créer une offre
            </button>
          }
        />
      ) : (
        <ResponsiveDataTable
          columns={columns as Parameters<typeof ResponsiveDataTable>[0]['columns']}
          data={paginatedOffres}
          loading={loading}
          pagination={{ page, perPage, total: totalCount }}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          onSort={onSort}
          sortConfig={sortConfig}
          onFiltersChange={() => {}}
        />
      )}
    </div>
  )
}
