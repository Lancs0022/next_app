'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  X, RefreshCw, ChevronDown, ChevronRight, Info,
  AlertCircle, CheckCircle2, Clock, CreditCard, Plus, Link2,
} from 'lucide-react'
import api from '@/services/api'
import Modal from '@/components/Modal/Modal'
import { useToast } from '@/components/Toast/ToastContainer'

// ─── Types ────────────────────────────────────────────────────────────────────

type SouscriptionStatut = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE'

interface Paiement {
  id_paiement_abonnement: number
  id_transaction_financiere: number | null
  montant: number
  date_paiement: string
  canceled_at: string | null
  canceled_by: number | null
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
  reste: number
  paiements: Paiement[]
}

interface SouscriptionDetail {
  id_souscription_abonnement: number
  id_collaborateur: number
  collaborateur_nom: string
  id_abonnement: number
  abonnement_nom: string
  abonnement_periodicite: string
  abonnement_statut: string
  montant_catalogue: number
  montant: number
  renouvellement_auto: boolean
  date_debut: string
  date_fin: string | null
  statut: SouscriptionStatut
  canceled_at: string | null
  canceled_by: number | null
  created_by: number | null
  created_at: string
  modified_by: number | null
  modified_at: string | null
  echeances: Echeance[]
}

// Ligne de sélection pour le paiement multi-échéances
interface LignePaiementForm {
  echeance: Echeance
  selected: boolean
  montant: string   // saisie libre — défaut = reste dû
}

interface Props {
  idSouscription: number | null
  open: boolean
  onClose: () => void
  onMutated: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(n) + ' Ar'

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const fmtPeriode = (debut: string, fin: string) => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
  return `${new Date(debut).toLocaleDateString('fr-FR', opts)} → ${new Date(fin).toLocaleDateString('fr-FR', opts)}`
}

