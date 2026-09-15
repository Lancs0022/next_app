'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  FileText, Users, RefreshCw, AlertCircle, Info,
  MoreVertical, CreditCard, CheckCircle2, XCircle, Link2,
  ChevronDown, ChevronRight, RefreshCcw,
} from 'lucide-react'
import TypeaheadSelect from '@/components/TypeaheadSelect'
import DateRangeFilter from '@/components/DateRangeFilter'
import api from '@/services/api'
import Box from '@/components/Box/Box'
import TabBox from '@/components/TabBox/TabBox'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import Modal from '@/components/Modal/Modal'
import DrawerSouscription from '@/components/Abonnements/DrawerSouscription'
import DrawerOffre from '@/components/Abonnements/DrawerOffre'
import { useToast } from '@/components/Toast/ToastContainer'

// ─── Types ────────────────────────────────────────────────────────────────────

type AbonnementStatut = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
type SouscriptionStatut = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE'

interface Offre {
  id_abonnement: number
  nom: string
  description: string | null
  montant: number
  periodicite: string
  statut: AbonnementStatut
  nb_souscriptions: number
  nb_souscriptions_actives: number
  created_at: string
  modified_at: string | null
}

interface Souscription {
  id_souscription_abonnement: number
  id_abonnement: number
  id_collaborateur: number
  collaborateur_nom: string
  abonnement_nom: string
  abonnement_periodicite: string
  abonnement_statut: string
  montant: number
  renouvellement_auto: boolean
  date_debut: string
  date_fin: string | null
  statut: SouscriptionStatut
  canceled_at: string | null
  created_at: string
  prochaine_echeance: {
    id: number
    periode_debut: string
    periode_fin: string
    statut: string
    montant_du: number
    montant_paye: number | null
    reste: number
  } | null
}

interface CollaborateurOption {
  id_collaborateur: number
  nom: string
  prenom: string | null
}

// Type local minimal pour DateRangeFilter (l'interface n'est pas exportée depuis le composant)
// Doit être compatible avec le type interne du composant (index signature pour le cast)
type DateFilterValue = {
  dateMin?: string | null
  dateMax?: string | null
  mode?: string
  target?: string
  [key: string]: unknown  // nécessaire pour compatibilité avec le retour du composant
}

interface PaiementListe {
  id_paiement_abonnement: number
  id_transaction_financiere: number | null
  id_echeance_abonnement: number
  id_souscription_abonnement: number
  id_collaborateur: number
  collaborateur_nom: string
  abonnement_nom: string
  abonnement_periodicite: string
  montant: number
  date_paiement: string
  periode_debut: string
  periode_fin: string
  echeance_statut: string
  canceled_at: string | null
  created_at: string
  created_by: number | null
}

// ─── Helpers badges ───────────────────────────────────────────────────────────

