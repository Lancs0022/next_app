'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  X, RefreshCw, Users, Calendar, Tag, CheckCircle2,
  Clock, XCircle, Archive, AlertCircle, ChevronRight,
} from 'lucide-react'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'

// ─── Types ────────────────────────────────────────────────────────────────────

type AbonnementStatut = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
type SouscriptionStatut = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE'

interface SouscriptionLigne {
  id_souscription_abonnement: number
  id_collaborateur: number
  collaborateur_nom: string
  montant: number
  renouvellement_auto: boolean
  date_debut: string
  date_fin: string | null
  statut: SouscriptionStatut
  canceled_at: string | null
  prochaine_echeance: {
    periode_debut: string
    periode_fin: string
    statut: string
    montant: number
  } | null
}

interface OffreDetail {
  id_abonnement: number
  nom: string
  description: string | null
  montant: number
  periodicite: string
  statut: AbonnementStatut
  created_by: number | null
  created_at: string
  modified_by: number | null
  modified_at: string | null
  nb_souscriptions: number
  souscriptions: SouscriptionLigne[]
}

interface Props {
  idOffre: number | null
  open: boolean
  onClose: () => void
  onMutated: () => void
  onSouscrire: (offre: { id_abonnement: number; nom: string; montant: number; periodicite: string }) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(n) + ' Ar'

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PERIODICITE: Record<string, { label: string; duree: string }> = {
  mensuel:      { label: 'Mensuel',      duree: '1 mois'  },
  trimestriel:  { label: 'Trimestriel',  duree: '3 mois'  },
  annuel:       { label: 'Annuel',       duree: '1 an'    },
  ponctuel:     { label: 'Ponctuel',     duree: 'Unique'  },
}

function BadgeStatutOffre({ statut }: { statut: AbonnementStatut }) {
  const cfg = {
    ACTIVE:   { cls: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',   label: 'Active',    Icon: CheckCircle2 },
    INACTIVE: { cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', label: 'Inactive', Icon: AlertCircle },
    ARCHIVED: { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',       label: 'Archivée', Icon: Archive },
  }[statut]
  const { cls, label, Icon } = cfg ?? { cls: 'bg-slate-100 text-slate-600', label: statut, Icon: AlertCircle }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  )
}

function BadgeStatutSous({ statut }: { statut: SouscriptionStatut }) {
  const map: Record<SouscriptionStatut, string> = {
    ACTIVE:    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    SUSPENDUE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    TERMINEE:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    ANNULEE:   'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  const lbl: Record<SouscriptionStatut, string> = {
    ACTIVE: 'Active', SUSPENDUE: 'Suspendue', TERMINEE: 'Terminée', ANNULEE: 'Annulée',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[statut] ?? map.TERMINEE}`}>
      {lbl[statut] ?? statut}
    </span>
  )
}

function BadgeEch({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    en_attente:          'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    partiellement_payee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    payee:               'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    annulee:             'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  const lbl: Record<string, string> = {
    en_attente: 'En attente', partiellement_payee: 'Partielle', payee: 'Payée', annulee: 'Annulée',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[statut] ?? 'bg-slate-100 text-slate-600'}`}>
      {lbl[statut] ?? statut}
    </span>
  )
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DrawerOffre({ idOffre, open, onClose, onMutated, onSouscrire }: Props) {
  const { showToast } = useToast()
  const [data, setData] = useState<OffreDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!idOffre) return
    setLoading(true)
    try {
      const { data: res } = await api.get(`/abonnements/${idOffre}`)
      setData(res?.data ?? null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur chargement offre', 'error')
    } finally {
      setLoading(false)
    }
  }, [idOffre, showToast])

  useEffect(() => {
    if (open && idOffre) load()
  }, [open, idOffre, load])

  const patchStatut = async (statut: AbonnementStatut) => {
    if (!data) return
    try {
      await api.patch(`/abonnements/${data.id_abonnement}/statut`, { statut })
      showToast('Statut mis à jour', 'success')
      await load()
      onMutated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur', 'error')
    }
  }

  if (!open) return null

