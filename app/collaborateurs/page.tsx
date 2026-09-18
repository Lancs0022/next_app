'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, CreditCard, Mail, AlertCircle, CheckCircle2,
  Clock, XCircle, ChevronRight, RefreshCw, X,
} from 'lucide-react'
import api from '@/services/api'
import Box from '@/components/Box/Box'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import TabBox from '@/components/TabBox/TabBox'
import Modal from '@/components/Modal/Modal'
import { useToast } from '@/components/Toast/ToastContainer'
import type { FilterState } from '@/components/ResponsiveDataTable/ColumnFilterDropdown'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbonnementSituation {
  id_souscription_abonnement: number
  nom_offre: string
  periodicite: string
  montant_applicable: number
  statut_souscription: string
  echeance_statut: string | null
  echeance_montant: number | null
  echeance_paye: number | null
  echeance_reste: number | null
  echeance_fin: string | null
  // Champs enrichis
  nb_souscriptions: number
  nb_actives: number
  montant_total: number
  has_impaye: boolean
  renouvellement_auto: boolean
}

interface Collaborateur {
  id_collaborateur: number
  tenant_id: number
  nom: string
  prenom: string | null
  email: string | null
  telephone: string | null
  poste: string | null
  adresse: string | null
  statut: string
  date_adhesion: string
  abonnement_situation: AbonnementSituation | null
}

interface Paiement {
  id_paiement_abonnement: number
  montant: number
  date_paiement: string
  canceled_at: string | null
  created_by: number | null
  created_at: string
}

interface Echeance {
  id_echeance_abonnement: number
  montant: number
  periode_debut: string
  periode_fin: string
  statut: string
  canceled_at: string | null
  montant_paye: number
  paiements: Paiement[]
}