function badgeOffre(statut: AbonnementStatut) {
  const map: Record<AbonnementStatut, string> = {
    ACTIVE:   'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    INACTIVE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    ARCHIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }
  const labels: Record<AbonnementStatut, string> = {
    ACTIVE: 'Active', INACTIVE: 'Inactive', ARCHIVED: 'Archivée',
  }
  return { cls: map[statut] ?? map.INACTIVE, label: labels[statut] ?? statut }
}

function badgeSouscription(statut: SouscriptionStatut) {
  const map: Record<SouscriptionStatut, string> = {
    ACTIVE:    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    SUSPENDUE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    TERMINEE:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    ANNULEE:   'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  const labels: Record<SouscriptionStatut, string> = {
    ACTIVE: 'Active', SUSPENDUE: 'Suspendue', TERMINEE: 'Terminée', ANNULEE: 'Annulée',
  }
  return { cls: map[statut] ?? map.TERMINEE, label: labels[statut] ?? statut }
}

function badgeEcheance(statut: string) {
  const map: Record<string, string> = {
    en_attente:          'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    partiellement_payee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    payee:               'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    annulee:             'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente', partiellement_payee: 'Partielle', payee: 'Payée', annulee: 'Annulée',
  }
  return { cls: map[statut] ?? 'bg-slate-100 text-slate-600', label: labels[statut] ?? statut }
}

function formatMontant(n: number) {
  return new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(n) + ' Ar'
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PERIODICITE_LABELS: Record<string, string> = {
  mensuel: 'Mensuel', trimestriel: 'Trimestriel', annuel: 'Annuel', ponctuel: 'Ponctuel',
}

// ─── Filtres souscriptions ────────────────────────────────────────────────────

type FiltresSouscription = SouscriptionStatut | 'TOUTES' | 'IMPAYEES'

const FILTRES: { id: FiltresSouscription; label: string }[] = [
  { id: 'TOUTES',    label: 'Toutes' },
  { id: 'ACTIVE',    label: 'Actives' },
  { id: 'IMPAYEES',  label: 'Impayées' },
  { id: 'TERMINEE',  label: 'Terminées' },
  { id: 'ANNULEE',   label: 'Annulées' },
]

// ─── Modale confirmation générique ───────────────────────────────────────────

interface ConfirmDialog {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  confirmVariant: 'danger' | 'warning' | 'primary'
  onConfirm: () => Promise<void>
}

const CONFIRM_CLOSED: ConfirmDialog = {
  open: false, title: '', message: '',
  confirmLabel: 'Confirmer', confirmVariant: 'primary', onConfirm: async () => {},
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AbonnementsPage() {
  const { showToast } = useToast()

  // ── Offres ───────────────────────────────────────────────────────────────────
  const [offres, setOffres] = useState<Offre[]>([])
  const [offresLoading, setOffresLoading] = useState(false)

  // ── Souscriptions ─────────────────────────────────────────────────────────────
  const [souscriptions, setSouscriptions] = useState<Souscription[]>([])
  const [souscriptionsLoading, setSouscriptionsLoading] = useState(false)
  const [filtreActif, setFiltreActif] = useState<FiltresSouscription>('TOUTES')

  // ── Collaborateurs (chargés une fois, jamais rechargés) ───────────────────────
  const [collaborateurs, setCollaborateurs] = useState<CollaborateurOption[]>([])

  // ── Modale création offre ─────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    nom: '', description: '', montant: '', periodicite: 'mensuel',
  })
  const [createLoading, setCreateLoading] = useState(false)

  // ── Modale création souscription ──────────────────────────────────────────────
  const [souscrireOpen, setSouscrireOpen] = useState(false)
  const [souscrireForm, setSouscrireForm] = useState({
    id_collaborateur: '',
    id_abonnement:    '',
    montant:          '',
    date_debut:       new Date().toISOString().split('T')[0],
    renouvellement_auto: true,
  })
  const [souscrireLoading, setSouscrireLoading] = useState(false)
  // Offre sélectionnée pour pré-remplir le montant catalogue
  const [offreSelectionnee, setOffreSelectionnee] = useState<Pick<Offre, 'id_abonnement' | 'nom' | 'montant' | 'periodicite'> | null>(null)

  // ── Modale confirmation ───────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<ConfirmDialog>(CONFIRM_CLOSED)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // ── Drawer détail souscription ────────────────────────────────────────────────
  const [drawerSousId, setDrawerSousId] = useState<number | null>(null)
  const [drawerSousOpen, setDrawerSousOpen] = useState(false)

  // ── Drawer détail offre ───────────────────────────────────────────────────────
  const [drawerOffreId, setDrawerOffreId] = useState<number | null>(null)
  const [drawerOffreOpen, setDrawerOffreOpen] = useState(false)

  // ── Onglet Paiements ──────────────────────────────────────────────────────────
  const [paiements, setPaiements] = useState<PaiementListe[]>([])
  const [paiementsLoading, setPaiementsLoading] = useState(false)
  const [filtrePaiements, setFiltrePaiements] = useState<'tous' | 'actifs' | 'annules'>('actifs')

  // ── Sort + pagination offres (client-side) ────────────────────────────────────
  const [offresSortConfig, setOffresSortConfig] = useState<{ field: string; direction: string }>({ field: '', direction: 'asc' })
  const [offresPage, setOffresPage] = useState(1)
  const [offresPerPage, setOffresPerPage] = useState(25)

  // ── Sort + pagination souscriptions (client-side) ──────────────────────────────
  const [sousSortConfig, setSousSortConfig] = useState<{ field: string; direction: string }>({ field: '', direction: 'asc' })
  const [sousPage, setSousPage] = useState(1)
  const [sousPerPage, setSousPerPage] = useState(25)

  // ── Filtres avancés souscriptions ──────────────────────────────────────────────
  const [showSousFilters, setShowSousFilters] = useState(false)
  const [filtreCollabInput, setFiltreCollabInput] = useState('')
  const [filtreOffreInput, setFiltreOffreInput] = useState('')
  const [filtreDateDebut, setFiltreDateDebut] = useState<DateFilterValue | null>(null)

  // ─── Chargement ───────────────────────────────────────────────────────────────

  const fetchOffres = useCallback(async () => {
    setOffresLoading(true)
    try {
      const { data: res } = await api.get('/abonnements')
      setOffres(res?.data ?? [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur chargement offres', 'error')
    } finally {
      setOffresLoading(false)
    }
  }, [showToast])

  const fetchSouscriptions = useCallback(async () => {
    setSouscriptionsLoading(true)
    try {
      const { data: res } = await api.get('/souscriptions-abonnements')
      setSouscriptions(res?.data ?? [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur chargement souscriptions', 'error')
    } finally {
      setSouscriptionsLoading(false)
    }
  }, [showToast])

  const fetchPaiements = useCallback(async () => {
    setPaiementsLoading(true)
    try {
      const { data: res } = await api.get('/paiements-abonnements')
      setPaiements(res?.data ?? [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur chargement paiements', 'error')
    } finally {
      setPaiementsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchOffres()
    fetchSouscriptions()
    fetchPaiements()
    // Collaborateurs : chargés une seule fois par session
    api.get('/collaborateurs')
      .then(({ data: res }) => setCollaborateurs(res?.data ?? []))
      .catch(() => { /* non bloquant */ })
  }, [fetchOffres, fetchSouscriptions, fetchPaiements])

  // ─── Pré-remplissage montant lors du choix d'une offre ────────────────────────

  const handleOffreChange = (val: string) => {
    setSouscrireForm(p => ({ ...p, id_abonnement: val }))
    const offre = offres.find(o => String(o.id_abonnement) === val) ?? null
    setOffreSelectionnee(offre)
    if (offre && !souscrireForm.montant) {
      setSouscrireForm(p => ({ ...p, montant: String(offre.montant) }))
    }
  }

  // ─── Filtrage souscriptions (client-side) ──────────────────────────────────────

  // ─── Création d'une offre ──────────────────────────────────────────────────────

  const handleCreateOffre = async (e: React.FormEvent) => {
    e.preventDefault()
    const montant = parseFloat(createForm.montant)
    if (!createForm.nom.trim()) { showToast('Le nom est requis', 'error'); return }
    if (!montant || montant <= 0) { showToast('Le montant doit être > 0', 'error'); return }
    setCreateLoading(true)
    try {
      await api.post('/abonnements', {
        nom:         createForm.nom.trim(),
        description: createForm.description.trim() || null,
        montant,
        periodicite: createForm.periodicite,
      })
      showToast('Offre créée', 'success')
      setCreateOpen(false)
      setCreateForm({ nom: '', description: '', montant: '', periodicite: 'mensuel' })
      await fetchOffres()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur création', 'error')
    } finally {
      setCreateLoading(false)
    }
  }

  // ─── Création d'une souscription ───────────────────────────────────────────────

  const openSouscrire = (offrePreselect?: Pick<Offre, 'id_abonnement' | 'nom' | 'montant' | 'periodicite'>) => {
    setSouscrireForm({
      id_collaborateur: '',
      id_abonnement:    offrePreselect ? String(offrePreselect.id_abonnement) : '',
      montant:          offrePreselect ? String(offrePreselect.montant) : '',
      date_debut:       new Date().toISOString().split('T')[0],
      renouvellement_auto: true,
    })
    setOffreSelectionnee(offrePreselect ?? null)
    setSouscrireOpen(true)
  }

  const handleCreateSouscription = async (e: React.FormEvent) => {
    e.preventDefault()
    const montant = parseFloat(souscrireForm.montant)
    if (!souscrireForm.id_collaborateur) { showToast('Sélectionnez un collaborateur', 'error'); return }
    if (!souscrireForm.id_abonnement)    { showToast('Sélectionnez une offre', 'error'); return }
    if (!montant || montant <= 0)        { showToast('Le tarif applicable doit être > 0', 'error'); return }
    if (!souscrireForm.date_debut)       { showToast('La date de début est requise', 'error'); return }

    setSouscrireLoading(true)
    try {
      await api.post('/souscriptions-abonnements', {
        id_collaborateur:    Number(souscrireForm.id_collaborateur),
        id_abonnement:       Number(souscrireForm.id_abonnement),
        montant,
        date_debut:          souscrireForm.date_debut,
        renouvellement_auto: souscrireForm.renouvellement_auto,
      })
      showToast('Souscription créée', 'success')
      setSouscrireOpen(false)
      await fetchSouscriptions()
      await fetchOffres() // met à jour les compteurs
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur création souscription', 'error')
    } finally {
      setSouscrireLoading(false)
    }
  }

  // ─── Actions sur une offre ────────────────────────────────────────────────────

  const patchStatut = useCallback(
    async (id: number, statut: AbonnementStatut) => {
      try {
        await api.patch(`/abonnements/${id}/statut`, { statut })
        showToast('Statut mis à jour', 'success')
        await fetchOffres()
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur mise à jour', 'error')
      }
    },
    [fetchOffres, showToast]
  )

  const confirmDesactiver = (offre: Offre) =>
    setConfirm({
      open: true,
      title: "Désactiver l'offre",
      message: `"${offre.nom}" ne pourra plus recevoir de nouvelles souscriptions. Les ${offre.nb_souscriptions_actives} souscription(s) existante(s) continueront normalement.`,
      confirmLabel: 'Désactiver',
      confirmVariant: 'warning',
      onConfirm: async () => patchStatut(offre.id_abonnement, 'INACTIVE'),
    })

  const confirmReactiver = (offre: Offre) =>
    setConfirm({
      open: true,
      title: "Réactiver l'offre",
      message: `"${offre.nom}" sera à nouveau ouverte aux nouvelles souscriptions.`,
      confirmLabel: 'Réactiver',
      confirmVariant: 'primary',
      onConfirm: async () => patchStatut(offre.id_abonnement, 'ACTIVE'),
    })

  const confirmArchiver = (offre: Offre) => {
    if (offre.nb_souscriptions_actives > 0) {
      showToast(`Impossible d'archiver : ${offre.nb_souscriptions_actives} souscription(s) active(s). Terminez-les d'abord.`, 'error')
      return
    }
    setConfirm({
      open: true,
      title: "Archiver l'offre",
      message: `"${offre.nom}" sera archivée. Elle restera visible dans l'historique mais ne pourra plus recevoir de souscriptions.`,
      confirmLabel: 'Archiver',
      confirmVariant: 'warning',
      onConfirm: async () => patchStatut(offre.id_abonnement, 'ARCHIVED'),
    })
  }

  const confirmSupprimer = (offre: Offre) => {
    if (offre.nb_souscriptions > 0) {
      showToast(`Suppression impossible : cette offre a ${offre.nb_souscriptions} souscription(s). Utilisez l'archivage.`, 'error')
      return
    }
    setConfirm({
      open: true,
      title: 'Supprimer définitivement',
      message: `"${offre.nom}" n'a aucune souscription et sera supprimée définitivement. Cette opération est irréversible.`,
      confirmLabel: 'Supprimer définitivement',
      confirmVariant: 'danger',
      onConfirm: async () => {
        await api.delete(`/abonnements/${offre.id_abonnement}`)
        showToast('Offre supprimée', 'success')
        await fetchOffres()
      },
    })
  }

  const runConfirm = async () => {
    setConfirmLoading(true)
    try {
      await confirm.onConfirm()
      setConfirm(CONFIRM_CLOSED)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur', 'error')
    } finally {
      setConfirmLoading(false)
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  const stats = [
    { label: 'Offres actives',     value: offres.filter(o => o.statut === 'ACTIVE').length,   color: 'bg-green-500' },
    { label: 'Offres inactives',   value: offres.filter(o => o.statut === 'INACTIVE').length, color: 'bg-orange-500' },
    { label: 'Souscriptions',      value: souscriptions.filter(s => s.statut === 'ACTIVE').length, color: 'bg-primary' },
    {
      label: 'Échéances impayées',
      value: souscriptions.filter(s =>
        s.prochaine_echeance && ['en_attente', 'partiellement_payee'].includes(s.prochaine_echeance.statut)
      ).length,
      color: 'bg-red-500',
    },
  ]

  // ─── Options TypeaheadSelect ──────────────────────────────────────────────────

  const optionsCollabs = collaborateurs.map(c => ({
    value: String(c.id_collaborateur),
    label: `${c.nom}${c.prenom ? ` ${c.prenom}` : ''}`,
  }))

  const optionsOffresActives = offres
    .filter(o => o.statut === 'ACTIVE')
    .map(o => ({
      value: String(o.id_abonnement),
      label: `${o.nom} — ${formatMontant(o.montant)} / ${PERIODICITE_LABELS[o.periodicite] ?? o.periodicite}`,
    }))

  // ─── Colonnes Offres ──────────────────────────────────────────────────────────

  const colonnesOffres = [
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
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={row.description}>
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
        <span className="font-semibold text-slate-900 dark:text-white">{formatMontant(row.montant)}</span>
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
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
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
              {' '}/ {row.nb_souscriptions} total
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
          actions.push({ label: 'Voir le détail',              onClick: () => { setDrawerOffreId(row.id_abonnement); setDrawerOffreOpen(true) } })
          actions.push({ label: 'Souscrire un collaborateur',  onClick: () => openSouscrire(row) })
          actions.push({ label: 'Désactiver',                  onClick: () => confirmDesactiver(row) })
          actions.push({ label: 'Archiver',                    onClick: () => confirmArchiver(row) })
        }
        if (row.statut === 'INACTIVE') {
          actions.push({ label: 'Voir le détail',  onClick: () => { setDrawerOffreId(row.id_abonnement); setDrawerOffreOpen(true) } })
          actions.push({ label: 'Réactiver',       onClick: () => confirmReactiver(row) })
          actions.push({ label: 'Archiver',        onClick: () => confirmArchiver(row) })
        }
        if (row.statut === 'ARCHIVED') {
          actions.push({ label: 'Voir le détail',  onClick: () => { setDrawerOffreId(row.id_abonnement); setDrawerOffreOpen(true) } })
          actions.push({ label: 'Réactiver',       onClick: () => confirmReactiver(row) })
        }
        if (row.nb_souscriptions === 0) {
          actions.push({ label: 'Supprimer',  onClick: () => confirmSupprimer(row), variant: 'danger' })
        }
        return <InlineActionsMenu actions={actions} />
      },
    },
  ]

  // ─── Colonnes Souscriptions — 5 colonnes composites ──────────────────────────
  // Desktop : 5 colonnes (Collaborateur / Offre / Contrat / Situation / Prochaine échéance) + Actions
  // Mobile  : renderMobilePrimary + renderMobileSecondary → card custom via onglet dédié

  const PERIODICITE_DUREE: Record<string, string> = {
    mensuel: '1 mois', trimestriel: '3 mois', annuel: '1 an', ponctuel: 'Unique',
  }

  const colonnesSouscriptions = [
    // ── Col 1 : Collaborateur ──────────────────────────────────────────────────
    {
      field: 'collaborateur_nom',
      headerName: 'Collaborateur',
      sortable: true,
      minWidth: '140px',
      width: '160px',
      renderCell: (row: Souscription) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white truncate leading-tight">{row.collaborateur_nom}</p>
        </div>
      ),
      renderMobilePrimary: (row: Souscription) => (
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white leading-tight">{row.collaborateur_nom}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">
            {row.abonnement_nom}
            {row.abonnement_statut !== 'ACTIVE' && (
              <span className="ml-1 text-xs text-slate-400">({row.abonnement_statut.toLowerCase()})</span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {formatMontant(row.montant)} · {PERIODICITE_LABELS[row.abonnement_periodicite] ?? row.abonnement_periodicite} · {PERIODICITE_DUREE[row.abonnement_periodicite] ?? ''}
          </p>
        </div>
      ),
      renderMobileSecondary: (row: Souscription) => {
        const { cls, label } = badgeSouscription(row.statut)
        return (
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
          </div>
        )
      },
    },

    // ── Col 2 : Offre + tarif + périodicité ────────────────────────────────────
    {
      field: 'abonnement_nom',
      headerName: 'Offre',
      sortable: true,
      minWidth: '160px',
      renderCell: (row: Souscription) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-white truncate leading-tight">
            {row.abonnement_nom}
            {row.abonnement_statut !== 'ACTIVE' && (
              <span className="ml-1 text-xs text-slate-400">({row.abonnement_statut.toLowerCase()})</span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMontant(row.montant)}</span>
            {' · '}{PERIODICITE_LABELS[row.abonnement_periodicite] ?? row.abonnement_periodicite}
            {' · '}{PERIODICITE_DUREE[row.abonnement_periodicite] ?? ''}
          </p>
        </div>
      ),
    },

    // ── Col 3 : Contrat (début / fin contractuelle / renouvellement) ───────────
    {
      field: 'date_debut',
      headerName: 'Contrat',
      sortable: true,
      minWidth: '150px',
      renderCell: (row: Souscription) => (
        <div className="min-w-0">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-tight">
            Depuis le {formatDate(row.date_debut)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
            {row.date_fin ? `→ ${formatDate(row.date_fin)}` : 'Sans date de fin'}
          </p>
          <p className={`text-xs mt-0.5 leading-tight ${
            row.renouvellement_auto ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {row.renouvellement_auto ? 'Renouvellement auto' : 'Renouvellement manuel'}
          </p>
        </div>
      ),
    },

    // ── Col 4 : Situation (statut souscription + statut paiement) ──────────────
    {
      field: 'statut',
      headerName: 'Situation',
      sortable: true,
      width: '140px',
      minWidth: '120px',
      renderCell: (row: Souscription) => {
        const { cls, label } = badgeSouscription(row.statut)
        const e = row.prochaine_echeance
        const echeanceStatut = e ? e.statut : null
        const echeanceCls = echeanceStatut ? badgeEcheance(echeanceStatut).cls : ''
        const echeanceLabel = echeanceStatut ? badgeEcheance(echeanceStatut).label : null
        return (
          <div className="space-y-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
            {echeanceLabel && echeanceStatut !== 'payee' && (
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${echeanceCls}`}>{echeanceLabel}</span>
              </div>
            )}
            {(!echeanceLabel || echeanceStatut === 'payee') && (
              <div>
                <span className="inline-flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> À jour
                </span>
              </div>
            )}
          </div>
        )
      },
    },

    // ── Col 5 : Prochaine échéance ─────────────────────────────────────────────
    {
      field: 'prochaine_echeance',
      headerName: 'Prochaine échéance',
      minWidth: '140px',
      width: '160px',
      renderCell: (row: Souscription) => {
        const e = row.prochaine_echeance
        if (!e) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
        const impayee = e.statut !== 'payee'
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
              {formatDate(e.periode_fin)}
            </p>
            {impayee && (
              <p className={`text-xs mt-0.5 leading-tight font-semibold ${
                e.statut === 'partiellement_payee' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
              }`}>
                {e.reste > 0 ? `${formatMontant(e.reste)} restant` : formatMontant(e.montant_du ?? e.reste)}
              </p>
            )}
          </div>
        )
      },
    },

    // ── Col Actions ────────────────────────────────────────────────────────────
    {
      field: 'actions',
      headerName: '',
      width: '48px',
      renderCell: (row: Souscription) => (
        <InlineActionsMenu actions={[
          {
            label: 'Voir le détail',
            onClick: () => { setDrawerSousId(row.id_souscription_abonnement); setDrawerSousOpen(true) },
          },
        ]} />
      ),
    },
  ]

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {stats.map((stat) => (
          <Box key={stat.label} padding="p-3 md:p-4" hover>
            <div className="flex items-center">
              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${stat.color} mr-2 md:mr-3 shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="text-lg md:text-2xl font-bold text-navy-dark dark:text-white truncate">{stat.value}</p>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">{stat.label}</p>
              </div>
            </div>
          </Box>
        ))}
      </div>

      {/* Contenu principal */}
      <TabBox
        tabs={[
          // ── Onglet Offres ─────────────────────────────────────────────────────
          {
            id: 'offres',
            label: 'Offres',
            badge: offres.filter(o => o.statut === 'ACTIVE').length || undefined,
            content: (
              <div className="-mx-4 md:mx-0">
                {offres.length === 0 && !offresLoading ? (
                  <EmptyState
                    icon={<FileText className="w-10 h-10 text-slate-400" />}
                    title="Aucune offre"
                    description="Créez votre première offre d'abonnement pour commencer."
                    action={
                      <button
                        onClick={() => setCreateOpen(true)}
                        className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Créer une offre
                      </button>
                    }
                  />
                ) : (
                  <ResponsiveDataTable
                    columns={colonnesOffres}
                    data={(() => {
                      let d = [...offres]
                      if (offresSortConfig.field && offresSortConfig.direction) {
                        const dir = offresSortConfig.direction === 'asc' ? 1 : -1
                        d = d.sort((a, b) => {
                          const va = (a as unknown as Record<string, unknown>)[offresSortConfig.field] ?? ''
                          const vb = (b as unknown as Record<string, unknown>)[offresSortConfig.field] ?? ''
                          if (va < vb) return -1 * dir
                          if (va > vb) return 1 * dir
                          return 0
                        })
                      }
                      return d.slice((offresPage - 1) * offresPerPage, offresPage * offresPerPage)
                    })()}
                    loading={offresLoading}
                    pagination={{ page: offresPage, perPage: offresPerPage, total: offres.length }}
                    onPageChange={(p) => setOffresPage(p)}
                    onPageSizeChange={(size) => { setOffresPerPage(size); setOffresPage(1) }}
                    onSort={(cfg) => { setOffresSortConfig(cfg); setOffresPage(1) }}
                    sortConfig={offresSortConfig}
                    onFiltersChange={() => {}}
                  />
                )}
              </div>
            ),
          },

          // ── Onglet Souscriptions ──────────────────────────────────────────────
          {
            id: 'souscriptions',
            label: 'Souscriptions',
            badge: souscriptions.filter(s => s.statut === 'ACTIVE').length || undefined,
            content: (() => {
              // ── Filtrage + tri + pagination côté client ──────────────────────

              // 1. Filtre par statut (boutons Toutes / Actives / etc.)
              let filtered = souscriptions.filter((s) => {
                if (filtreActif === 'TOUTES') return true
                if (filtreActif === 'IMPAYEES') return s.prochaine_echeance !== null && ['en_attente', 'partiellement_payee'].includes(s.prochaine_echeance.statut)
                return s.statut === filtreActif
              })

              // 2. Filtres avancés
              if (filtreCollabInput) {
                const q = filtreCollabInput.toLowerCase()
                filtered = filtered.filter(s => s.collaborateur_nom.toLowerCase().includes(q))
              }
              if (filtreOffreInput) {
                const q = filtreOffreInput.toLowerCase()
                filtered = filtered.filter(s => s.abonnement_nom.toLowerCase().includes(q))
              }
              if (filtreDateDebut?.dateMin) {
                const min = new Date(filtreDateDebut.dateMin)
                filtered = filtered.filter(s => new Date(s.date_debut) >= min)
              }
              if (filtreDateDebut?.dateMax) {
                const max = new Date(filtreDateDebut.dateMax!)
                filtered = filtered.filter(s => new Date(s.date_debut) <= max)
              }

              // 3. Tri
              if (sousSortConfig.field && sousSortConfig.direction) {
                const dir = sousSortConfig.direction === 'asc' ? 1 : -1
                filtered = [...filtered].sort((a, b) => {
                  const va = (a as unknown as Record<string, unknown>)[sousSortConfig.field] ?? ''
                  const vb = (b as unknown as Record<string, unknown>)[sousSortConfig.field] ?? ''
                  if (va < vb) return -1 * dir
                  if (va > vb) return 1 * dir
                  return 0
                })
              }

              // 4. Pagination
              const total = filtered.length
              const startIdx = (sousPage - 1) * sousPerPage
              const paginated = filtered.slice(startIdx, startIdx + sousPerPage)

              // Options TypeaheadSelect collaborateurs et offres
              const optionsCollab = [...new Map(souscriptions.map(s => [s.id_collaborateur, { value: String(s.id_collaborateur), label: s.collaborateur_nom }])).values()]
              const optionsOffre  = [...new Map(souscriptions.map(s => [s.id_abonnement, { value: String(s.id_abonnement), label: s.abonnement_nom }])).values()]

              const hasFiltersActifs = filtreCollabInput || filtreOffreInput || filtreDateDebut

              return (
                <div className="space-y-3">

                  {/* ── Barre principale : filtres statut + bouton new + toggle filtres avancés ── */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Filtres statut — scroll horizontal sur mobile */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1 pb-0.5">
                      {FILTRES.map((f) => {
                        const count =
                          f.id === 'TOUTES'    ? souscriptions.length
                          : f.id === 'IMPAYEES' ? souscriptions.filter(s => s.prochaine_echeance && ['en_attente', 'partiellement_payee'].includes(s.prochaine_echeance.statut)).length
                          : souscriptions.filter(s => s.statut === f.id).length
                        return (
                          <button key={f.id} onClick={() => { setFiltreActif(f.id); setSousPage(1) }}
                            className={`flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filtreActif === f.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                            {f.label}
                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filtreActif === f.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400'}`}>
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Actions droite */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle filtres avancés */}
                      <button onClick={() => setShowSousFilters(p => !p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showSousFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        Filtres
                        {hasFiltersActifs && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                      <button onClick={() => openSouscrire()}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                        Nouvelle souscription
                      </button>
                    </div>
                  </div>

                  {/* ── Filtres avancés (dépliables) ──────────────────────────── */}
                  {showSousFilters && (
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Collaborateur */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Collaborateur</label>
                          <TypeaheadSelect
                            options={optionsCollab}
                            value={filtreCollabInput}
                            onChange={(v) => { setFiltreCollabInput(v); setSousPage(1) }}
                            placeholder="Tous les collaborateurs…"
                          />
                        </div>
                        {/* Offre */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Offre</label>
                          <TypeaheadSelect
                            options={optionsOffre}
                            value={filtreOffreInput}
                            onChange={(v) => { setFiltreOffreInput(v); setSousPage(1) }}
                            placeholder="Toutes les offres…"
                          />
                        </div>
                        {/* Date de début */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Date de début</label>
                          <DateRangeFilter
                            value={filtreDateDebut}
                            onChange={(v) => { setFiltreDateDebut(v as DateFilterValue | null); setSousPage(1) }}
                            hideTargetSelect
                            defaultTarget="date_debut"
                          />
                        </div>
                      </div>
                      {/* Reset */}
                      {hasFiltersActifs && (
                        <div className="flex justify-end">
                          <button onClick={() => { setFiltreCollabInput(''); setFiltreOffreInput(''); setFiltreDateDebut(null); setSousPage(1) }}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            <RefreshCcw className="w-3.5 h-3.5" />
                            Réinitialiser les filtres
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Table / cards ─────────────────────────────────────────── */}
                  <div className="-mx-4 md:mx-0">
                    {paginated.length === 0 && !souscriptionsLoading ? (
                      <EmptyState
                        icon={<Users className="w-10 h-10 text-slate-400" />}
                        title={filtreActif === 'TOUTES' && !hasFiltersActifs ? 'Aucune souscription' : 'Aucun résultat'}
                        description={
                          filtreActif === 'TOUTES' && !hasFiltersActifs
                            ? "Les souscriptions apparaîtront ici lorsqu'un collaborateur souscrit à une offre."
                            : "Aucune souscription ne correspond aux filtres appliqués."
                        }
                        action={filtreActif === 'TOUTES' && !hasFiltersActifs ? (
                          <button onClick={() => openSouscrire()}
                            className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors">
                            Nouvelle souscription
                          </button>
                        ) : (
                          <button onClick={() => { setFiltreActif('TOUTES'); setFiltreCollabInput(''); setFiltreOffreInput(''); setFiltreDateDebut(null) }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors">
                            Effacer les filtres
                          </button>
                        )}
                      />
                    ) : (
                      <ResponsiveDataTable
                        columns={colonnesSouscriptions}
                        data={paginated}
                        loading={souscriptionsLoading}
                        pagination={{ page: sousPage, perPage: sousPerPage, total }}
                        onPageChange={(p) => setSousPage(p)}
                        onPageSizeChange={(size) => { setSousPerPage(size); setSousPage(1) }}
                        onSort={(cfg) => { setSousSortConfig(cfg); setSousPage(1) }}
                        sortConfig={sousSortConfig}
                        onRowClick={(row) => { setDrawerSousId((row as Souscription).id_souscription_abonnement); setDrawerSousOpen(true) }}
                        onFiltersChange={() => {}}
                      />
                    )}
                  </div>

                </div>
              )
            })(),
          },

          // ── Onglet Paiements ──────────────────────────────────────────────────
          {
            id: 'paiements',
            label: 'Paiements',
            badge: paiements.filter(p => !p.canceled_at).length || undefined,
            content: (() => {
              const filtered = filtrePaiements === 'actifs'
                ? paiements.filter(p => !p.canceled_at)
                : filtrePaiements === 'annules'
                ? paiements.filter(p => p.canceled_at)
                : paiements

              const groupCount = new Map<number, number>()
              for (const p of paiements) {
                if (p.id_transaction_financiere) {
                  groupCount.set(p.id_transaction_financiere, (groupCount.get(p.id_transaction_financiere) ?? 0) + 1)
                }
              }

              const colonnesPaiements = [
                {
                  field: 'collaborateur_nom', headerName: 'Collaborateur', sortable: true, filterable: true, minWidth: '140px',
                  renderCell: (row: PaiementListe) => <span className="font-medium text-slate-900 dark:text-white">{row.collaborateur_nom}</span>,
                },
                {
                  field: 'abonnement_nom', headerName: 'Offre', sortable: true, filterable: true, minWidth: '130px',
                  renderCell: (row: PaiementListe) => (
                    <div>
                      <span className="text-slate-900 dark:text-white">{row.abonnement_nom}</span>
                      <p className="text-xs text-slate-400">{PERIODICITE_LABELS[row.abonnement_periodicite] ?? row.abonnement_periodicite}</p>
                    </div>
                  ),
                },
                {
                  field: 'periode', headerName: 'Période couverte', minWidth: '160px', hideBelow: 'md' as const,
                  renderCell: (row: PaiementListe) => {
                    const { cls, label } = badgeEcheance(row.echeance_statut)
                    return (
                      <div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {new Date(row.periode_debut).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                          {' → '}
                          {new Date(row.periode_fin).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                        </span>
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>
                        </div>
                      </div>
                    )
                  },
                },
                {
                  field: 'montant', headerName: 'Montant', sortable: true, width: '120px',
                  renderCell: (row: PaiementListe) => (
                    <span className={`font-semibold ${row.canceled_at ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatMontant(row.montant)}
                    </span>
                  ),
                },
                {
                  field: 'date_paiement', headerName: 'Date', sortable: true, width: '110px',
                  renderCell: (row: PaiementListe) => <span className="text-sm text-slate-700 dark:text-slate-300">{formatDate(row.date_paiement)}</span>,
                },
                {
                  field: 'statut', headerName: 'Statut', width: '100px',
                  renderCell: (row: PaiementListe) => row.canceled_at
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"><XCircle className="w-3 h-3" />Annulé</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"><CheckCircle2 className="w-3 h-3" />Actif</span>,
                },
                {
                  field: 'groupe', headerName: 'Groupe', width: '140px', hideBelow: 'lg' as const,
                  renderCell: (row: PaiementListe) => {
                    if (!row.id_transaction_financiere) return <span className="text-slate-400 text-xs">Individuel</span>
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
              ]

              return (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {([['actifs', 'Actifs'], ['annules', 'Annulés'], ['tous', 'Tous']] as const).map(([id, lbl]) => (
                      <button key={id} onClick={() => setFiltrePaiements(id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtrePaiements === id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                        {lbl}
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filtrePaiements === id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400'}`}>
                          {id === 'actifs' ? paiements.filter(p => !p.canceled_at).length : id === 'annules' ? paiements.filter(p => p.canceled_at).length : paiements.length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="-mx-4 md:mx-0">
                    {filtered.length === 0 && !paiementsLoading ? (
                      <EmptyState
                        icon={<CreditCard className="w-10 h-10 text-slate-400" />}
                        title="Aucun paiement"
                        description="Les paiements d'abonnements apparaîtront ici après enregistrement."
                      />
                    ) : (
                      <ResponsiveDataTable
                        columns={colonnesPaiements}
                        data={filtered}
                        loading={paiementsLoading}
                        pagination={{ page: 1, perPage: 50, total: filtered.length }}
                        onPageChange={() => {}}
                        onPageSizeChange={() => {}}
                        onSort={() => {}}
                      />
                    )}
                  </div>
                </div>
              )
            })(),
          },
        ]}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Nouvelle offre
          </button>
        }
      />

      {/* ── Modale création offre ─────────────────────────────────────────────── */}
      <Modal
        open={createOpen}
        title="Créer une offre"
        onClose={() => !createLoading && setCreateOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} disabled={createLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="submit" form="form-create-offre" disabled={createLoading}
              className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {createLoading ? 'Création...' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="form-create-offre" onSubmit={handleCreateOffre} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nom de l'offre <span className="text-red-500">*</span>
            </label>
            <input value={createForm.nom} onChange={(e) => setCreateForm(p => ({ ...p, nom: e.target.value }))}
              placeholder="Ex: Premium" disabled={createLoading} required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Description optionnelle" disabled={createLoading} rows={2}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Prix catalogue (Ar) <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" step="1" value={createForm.montant}
                onChange={(e) => setCreateForm(p => ({ ...p, montant: e.target.value }))}
                placeholder="Ex: 8000" disabled={createLoading} required
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50" />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tarif de référence — chaque collaborateur peut avoir un tarif différent.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Périodicité <span className="text-red-500">*</span>
              </label>
              <select value={createForm.periodicite} onChange={(e) => setCreateForm(p => ({ ...p, periodicite: e.target.value }))}
                disabled={createLoading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50">
                <option value="mensuel">Mensuel</option>
                <option value="trimestriel">Trimestriel</option>
                <option value="annuel">Annuel</option>
                <option value="ponctuel">Ponctuel</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Modale création souscription ──────────────────────────────────────── */}
      <Modal
        open={souscrireOpen}
        title="Nouvelle souscription"
        size="large"
        onClose={() => !souscrireLoading && setSouscrireOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setSouscrireOpen(false)} disabled={souscrireLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="submit" form="form-create-souscription" disabled={souscrireLoading}
              className="px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {souscrireLoading ? 'Création...' : 'Souscrire'}
            </button>
          </div>
        }
      >
        <form id="form-create-souscription" onSubmit={handleCreateSouscription} className="space-y-5">
          {/* Collaborateur */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Collaborateur <span className="text-red-500">*</span>
            </label>
            <TypeaheadSelect
              options={optionsCollabs}
              value={souscrireForm.id_collaborateur}
              onChange={(val) => setSouscrireForm(p => ({ ...p, id_collaborateur: val }))}
              placeholder="Rechercher un collaborateur…"
              disabled={souscrireLoading}
            />
          </div>

          {/* Offre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Offre <span className="text-red-500">*</span>
            </label>
            <TypeaheadSelect
              options={optionsOffresActives}
              value={souscrireForm.id_abonnement}
              onChange={handleOffreChange}
              placeholder="Rechercher une offre active…"
              disabled={souscrireLoading}
            />
            {optionsOffresActives.length === 0 && (
              <p className="mt-1 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Aucune offre active. Créez ou réactivez une offre d'abord.
              </p>
            )}
          </div>

          {/* Tarif applicable */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Tarif applicable (Ar) <span className="text-red-500">*</span>
            </label>
            <input
              type="number" min="1" step="1"
              value={souscrireForm.montant}
              onChange={(e) => setSouscrireForm(p => ({ ...p, montant: e.target.value }))}
              placeholder="Ex: 8000"
              disabled={souscrireLoading}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
            />
            {/* Note si le tarif diffère du catalogue */}
            {offreSelectionnee && souscrireForm.montant && parseFloat(souscrireForm.montant) !== offreSelectionnee.montant && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Tarif catalogue : {formatMontant(offreSelectionnee.montant)}. Ce collaborateur bénéficie d'un tarif personnalisé.
              </p>
            )}
            {offreSelectionnee && souscrireForm.montant && parseFloat(souscrireForm.montant) === offreSelectionnee.montant && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Correspond au prix catalogue. Modifiez si un tarif personnalisé s'applique.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date de début */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Date de début <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={souscrireForm.date_debut}
                onChange={(e) => setSouscrireForm(p => ({ ...p, date_debut: e.target.value }))}
                disabled={souscrireLoading}
                required
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>

            {/* Renouvellement auto */}
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={souscrireForm.renouvellement_auto}
                  onChange={(e) => setSouscrireForm(p => ({ ...p, renouvellement_auto: e.target.checked }))}
                  disabled={souscrireLoading}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Renouvellement automatique</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Génère automatiquement les prochaines échéances
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Rappel règle métier */}
          <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Le tarif applicable à ce collaborateur est indépendant du prix catalogue.
              Les futures modifications du catalogue n'affecteront pas cette souscription.
            </p>
          </div>
        </form>
      </Modal>

      {/* ── Modale confirmation ───────────────────────────────────────────────── */}
      <Modal
        open={confirm.open}
        title={confirm.title}
        onClose={() => !confirmLoading && setConfirm(CONFIRM_CLOSED)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setConfirm(CONFIRM_CLOSED)} disabled={confirmLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="button" onClick={runConfirm} disabled={confirmLoading}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                confirm.confirmVariant === 'danger'   ? 'bg-red-600 hover:bg-red-700'
                : confirm.confirmVariant === 'warning' ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-primary hover:bg-primary-strong'
              }`}>
              {confirmLoading ? 'En cours...' : confirm.confirmLabel}
            </button>
          </div>
        }
      >
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{confirm.message}</p>
      </Modal>

      {/* ── Drawer détail souscription ────────────────────────────────────────── */}
      <DrawerSouscription
        idSouscription={drawerSousId}
        open={drawerSousOpen}
        onClose={() => setDrawerSousOpen(false)}
        onMutated={() => { fetchSouscriptions(); fetchOffres(); fetchPaiements() }}
      />

      {/* ── Drawer détail offre ───────────────────────────────────────────────── */}
      <DrawerOffre
        idOffre={drawerOffreId}
        open={drawerOffreOpen}
        onClose={() => setDrawerOffreOpen(false)}
        onMutated={() => { fetchOffres(); fetchSouscriptions(); fetchPaiements() }}
        onSouscrire={(offre) => openSouscrire(offre)}
      />
    </>
  )
}

// ─── InlineActionsMenu ────────────────────────────────────────────────────────
// Menu déroulant autonome. Remplace getActions pour les colonnes dont
// ResponsiveDataTable ne détecte pas le field 'actions'.

interface ActionItem {
  label: string
  onClick: () => void
  variant?: string
}

function InlineActionsMenu({ actions }: { actions: ActionItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!actions.length) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev) }}
        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        title="Actions"
        aria-label="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-30 overflow-hidden">
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick() }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                a.variant === 'danger'
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  icon, title, description, action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-slate-400">{icon}</div>
      <p className="text-base font-medium text-slate-900 dark:text-white mb-1">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