  const perio = data ? (PERIODICITE[data.periodicite] ?? { label: data.periodicite, duree: '' }) : null
  const souscActives = data?.souscriptions.filter(s => s.statut === 'ACTIVE' && !s.canceled_at) ?? []

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex-1 min-w-0">
            {data ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{data.nom}</h2>
                  <BadgeStatutOffre statut={data.statut} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {fmt(data.montant)} · {perio?.label} ({perio?.duree})
                </p>
              </>
            ) : (
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            )}
          </div>
          <button onClick={onClose} className="ml-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-500">Chargement…</span>
            </div>
          ) : !data ? null : (
            <div className="p-6 space-y-6">

              {/* ── Informations générales ─────────────────────────────────── */}
              <Section title="Informations générales">
                <FieldGrid>
                  <Field label="Nom"        value={data.nom} />
                  <Field label="Statut"     value={<BadgeStatutOffre statut={data.statut} />} />
                  {data.description && (
                    <Field label="Description" value={data.description} full />
                  )}
                </FieldGrid>
              </Section>

              {/* ── Conditions commerciales ────────────────────────────────── */}
              <Section title="Conditions commerciales">
                <FieldGrid>
                  <Field label="Prix catalogue" value={<span className="text-lg font-bold text-slate-900 dark:text-white">{fmt(data.montant)}</span>} />
                  <Field label="Périodicité"    value={perio?.label ?? data.periodicite} />
                  <Field label="Durée d'une période" value={perio?.duree ?? '—'} />
                </FieldGrid>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Ce prix est le tarif catalogue de référence. Chaque collaborateur peut avoir un tarif individuel différent.
                </p>
              </Section>

              {/* ── Actions ───────────────────────────────────────────────── */}
              {data.statut !== 'ARCHIVED' && (
                <Section title="Actions">
                  <div className="flex flex-wrap gap-2">
                    {data.statut === 'ACTIVE' && (
                      <>
                        <button
                          onClick={() => onSouscrire({ id_abonnement: data.id_abonnement, nom: data.nom, montant: data.montant, periodicite: data.periodicite })}
                          className="px-3 py-1.5 text-sm bg-primary hover:bg-primary-strong text-white rounded-lg transition-colors"
                        >
                          Souscrire un collaborateur
                        </button>
                        <button
                          onClick={() => patchStatut('INACTIVE')}
                          className="px-3 py-1.5 text-sm border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                        >
                          Désactiver
                        </button>
                      </>
                    )}
                    {data.statut === 'INACTIVE' && (
                      <button
                        onClick={() => patchStatut('ACTIVE')}
                        className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Réactiver
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (souscActives.length > 0) {
                          showToast(`Archivage impossible : ${souscActives.length} souscription(s) active(s).`, 'error')
                          return
                        }
                        patchStatut('ARCHIVED')
                      }}
                      className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Archiver
                    </button>
                  </div>
                  {data.statut === 'INACTIVE' && (
                    <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Les nouvelles souscriptions sont bloquées. Les souscriptions existantes continuent normalement.
                    </p>
                  )}
                </Section>
              )}

              {/* ── Souscriptions ─────────────────────────────────────────── */}
              <Section title={`Souscriptions (${data.nb_souscriptions})`}>
                {data.souscriptions.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Aucune souscription</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.souscriptions.map(s => (
                      <div key={s.id_souscription_abonnement}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-slate-900 dark:text-white">{s.collaborateur_nom}</span>
                            <BadgeStatutSous statut={s.statut} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{fmt(s.montant)}</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              Depuis le {fmtDate(s.date_debut)}
                              {s.date_fin && ` → ${fmtDate(s.date_fin)}`}
                            </span>
                          </div>
                          {s.prochaine_echeance && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <BadgeEch statut={s.prochaine_echeance.statut} />
                              <span className="text-xs text-slate-400">
                                {fmtDate(s.prochaine_echeance.periode_debut)} → {fmtDate(s.prochaine_echeance.periode_fin)}
                              </span>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {fmt(s.prochaine_echeance.montant)}
                              </span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* ── Audit ─────────────────────────────────────────────────── */}
              <Section title="Audit">
                <FieldGrid>
                  <Field label="Créé le"         value={fmtDate(data.created_at)} />
                  <Field label="Créé par"         value={data.created_by ? `Utilisateur #${data.created_by}` : '—'} />
                  <Field label="Modifié le"       value={fmtDate(data.modified_at)} />
                  <Field label="Modifié par"      value={data.modified_by ? `Utilisateur #${data.modified_by}` : '—'} />
                </FieldGrid>
              </Section>

            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Sous-composants layout ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span className="flex-1">{title}</span>
        <span className="block h-px flex-1 bg-slate-100 dark:bg-slate-700" />
      </h3>
      {children}
    </section>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
}

function Field({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900 dark:text-white">{value ?? '—'}</dd>
    </div>
  )
}
