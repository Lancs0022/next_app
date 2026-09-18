import React, { useMemo } from 'react'
import { CreditCard, Link2, CheckCircle2, XCircle } from 'lucide-react'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import { PaiementListe } from './abonnementsTypes'
import { formatMontant, formatDate, badgeEcheance, PERIODICITE_LABELS, EmptyState } from './abonnementsUtils'

interface TabPaiementsProps {
  paiements: PaiementListe[]
  loading: boolean
  filtrePaiements: 'tous' | 'actifs' | 'annules'
  setFiltrePaiements: (f: 'tous' | 'actifs' | 'annules') => void
}

export default function TabPaiements({
  paiements,
  loading,
  filtrePaiements,
  setFiltrePaiements,
}: TabPaiementsProps) {
  const filtered = useMemo(() => {
    if (filtrePaiements === 'actifs') return paiements.filter((p) => !p.canceled_at)
    if (filtrePaiements === 'annules') return paiements.filter((p) => p.canceled_at)
    return paiements
  }, [paiements, filtrePaiements])

  const groupCount = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of paiements) {
      if (p.id_transaction_financiere) {
        map.set(p.id_transaction_financiere, (map.get(p.id_transaction_financiere) ?? 0) + 1)
      }
    }
    return map
  }, [paiements])

  const columns = useMemo(
    () => [
      {
        field: 'collaborateur_nom',
        headerName: 'Collaborateur',
        sortable: true,
        filterable: true,
        minWidth: '140px',
        renderCell: (row: PaiementListe) => (
          <span className="font-medium text-slate-900 dark:text-white">{row.collaborateur_nom}</span>
        ),
      },
      {
        field: 'abonnement_nom',
        headerName: 'Offre',
        sortable: true,
        filterable: true,
        minWidth: '130px',
        renderCell: (row: PaiementListe) => (
          <div>
            <span className="text-slate-900 dark:text-white">{row.abonnement_nom}</span>
            <p className="text-xs text-slate-400">
              {PERIODICITE_LABELS[row.abonnement_periodicite] ?? row.abonnement_periodicite}
            </p>
          </div>
        ),
      },
      {
        field: 'periode',
        headerName: 'Période couverte',
        minWidth: '160px',
        hideBelow: 'md' as const,
        renderCell: (row: PaiementListe) => {
          const { cls, label } = badgeEcheance(row.echeance_statut)
          return (
            <div>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {new Date(row.periode_debut).toLocaleDateString('fr-FR', {
                  month: 'short',
                  year: 'numeric',
                })}
                {' → '}
                {new Date(row.periode_fin).toLocaleDateString('fr-FR', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <div className="mt-0.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        },
      },
      {
        field: 'montant',
        headerName: 'Montant',
        sortable: true,
        width: '120px',
        renderCell: (row: PaiementListe) => (
          <span
            className={`font-semibold ${
              row.canceled_at ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {formatMontant(row.montant)}
          </span>
        ),
      },
      {
        field: 'date_paiement',
        headerName: 'Date',
        sortable: true,
        width: '110px',
        renderCell: (row: PaiementListe) => (
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {formatDate(row.date_paiement)}
          </span>
        ),
      },
      {
        field: 'statut',
        headerName: 'Statut',
        width: '100px',
        renderCell: (row: PaiementListe) =>
          row.canceled_at ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
              <XCircle className="w-3 h-3" />
              Annulé
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
              <CheckCircle2 className="w-3 h-3" />
              Actif
            </span>
          ),
      },
      {
        field: 'groupe',
        headerName: 'Groupe',
        width: '140px',
        hideBelow: 'lg' as const,
        renderCell: (row: PaiementListe) => {
          if (!row.id_transaction_financiere)
            return <span className="text-slate-400 text-xs">Individuel</span>
          const nb = groupCount.get(row.id_transaction_financiere) ?? 1
          return (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
              <Link2 className="w-3 h-3" />
              TF#{row.id_transaction_financiere}
              {nb > 1 && <span className="opacity-60 ml-0.5">·{nb}</span>}
            </span>
          )
        },
      },
    ],
    [groupCount]
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(
          [
            ['actifs', 'Actifs'],
            ['annules', 'Annulés'],
            ['tous', 'Tous'],
          ] as const
        ).map(([id, lbl]) => (
          <button
            key={id}
            onClick={() => setFiltrePaiements(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtrePaiements === id
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {lbl}
            <span
              className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filtrePaiements === id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
              }`}
            >
              {id === 'actifs'
                ? paiements.filter((p) => !p.canceled_at).length
                : id === 'annules'
                ? paiements.filter((p) => p.canceled_at).length
                : paiements.length}
            </span>
          </button>
        ))}
      </div>
      <div className="-mx-4 md:mx-0">
        {filtered.length === 0 && !loading ? (
          <EmptyState
            icon={<CreditCard className="w-10 h-10 text-slate-400" />}
            title="Aucun paiement"
            description="Les paiements d'abonnements apparaîtront ici après enregistrement."
          />
        ) : (
          <ResponsiveDataTable
            columns={columns as Parameters<typeof ResponsiveDataTable>[0]['columns']}
            data={filtered}
            loading={loading}
            getRowId={(r) => (r as PaiementListe).id_paiement_abonnement}
            pagination={{ page: 1, perPage: 50, total: filtered.length }}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            onSort={() => {}}
          />
        )}
      </div>
    </div>
  )
}