interface SouscriptionDetail {
  id_souscription_abonnement: number
  id_abonnement: number
  nom_offre: string
  periodicite: string
  statut_offre: string
  montant: number
  renouvellement_auto: boolean
  date_debut: string
  date_fin: string | null
  statut: string
  canceled_at: string | null
  created_at: string
  echeances: Echeance[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMontant(n: number) {
  return new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(n) + ' Ar'
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPeriode(debut: string, fin: string) {
  const d = new Date(debut)
  const f = new Date(fin)
  return `${d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} → ${f.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
}

const PERIODICITE_LABELS: Record<string, string> = {
  mensuel: 'Mensuel', trimestriel: 'Trimestriel', annuel: 'Annuel', ponctuel: 'Ponctuel',
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function BadgeSouscription({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    ACTIVE:    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    SUSPENDUE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    TERMINEE:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    ANNULEE:   'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  const labels: Record<string, string> = {
    ACTIVE: 'Active', SUSPENDUE: 'Suspendue', TERMINEE: 'Terminée', ANNULEE: 'Annulée',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[statut] ?? map.TERMINEE}`}>
      {labels[statut] ?? statut}
    </span>
  )
}

function BadgeEcheance({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    en_attente:          'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    partiellement_payee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    payee:               'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    annulee:             'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente', partiellement_payee: 'Partielle', payee: 'Payée', annulee: 'Annulée',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[statut] ?? 'bg-slate-100 text-slate-600'}`}>
      {labels[statut] ?? statut}
    </span>
  )
}

// ─── Cellule situation abonnement (dans la table) ─────────────────────────────

function CelluleAbonnement({ situation }: { situation: AbonnementSituation | null }) {
  // ─ Cas 0 : Aucune souscription ─────────────────────────────────────────────
  if (!situation) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
        <span className="text-slate-400 dark:text-slate-500 text-xs">Aucun abonnement</span>
      </div>
    )
  }

  // ─ Cas 2 : Plusieurs souscriptions actives ──────────────────────────────────
  if (situation.nb_actives > 1) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
            {situation.nb_actives} abonnements actifs
          </span>
          {situation.has_impaye && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
              <AlertCircle className="w-3 h-3" /> Impayé
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatMontant(situation.montant_total)}
          {' / '}
          {PERIODICITE_LABELS[situation.periodicite] ?? situation.periodicite}
          {' total'}
        </p>
      </div>
    )
  }

  // ─ Cas 1 : Une souscription unique ──────────────────────────────────────────
  const impaye = situation.echeance_statut === 'en_attente' || situation.echeance_statut === 'partiellement_payee'
  const partiel = situation.echeance_statut === 'partiellement_payee'

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
          {situation.nom_offre}
        </span>
        <BadgeSouscription statut={situation.statut_souscription} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatMontant(situation.montant_applicable)}
          {' / '}
          {PERIODICITE_LABELS[situation.periodicite] ?? situation.periodicite}
        </span>
        {situation.renouvellement_auto ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400">
            <RefreshCw className="w-3 h-3" /> Auto
          </span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">Manuel</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {impaye ? (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            partiel ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
          }`}>
            <AlertCircle className="w-3 h-3" />
            {partiel ? 'Partielle' : 'Impayée'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" /> À jour
          </span>
        )}
        {situation.echeance_fin && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            jusqu&apos;au {new Date(situation.echeance_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Drawer détail collaborateur ──────────────────────────────────────────────

function DrawerDetailCollaborateur({
  collaborateur,
  open,
  onClose,
}: {
  collaborateur: Collaborateur | null
  open: boolean
  onClose: () => void
}) {
  const { showToast } = useToast()
  const [abonnements, setAbonnements] = useState<SouscriptionDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedSouscription, setExpandedSouscription] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !collaborateur) return
    setAbonnements([])
    setExpandedSouscription(null)
    setLoading(true)
    api.get(`/collaborateurs/${collaborateur.id_collaborateur}/abonnements`)
      .then(({ data: res }) => setAbonnements(res?.data?.souscriptions ?? []))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur chargement abonnements', 'error')
      })
      .finally(() => setLoading(false))
  }, [open, collaborateur, showToast])

  if (!open || !collaborateur) return null

  const prenom = collaborateur.prenom ? ` ${collaborateur.prenom}` : ''
  const nomComplet = `${collaborateur.nom}${prenom}`

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col h-full overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{nomComplet}</h2>
            {collaborateur.poste && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{collaborateur.poste}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          <TabBox
            border={false}
            shadow={false}
            padding="p-0"
            tabs={[
              // ── Onglet Infos ──────────────────────────────────────────────
              {
                id: 'infos',
                label: 'Informations',
                content: (
                  <div className="p-6 space-y-4">
                    <dl className="space-y-3">
                      {collaborateur.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <dt className="text-xs text-slate-500 dark:text-slate-400">Email</dt>
                            <dd className="text-sm text-slate-900 dark:text-white">{collaborateur.email}</dd>
                          </div>
                        </div>
                      )}
                      {collaborateur.telephone && (
                        <div className="flex items-start gap-3">
                          <RefreshCw className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <dt className="text-xs text-slate-500 dark:text-slate-400">Téléphone</dt>
                            <dd className="text-sm text-slate-900 dark:text-white">{collaborateur.telephone}</dd>
                          </div>
                        </div>
                      )}
                      {collaborateur.adresse && (
                        <div className="flex items-start gap-3">
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <dt className="text-xs text-slate-500 dark:text-slate-400">Adresse</dt>
                            <dd className="text-sm text-slate-900 dark:text-white">{collaborateur.adresse}</dd>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <dt className="text-xs text-slate-500 dark:text-slate-400">Date d'adhésion</dt>
                          <dd className="text-sm text-slate-900 dark:text-white">{formatDate(collaborateur.date_adhesion)}</dd>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <dt className="text-xs text-slate-500 dark:text-slate-400">Statut</dt>
                          <dd className="mt-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              collaborateur.statut === 'actif'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400'
                            }`}>
                              {collaborateur.statut ?? 'actif'}
                            </span>
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </div>
                ),
              },

              // ── Onglet Abonnements ────────────────────────────────────────
              {
                id: 'abonnements',
                label: 'Abonnements',
                badge: abonnements.filter(s => s.statut === 'ACTIVE').length || undefined,
                content: (
                  <div className="p-6">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Chargement…</span>
                      </div>
                    ) : abonnements.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucun abonnement</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                          Ce collaborateur n'a encore souscrit à aucune offre.
                        </p>
                        <a
                          href="/abonnements"
                          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          Gérer les abonnements
                          <ChevronRight className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {abonnements.map((s) => (
                          <SouscriptionCard
                            key={s.id_souscription_abonnement}
                            souscription={s}
                            expanded={expandedSouscription === s.id_souscription_abonnement}
                            onToggle={() =>
                              setExpandedSouscription(prev =>
                                prev === s.id_souscription_abonnement ? null : s.id_souscription_abonnement
                              )
                            }
                          />
                        ))}

                        <div className="pt-2">
                          <a
                            href="/abonnements"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            Voir dans le module Abonnements
                            <ChevronRight className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Carte souscription (dans le drawer) ─────────────────────────────────────

function SouscriptionCard({
  souscription,
  expanded,
  onToggle,
}: {
  souscription: SouscriptionDetail
  expanded: boolean
  onToggle: () => void
}) {
  const echeancesVisibles = souscription.echeances.filter(e => !e.canceled_at)

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* En-tête souscription */}
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900 dark:text-white text-sm">
              {souscription.nom_offre}
            </span>
            <BadgeSouscription statut={souscription.statut} />
            {souscription.canceled_at && (
              <span className="text-xs text-red-500 dark:text-red-400">Annulée</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatMontant(souscription.montant)} / {PERIODICITE_LABELS[souscription.periodicite] ?? souscription.periodicite}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Depuis le {formatDate(souscription.date_debut)}
              {souscription.date_fin && ` → ${formatDate(souscription.date_fin)}`}
            </span>
          </div>
          {souscription.renouvellement_auto && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-3 h-3" />
              Renouvellement automatique
            </span>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Détail développable */}
      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
          {echeancesVisibles.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              Aucune échéance générée pour cette souscription.
            </div>
          ) : (
            echeancesVisibles.map((e) => (
              <div key={e.id_echeance_abonnement} className="px-4 py-3 space-y-2">
                {/* Ligne période + statut */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formatPeriode(e.periode_debut, e.periode_fin)}
                  </span>
                  <BadgeEcheance statut={e.statut} />
                </div>

                {/* Montants */}
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>Dû : <span className="font-medium text-slate-900 dark:text-white">{formatMontant(e.montant)}</span></span>
                  <span>Payé : <span className="font-medium text-slate-900 dark:text-white">{formatMontant(e.montant_paye)}</span></span>
                  {e.montant - e.montant_paye > 0 && (
                    <span className="text-orange-600 dark:text-orange-400">
                      Reste : <span className="font-medium">{formatMontant(e.montant - e.montant_paye)}</span>
                    </span>
                  )}
                </div>

                {/* Paiements */}
                {e.paiements.filter(p => !p.canceled_at).length > 0 && (
                  <div className="space-y-1 pt-1">
                    {e.paiements
                      .filter(p => !p.canceled_at)
                      .map(p => (
                        <div key={p.id_paiement_abonnement} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{formatDate(p.date_paiement)}</span>
                          <span className="font-medium text-green-700 dark:text-green-400">
                            + {formatMontant(p.montant)}
                          </span>
                        </div>
                      ))}
                    {e.paiements.filter(p => p.canceled_at).map(p => (
                      <div key={p.id_paiement_abonnement} className="flex items-center justify-between text-xs opacity-50 line-through">
                        <span className="text-slate-500">{formatDate(p.date_paiement)}</span>
                        <span className="text-slate-500">{formatMontant(p.montant)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CollaborateursPage() {
  const { showToast } = useToast()

  const [data, setData] = useState<Collaborateur[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 })
  const [sortConfig, setSortConfig] = useState({ field: 'nom', direction: 'asc' })

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ nom: '', telephone: '', email: '', adresse: '' })
  const [createLoading, setCreateLoading] = useState(false)

  const [selectedCollab, setSelectedCollab] = useState<Collaborateur | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchCollaborateurs = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/collaborateurs')
      const rows: Collaborateur[] = res?.data ?? []
      setData(rows)
      setPagination(prev => ({ ...prev, total: rows.length }))
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur chargement collaborateurs', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchCollaborateurs() }, [fetchCollaborateurs])

  const handleRowClick = (row: Collaborateur) => {
    setSelectedCollab(row)
    setDrawerOpen(true)
  }

  // ─── Colonnes ───────────────────────────────────────────────────────────────

  const columns = [
    {
      field: 'nom',
      headerName: 'Nom',
      sortable: true,
      filterable: true,
      width: '160px',
      minWidth: '120px',
      renderCell: (row: Collaborateur) => (
        <div>
          <span className="font-medium text-slate-900 dark:text-white">
            {row.nom}{row.prenom ? ` ${row.prenom}` : ''}
          </span>
          {row.poste && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{row.poste}</p>
          )}
        </div>
      ),
    },
    {
      field: 'telephone',
      headerName: 'Téléphone',
      sortable: true,
      filterable: true,
      width: '150px',
      minWidth: '130px',
      hideBelow: 'md' as const,
    },
    {
      field: 'email',
      headerName: 'Email',
      sortable: true,
      filterable: true,
      width: '220px',
      minWidth: '180px',
      hideBelow: 'lg' as const,
      renderCell: (row: Collaborateur) => (
        <span className="text-slate-700 dark:text-slate-200 truncate block max-w-[200px]" title={row.email ?? ''}>
          {row.email ?? '—'}
        </span>
      ),
    },
    {
      field: 'abonnement_situation',
      headerName: 'Abonnement',
      sortable: false,
      minWidth: '200px',
      renderCell: (row: Collaborateur) => (
        <CelluleAbonnement situation={row.abonnement_situation} />
      ),
      renderMobilePrimary: (row: Collaborateur) => (
        <CelluleAbonnement situation={row.abonnement_situation} />
      ),
    },
    {
      field: 'statut',
      headerName: 'Statut',
      sortable: true,
      filterable: true,
      filterKind: 'select' as const,
      filterOptions: ['actif', 'inactif', 'archive'],
      width: '90px',
      minWidth: '80px',
      renderCell: (row: Collaborateur) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          row.statut === 'actif'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400'
        }`}>
          {row.statut ?? 'actif'}
        </span>
      ),
    },
    {
      field: 'date_adhesion',
      headerName: "Adhésion",
      sortable: true,
      width: '110px',
      hideBelow: 'lg' as const,
      renderCell: (row: Collaborateur) => (
        <span className="text-slate-500 dark:text-slate-400 text-sm">{formatDate(row.date_adhesion)}</span>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: '40px',
      renderCell: (row: Collaborateur) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleRowClick(row) }}
          className="p-1 text-slate-400 hover:text-primary transition-colors"
          aria-label="Voir le détail"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      ),
    },
  ]

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const stats = [
    { label: 'Total', value: data.length, color: 'bg-primary', Icon: Users },
    { label: 'Actifs', value: data.filter(d => d.statut === 'actif').length, color: 'bg-green-500', Icon: CheckCircle2 },
    {
      label: 'Abonnés',
      value: data.filter(d => (d.abonnement_situation?.nb_actives ?? 0) > 0).length,
      color: 'bg-blue-500',
      Icon: CreditCard,
    },
    {
      label: 'Impayés',
      value: data.filter(d => d.abonnement_situation?.has_impaye === true).length,
      color: 'bg-orange-500',
      Icon: AlertCircle,
    },
  ]

  // ─── Création ────────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.nom.trim()) { showToast('Le nom est requis', 'error'); return }
    setCreateLoading(true)
    try {
      await api.post('/collaborateurs', {
        nom:       createForm.nom.trim(),
        telephone: createForm.telephone.trim() || null,
        email:     createForm.email.trim() || null,
        adresse:   createForm.adresse.trim() || null,
      })
      showToast('Collaborateur créé', 'success')
      setCreateOpen(false)
      setCreateForm({ nom: '', telephone: '', email: '', adresse: '' })
      await fetchCollaborateurs()
    } catch (e2: unknown) {
      const err = e2 as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur création collaborateur', 'error')
    } finally {
      setCreateLoading(false)
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {stats.map((stat) => (
          <Box key={stat.label} padding="p-3 md:p-4" hover>
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg md:text-2xl font-bold text-navy-dark dark:text-white truncate">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">
                  {stat.label}
                </p>
              </div>
            </div>
          </Box>
        ))}
      </div>

      {/* Table */}
      <TabBox
        tabs={[
          {
            id: 'list',
            label: 'Liste des collaborateurs',
            content: (
              <div className="-mx-4 md:mx-0">
                <ResponsiveDataTable
                  columns={columns}
                  data={data}
                  loading={loading}
                  pagination={pagination}
                  onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                  onPageSizeChange={(perPage) => setPagination(prev => ({ ...prev, perPage, page: 1 }))}
                  onSort={({ field, direction }) => setSortConfig({ field, direction })}
                  sortConfig={sortConfig}
                  onFiltersChange={(_f: Record<string, FilterState>) => {}}
                  onRowClick={handleRowClick}
                />
              </div>
            ),
          },
          {
            id: 'activity',
            label: 'Activité',
            badge: 'Bientôt',
            content: (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 dark:text-slate-400">
                <RefreshCw className="w-10 h-10 mb-4 text-slate-300 dark:text-slate-600" />
                <p className="font-medium">Activité des collaborateurs</p>
                <p className="text-sm mt-1 text-slate-500">Cette fonctionnalité sera bientôt disponible</p>
              </div>
            ),
          },
          {
            id: 'permissions',
            label: 'Permissions',
            badge: 'Bientôt',
            content: (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 dark:text-slate-400">
                <XCircle className="w-10 h-10 mb-4 text-slate-300 dark:text-slate-600" />
                <p className="font-medium">Gestion des permissions</p>
                <p className="text-sm mt-1 text-slate-500">Cette fonctionnalité sera bientôt disponible</p>
              </div>
            ),
          },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Ajouter un collaborateur
          </button>
        }
      />

      {/* Drawer détail */}
      <DrawerDetailCollaborateur
        collaborateur={selectedCollab}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Modale création */}
      <Modal
        open={createOpen}
        title="Ajouter un collaborateur"
        onClose={() => !createLoading && setCreateOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={createLoading}
              className="px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="create-collaborateur-form"
              disabled={createLoading}
              className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {createLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="create-collaborateur-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              value={createForm.nom}
              onChange={(e) => setCreateForm(prev => ({ ...prev, nom: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Ex: Rakoto Market"
              disabled={createLoading}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Téléphone</label>
              <input
                value={createForm.telephone}
                onChange={(e) => setCreateForm(prev => ({ ...prev, telephone: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="+261 34 00 000 00"
                disabled={createLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="contact@collab.com"
                disabled={createLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Adresse</label>
            <textarea
              value={createForm.adresse}
              onChange={(e) => setCreateForm(prev => ({ ...prev, adresse: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Adresse du collaborateur"
              disabled={createLoading}
            />
          </div>
        </form>
      </Modal>
    </>
  )
}