const PERIODICITE: Record<string, string> = {
  mensuel: 'Mensuel', trimestriel: 'Trimestriel', annuel: 'Annuel', ponctuel: 'Ponctuel',
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function BadgeSous({ statut }: { statut: SouscriptionStatut }) {
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

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DrawerSouscription({ idSouscription, open, onClose, onMutated }: Props) {
  const { showToast } = useToast()

  const [data, setData]         = useState<SouscriptionDetail | null>(null)
  const [loading, setLoading]   = useState(false)
  const [expandedEch, setExpandedEch] = useState<number | null>(null)

  // ── Types de modales ─────────────────────────────────────────────────────────
  type ModalState =
    | { type: 'tarif';    form: { montant: string };                                        loading: boolean }
    | { type: 'echeance'; form: { montant: string; debut: string; fin: string };            loading: boolean }
    | { type: 'paiement'; lignes: LignePaiementForm[]; date: string;                        loading: boolean }
    | { type: 'annuler_groupe'; id_tf: number; montant: number; nb: number;                 loading: boolean }
    | { type: 'confirm';  title: string; message: string; variant: 'danger'|'warning'|'primary'; onConfirm: () => Promise<void>; loading: boolean }

  const [modal, setModal] = useState<ModalState | null>(null)

  // ─── Chargement ───────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!idSouscription) return
    setLoading(true)
    try {
      const { data: res } = await api.get(`/souscriptions-abonnements/${idSouscription}`)
      setData(res?.data ?? null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur chargement', 'error')
    } finally {
      setLoading(false)
    }
  }, [idSouscription, showToast])

  useEffect(() => {
    if (open && idSouscription) {
      setExpandedEch(null)
      setModal(null)
      load()
    }
  }, [open, idSouscription, load])

  if (!open) return null

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const patchStatut = async (statut: SouscriptionStatut) => {
    if (!data) return
    try {
      await api.patch(`/souscriptions-abonnements/${data.id_souscription_abonnement}/statut`, { statut })
      showToast('Statut mis à jour', 'success')
      await load(); onMutated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur', 'error')
    }
  }

  const saveTarif = async () => {
    if (modal?.type !== 'tarif') return
    const montant = parseFloat(modal.form.montant)
    if (!montant || montant <= 0) { showToast('Le tarif doit être > 0', 'error'); return }
    setModal(m => m ? { ...m, loading: true } : null)
    try {
      await api.patch(`/souscriptions-abonnements/${data!.id_souscription_abonnement}/tarif`, { montant })
      showToast('Tarif mis à jour — les futures échéances utiliseront ce tarif.', 'success')
      setModal(null); await load(); onMutated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur', 'error')
      setModal(m => m ? { ...m, loading: false } : null)
    }
  }

  const saveEcheance = async () => {
    if (modal?.type !== 'echeance') return
    const montant = parseFloat(modal.form.montant)
    if (!montant || montant <= 0) { showToast('Le montant doit être > 0', 'error'); return }
    if (!modal.form.debut || !modal.form.fin) { showToast('Les dates sont requises', 'error'); return }
    setModal(m => m ? { ...m, loading: true } : null)
    try {
      await api.post('/echeances-abonnements', {
        id_souscription_abonnement: data!.id_souscription_abonnement,
        montant,
        periode_debut: modal.form.debut,
        periode_fin:   modal.form.fin,
      })
      showToast('Échéance créée', 'success')
      setModal(null); await load(); onMutated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur', 'error')
      setModal(m => m ? { ...m, loading: false } : null)
    }
  }

  // Paiement multi-échéances — envoie { lignes, date_paiement } → 1 TF
  const savePaiements = async () => {
    if (modal?.type !== 'paiement') return
    const lignesSel = modal.lignes.filter(l => l.selected)
    if (lignesSel.length === 0) { showToast('Sélectionnez au moins une échéance', 'error'); return }

    for (const l of lignesSel) {
      const m = parseFloat(l.montant)
      if (!m || m <= 0) { showToast(`Montant invalide pour ${fmtPeriode(l.echeance.periode_debut, l.echeance.periode_fin)}`, 'error'); return }
      if (m > l.echeance.reste + 0.001) { showToast(`Montant dépasse le restant dû pour ${fmtPeriode(l.echeance.periode_debut, l.echeance.periode_fin)}`, 'error'); return }
    }

    setModal(m => m ? { ...m, loading: true } : null)
    try {
      await api.post('/paiements-abonnements', {
        lignes: lignesSel.map(l => ({
          id_echeance_abonnement: l.echeance.id_echeance_abonnement,
          montant: parseFloat(l.montant),
        })),
        date_paiement: modal.date || undefined,
      })
      const total = lignesSel.reduce((acc, l) => acc + parseFloat(l.montant), 0)
      showToast(`Paiement de ${fmt(total)} enregistré pour ${lignesSel.length} échéance(s)`, 'success')
      setModal(null); await load(); onMutated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur', 'error')
      setModal(m => m ? { ...m, loading: false } : null)
    }
  }

  // Annulation d'un groupe complet par id_transaction_financiere
  const annulerGroupe = async () => {
    if (modal?.type !== 'annuler_groupe') return
    setModal(m => m ? { ...m, loading: true } : null)
    try {
      await api.post(`/paiements-abonnements/groupes/${modal.id_tf}/annuler`, {})
      showToast('Groupe de paiement annulé', 'success')
      setModal(null); await load(); onMutated()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur', 'error')
      setModal(m => m ? { ...m, loading: false } : null)
    }
  }

  // Ouvrir la modale d'annulation groupe depuis un paiement
  const demanderAnnulationGroupe = (p: Paiement, tousLesPaiementsGroupe: Paiement[]) => {
    if (!p.id_transaction_financiere) {
      showToast('Ce paiement ne fait pas partie d\'un groupe — contact support', 'error')
      return
    }
    const lignes = tousLesPaiementsGroupe.filter(x => x.id_transaction_financiere === p.id_transaction_financiere && !x.canceled_at)
    const totalGroupe = lignes.reduce((acc, x) => acc + x.montant, 0)
    setModal({
      type: 'annuler_groupe',
      id_tf: p.id_transaction_financiere,
      montant: totalGroupe,
      nb: lignes.length,
      loading: false,
    })
  }

  const openConfirmStatut = (statut: SouscriptionStatut) => {
    if (!data) return
    const messages: Record<string, { title: string; msg: string; variant: 'danger'|'warning'|'primary' }> = {
      SUSPENDUE: { title: 'Suspendre la souscription', variant: 'warning',
        msg: 'La souscription sera suspendue. Aucune nouvelle échéance ne sera générée jusqu\'à réactivation. L\'historique est conservé.' },
      ACTIVE:    { title: 'Réactiver la souscription', variant: 'primary',
        msg: 'La souscription sera réactivée. Les futures échéances pourront à nouveau être générées.' },
      TERMINEE:  { title: 'Résilier la souscription', variant: 'warning',
        msg: 'La date de fin sera définie à aujourd\'hui. Le renouvellement automatique sera désactivé. L\'historique (échéances, paiements) est conservé.' },
      ANNULEE:   { title: 'Annuler la souscription', variant: 'danger',
        msg: 'La souscription sera annulée. Cette opération est irréversible. L\'historique est conservé.' },
    }
    const cfg = messages[statut]
    if (!cfg) return
    setModal({ type: 'confirm', title: cfg.title, message: cfg.msg, variant: cfg.variant, loading: false,
      onConfirm: async () => patchStatut(statut) })
  }

  const runConfirm = async () => {
    if (modal?.type !== 'confirm') return
    setModal(m => m ? { ...m, loading: true } : null)
    try { await modal.onConfirm(); setModal(null) }
    catch { setModal(m => m ? { ...m, loading: false } : null) }
  }

  // ─── Calculs locaux ───────────────────────────────────────────────────────────

  const isActive    = data?.statut === 'ACTIVE'
  const isSuspendue = data?.statut === 'SUSPENDUE'
  const isTerminee  = data?.statut === 'TERMINEE'
  const isAnnulee   = data?.statut === 'ANNULEE'
  const canAct      = data && !isAnnulee
  const canPay      = isActive || isSuspendue

  // Tous les paiements actifs de toutes les échéances — pour résoudre les groupes
  const tousLesPaiementsActifs: Paiement[] = data?.echeances.flatMap(e => e.paiements.filter(p => !p.canceled_at)) ?? []

  // Échéances payables (non annulées, non 100% payées) pour la modale paiement
  const echeancesPayables = data?.echeances.filter(e => !e.canceled_at && e.statut !== 'payee' && e.reste > 0) ?? []

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="min-w-0 flex-1">
              {data ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">{data.collaborateur_nom}</h2>
                    <BadgeSous statut={data.statut} />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {data.abonnement_nom} — {fmt(data.montant)} / {PERIODICITE[data.abonnement_periodicite] ?? data.abonnement_periodicite}
                  </p>
                </>
              ) : (
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
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

                {/* ── Collaborateur ──────────────────────────────────────────── */}
                <SectionDrawer title="Collaborateur">
                  <FieldGrid>
                    <Field label="Nom" value={data.collaborateur_nom} />
                  </FieldGrid>
                </SectionDrawer>

                {/* ── Offre ─────────────────────────────────────────────────── */}
                <SectionDrawer title="Offre">
                  <FieldGrid>
                    <Field label="Offre"            value={data.abonnement_nom} />
                    <Field label="Statut offre"     value={data.abonnement_statut} />
                    <Field label="Tarif applicable" value={<span className="font-semibold text-slate-900 dark:text-white">{fmt(data.montant)}</span>} />
                    <Field label="Prix catalogue"   value={
                      <span>
                        {fmt(data.montant_catalogue)}
                        {data.montant !== data.montant_catalogue && (
                          <span className="ml-1.5 text-xs text-blue-600 dark:text-blue-400">(tarif personnalisé)</span>
                        )}
                      </span>
                    } />
                    <Field label="Périodicité" value={PERIODICITE[data.abonnement_periodicite] ?? data.abonnement_periodicite} />
                  </FieldGrid>
                </SectionDrawer>

                {/* ── Validité contractuelle ────────────────────────────────── */}
                <SectionDrawer title="Validité contractuelle">
                  <FieldGrid>
                    <Field label="Début contractuel"   value={fmtDate(data.date_debut)} />
                    <Field label="Fin contractuelle"   value={data.date_fin ? fmtDate(data.date_fin) : <span className="text-slate-400 italic">Sans date de fin</span>} />
                    <Field label="Statut"              value={<BadgeSous statut={data.statut} />} />
                    <Field label="Renouvellement"      value={
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.renouvellement_auto ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {data.renouvellement_auto ? 'Automatique' : 'Manuel'}
                      </span>
                    } />
                  </FieldGrid>
                  {data.canceled_at && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">Annulée le {fmtDate(data.canceled_at)}</p>
                  )}
                </SectionDrawer>

                {/* ── Actions ───────────────────────────────────────────────── */}
                {canAct && (
                  <SectionDrawer title="Actions">
                    <div className="flex flex-wrap gap-2">
                      {(isActive || isSuspendue) && (
                        <button onClick={() => setModal({ type: 'tarif', form: { montant: String(data.montant) }, loading: false })}
                          className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          Changer le tarif
                        </button>
                      )}
                      {canPay && echeancesPayables.length > 0 && (
                        <button onClick={() => setModal({
                          type: 'paiement',
                          date: new Date().toISOString().split('T')[0],
                          loading: false,
                          lignes: echeancesPayables.map(e => ({ echeance: e, selected: false, montant: String(Math.max(0, e.reste)) })),
                        })}
                          className="px-3 py-1.5 text-sm bg-primary hover:bg-primary-strong text-white rounded-lg transition-colors inline-flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4" />
                          Enregistrer un paiement
                        </button>
                      )}
                      {(isActive || isSuspendue) && (
                        <button onClick={() => {
                          const today = new Date()
                          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                          setModal({ type: 'echeance', form: { montant: String(data.montant), debut: today.toISOString().split('T')[0], fin: nextMonth.toISOString().split('T')[0] }, loading: false })
                        }}
                          className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          Nouvelle échéance
                        </button>
                      )}
                      {isActive && (
                        <button onClick={() => openConfirmStatut('SUSPENDUE')}
                          className="px-3 py-1.5 text-sm border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                          Suspendre
                        </button>
                      )}
                      {isSuspendue && (
                        <button onClick={() => openConfirmStatut('ACTIVE')}
                          className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                          Réactiver
                        </button>
                      )}
                      {(isActive || isSuspendue) && (
                        <button onClick={() => openConfirmStatut('TERMINEE')}
                          className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                          Résilier
                        </button>
                      )}
                      {isTerminee && (
                        <button onClick={() => openConfirmStatut('ACTIVE')}
                          className="px-3 py-1.5 text-sm bg-primary hover:bg-primary-strong text-white rounded-lg transition-colors">
                          Réactiver
                        </button>
                      )}
                      <button onClick={() => openConfirmStatut('ANNULEE')}
                        className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        Annuler la souscription
                      </button>
                    </div>
                  </SectionDrawer>
                )}

                {/* ── Échéances ─────────────────────────────────────────────── */}
                <SectionDrawer title={`Échéances (${data.echeances.filter(e => !e.canceled_at).length})`}>
                  {data.echeances.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Aucune échéance générée.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.echeances.map(e => (
                        <EcheanceCard
                          key={e.id_echeance_abonnement}
                          echeance={e}
                          expanded={expandedEch === e.id_echeance_abonnement}
                          onToggle={() => setExpandedEch(prev => prev === e.id_echeance_abonnement ? null : e.id_echeance_abonnement)}
                          canPay={canPay ?? false}
                          tousLesPaiements={tousLesPaiementsActifs}
                          onDemanderAnnulationGroupe={demanderAnnulationGroupe}
                        />
                      ))}
                    </div>
                  )}
                </SectionDrawer>

                {/* ── Audit ─────────────────────────────────────────────────── */}
                <SectionDrawer title="Audit">
                  <FieldGrid>
                    <Field label="Créé le"    value={fmtDate(data.created_at)} />
                    <Field label="Créé par"   value={data.created_by ? `Utilisateur #${data.created_by}` : '—'} />
                    <Field label="Modifié le" value={fmtDate(data.modified_at)} />
                    <Field label="Modifié par" value={data.modified_by ? `Utilisateur #${data.modified_by}` : '—'} />
                    {data.canceled_at && <>
                      <Field label="Annulé le"  value={fmtDate(data.canceled_at)} />
                      <Field label="Annulé par" value={data.canceled_by ? `Utilisateur #${data.canceled_by}` : '—'} />
                    </>}
                  </FieldGrid>
                </SectionDrawer>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modale changer tarif ─────────────────────────────────────────────── */}
      {modal?.type === 'tarif' && data && (
        <Modal open title="Changer le tarif applicable" zIndex={60} onClose={() => !modal.loading && setModal(null)}
          footer={<ModalFooter onCancel={() => setModal(null)} onConfirm={saveTarif} loading={modal.loading} />}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nouveau tarif (Ar) <span className="text-red-500">*</span></label>
              <input type="number" min="1" step="1" value={modal.form.montant}
                onChange={e => setModal(m => m?.type === 'tarif' ? { ...m, form: { montant: e.target.value } } : m)}
                disabled={modal.loading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50" />
            </div>
            <InfoBox>
              Tarif actuel : <strong>{fmt(data.montant)}</strong> · Prix catalogue : <strong>{fmt(data.montant_catalogue)}</strong>
              <br />Le nouveau tarif s'applique aux <strong>futures échéances uniquement</strong>. L'historique reste intact.
            </InfoBox>
          </div>
        </Modal>
      )}

      {/* ── Modale nouvelle échéance ──────────────────────────────────────────── */}
      {modal?.type === 'echeance' && (
        <Modal open title="Nouvelle échéance" zIndex={60} onClose={() => !modal.loading && setModal(null)}
          footer={<ModalFooter onCancel={() => setModal(null)} onConfirm={saveEcheance} loading={modal.loading} confirmLabel="Créer" />}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Montant dû (Ar) <span className="text-red-500">*</span></label>
              <input type="number" min="1" step="1" value={modal.form.montant}
                onChange={e => setModal(m => m?.type === 'echeance' ? { ...m, form: { ...m.form, montant: e.target.value } } : m)}
                disabled={modal.loading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50" />
              <p className="mt-1 text-xs text-slate-500">Snapshot figé — ne sera jamais recalculé après création.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Période début <span className="text-red-500">*</span></label>
                <input type="date" value={modal.form.debut}
                  onChange={e => setModal(m => m?.type === 'echeance' ? { ...m, form: { ...m.form, debut: e.target.value } } : m)}
                  disabled={modal.loading}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Période fin <span className="text-red-500">*</span></label>
                <input type="date" value={modal.form.fin}
                  onChange={e => setModal(m => m?.type === 'echeance' ? { ...m, form: { ...m.form, fin: e.target.value } } : m)}
                  disabled={modal.loading}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50" />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modale paiement multi-échéances ────────────────────────────────────── */}
      {modal?.type === 'paiement' && (
        <Modal open title="Enregistrer un paiement" size="large" zIndex={60} onClose={() => !modal.loading && setModal(null)}
          footer={<ModalFooter onCancel={() => setModal(null)} onConfirm={savePaiements} loading={modal.loading} confirmLabel="Enregistrer" />}>
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date du paiement</label>
              <input type="date" value={modal.date}
                onChange={e => setModal(m => m?.type === 'paiement' ? { ...m, date: e.target.value } : m)}
                disabled={modal.loading}
                className="w-48 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50" />
            </div>

            {/* Sélection des échéances */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Échéances à payer
                <span className="ml-2 text-xs font-normal text-slate-500">({modal.lignes.filter(l => l.selected).length} sélectionnée(s))</span>
              </label>

              {modal.lignes.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Aucune échéance payable.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {modal.lignes.map((ligne, i) => (
                    <label key={ligne.echeance.id_echeance_abonnement}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors">
                      <input type="checkbox" checked={ligne.selected}
                        onChange={e => setModal(m => {
                          if (m?.type !== 'paiement') return m
                          const lignes = [...m.lignes]
                          lignes[i] = { ...lignes[i], selected: e.target.checked }
                          return { ...m, lignes }
                        })}
                        disabled={modal.loading}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {fmtPeriode(ligne.echeance.periode_debut, ligne.echeance.periode_fin)}
                          </span>
                          <BadgeEch statut={ligne.echeance.statut} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Dû : {fmt(ligne.echeance.montant)} · Payé : {fmt(ligne.echeance.montant_paye)} · Reste : <strong className="text-orange-600 dark:text-orange-400">{fmt(ligne.echeance.reste)}</strong>
                        </div>
                      </div>
                      {ligne.selected && (
                        <div className="shrink-0">
                          <input type="number" min="1" step="1"
                            value={ligne.montant}
                            onClick={e => e.preventDefault()}
                            onChange={e => setModal(m => {
                              if (m?.type !== 'paiement') return m
                              const lignes = [...m.lignes]
                              lignes[i] = { ...lignes[i], montant: e.target.value }
                              return { ...m, lignes }
                            })}
                            disabled={modal.loading}
                            className="w-28 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Total */}
            {modal.lignes.some(l => l.selected) && (() => {
              const total = modal.lignes.filter(l => l.selected).reduce((acc, l) => acc + (parseFloat(l.montant) || 0), 0)
              return (
                <div className="flex justify-between items-center p-3 bg-slate-900 dark:bg-slate-900 rounded-lg text-white">
                  <span className="text-sm font-medium">Total du paiement</span>
                  <span className="text-lg font-bold">{fmt(total)}</span>
                </div>
              )
            })()}

            <InfoBox>
              Ce paiement créera <strong>1 transaction financière</strong> pour l'ensemble des échéances sélectionnées.
              Chaque paiement partiel est autorisé — le surplus est interdit.
            </InfoBox>
          </div>
        </Modal>
      )}

      {/* ── Modale annulation groupe ──────────────────────────────────────────── */}
      {modal?.type === 'annuler_groupe' && (
        <Modal open title="Annuler le groupe de paiement" zIndex={60} onClose={() => !modal.loading && setModal(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} disabled={modal.loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg disabled:opacity-50">
                Annuler
              </button>
              <button onClick={annulerGroupe} disabled={modal.loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {modal.loading ? 'Annulation…' : 'Confirmer l\'annulation'}
              </button>
            </div>
          }>
          <div className="space-y-3">
            <p className="text-slate-700 dark:text-slate-300">
              Ce groupe comprend <strong>{modal.nb} ligne(s)</strong> pour un total de <strong>{fmt(modal.montant)}</strong>.
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              Toutes les lignes seront annulées. Une transaction compensatoire (OUT) de <strong>{fmt(modal.montant)}</strong> sera créée.
              La transaction IN d'origine est conservée dans l'historique.
            </p>
            <div className="flex gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Cette opération est irréversible. Elle n'affecte pas les autres groupes de paiement de cette souscription.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modale confirmation générique ────────────────────────────────────── */}
      {modal?.type === 'confirm' && (
        <Modal open title={modal.title} zIndex={60} onClose={() => !modal.loading && setModal(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} disabled={modal.loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg disabled:opacity-50">
                Annuler
              </button>
              <button onClick={runConfirm} disabled={modal.loading}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 ${modal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : modal.variant === 'warning' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-primary-strong'}`}>
                {modal.loading ? 'En cours…' : 'Confirmer'}
              </button>
            </div>
          }>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{modal.message}</p>
        </Modal>
      )}
    </>
  )
}

// ─── Carte échéance ───────────────────────────────────────────────────────────

function EcheanceCard({
  echeance, expanded, onToggle, canPay, tousLesPaiements, onDemanderAnnulationGroupe,
}: {
  echeance: Echeance
  expanded: boolean
  onToggle: () => void
  canPay: boolean
  tousLesPaiements: Paiement[]
  onDemanderAnnulationGroupe: (p: Paiement, tous: Paiement[]) => void
}) {
  const annulee = !!echeance.canceled_at
  const paiementsActifs  = echeance.paiements.filter(p => !p.canceled_at)
  const paiementsAnnules = echeance.paiements.filter(p => p.canceled_at)

  return (
    <div className={`border rounded-lg overflow-hidden ${annulee ? 'opacity-60' : ''} border-slate-200 dark:border-slate-700`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {fmtPeriode(echeance.periode_debut, echeance.periode_fin)}
            </span>
            <BadgeEch statut={echeance.statut} />
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Dû : <strong className="text-slate-700 dark:text-slate-300">{fmt(echeance.montant)}</strong></span>
            <span>Payé : <strong className="text-green-700 dark:text-green-400">{fmt(echeance.montant_paye)}</strong></span>
            {echeance.reste > 0 && (
              <span className="text-orange-600 dark:text-orange-400">Reste : <strong>{fmt(echeance.reste)}</strong></span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {echeance.statut === 'payee' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 space-y-1.5 bg-slate-50/50 dark:bg-slate-800/50">
          {echeance.paiements.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Aucun paiement enregistré.</p>
          ) : (
            <>
              {paiementsActifs.map(p => {
                const groupeSize = p.id_transaction_financiere
                  ? tousLesPaiements.filter(x => x.id_transaction_financiere === p.id_transaction_financiere).length
                  : 0
                return (
                  <div key={p.id_paiement_abonnement} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">{fmtDate(p.date_paiement)}</span>
                      <span className="font-semibold text-green-700 dark:text-green-400">+ {fmt(p.montant)}</span>
                      {p.id_transaction_financiere && groupeSize > 1 && (
                        <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-[10px]">
                          <Link2 className="w-2.5 h-2.5" />
                          Groupe TF#{p.id_transaction_financiere}
                        </span>
                      )}
                    </div>
                    {canPay && p.id_transaction_financiere && (
                      <button
                        onClick={() => onDemanderAnnulationGroupe(p, tousLesPaiements)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-300 text-xs underline shrink-0 ml-2"
                      >
                        Annuler groupe
                      </button>
                    )}
                  </div>
                )
              })}
              {paiementsAnnules.map(p => (
                <div key={p.id_paiement_abonnement} className="flex items-center gap-2 text-xs opacity-50 line-through">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="text-slate-500">{fmtDate(p.date_paiement)}</span>
                  <span className="text-slate-500">{fmt(p.montant)}</span>
                  <span className="no-underline text-red-400">(annulé)</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function SectionDrawer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span>{title}</span>
        <span className="flex-1 block h-px bg-slate-100 dark:bg-slate-700" />
      </h3>
      {children}
    </section>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900 dark:text-white">{value ?? '—'}</dd>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{children}</p>
    </div>
  )
}

function ModalFooter({
  onCancel, onConfirm, loading, confirmLabel = 'Confirmer',
}: {
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
  confirmLabel?: string
}) {
  return (
    <div className="flex justify-end gap-2">
      <button onClick={onCancel} disabled={loading}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg disabled:opacity-50">
        Annuler
      </button>
      <button onClick={onConfirm} disabled={loading}
        className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg disabled:opacity-50">
        {loading ? 'En cours…' : confirmLabel}
      </button>
    </div>
  )
}
