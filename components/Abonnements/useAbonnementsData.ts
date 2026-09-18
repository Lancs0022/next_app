import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import {
  Offre,
  Souscription,
  SouscriptionEnriched,
  CollabGroupRow,
  SouscriptionDisplayRow,
  EcheanceItem,
  EcheanceChildRow,
  PaiementListe,
  CollaborateurOption,
  FiltresSouscription,
  DateFilterValue,
  AbonnementStatut,
} from './abonnementsTypes'
import { getSousPaiementStatut, collabGlobalPay } from './abonnementsUtils'

export function useAbonnementsData() {
  const { showToast } = useToast()

  // ── Données brutes ─────────────────────────────────────────────────────────
  const [offres, setOffres] = useState<Offre[]>([])
  const [offresLoading, setOffresLoading] = useState(false)

  const [souscriptions, setSouscriptions] = useState<Souscription[]>([])
  const [souscriptionsLoading, setSouscriptionsLoading] = useState(false)

  const [paiements, setPaiements] = useState<PaiementListe[]>([])
  const [paiementsLoading, setPaiementsLoading] = useState(false)

  const [collaborateurs, setCollaborateurs] = useState<CollaborateurOption[]>([])

  // ── Cache local des échéances (offline-first & pas de N+1) ─────────────────
  const [echeancesBySous, setEcheancesBySous] = useState<Record<number, EcheanceItem[]>>({})
  const [expandedEcheanceSousIds, setExpandedEcheanceSousIds] = useState<Record<number, boolean>>({})

  // ── Filtres & pagination offres ────────────────────────────────────────────
  const [offresSortConfig, setOffresSortConfig] = useState<{ field: string; direction: string }>({
    field: '',
    direction: 'asc',
  })
  const [offresPage, setOffresPage] = useState(1)
  const [offresPerPage, setOffresPerPage] = useState(25)

  // ── Filtres & pagination souscriptions ─────────────────────────────────────
  const [filtreActif, setFiltreActif] = useState<FiltresSouscription>('TOUTES')
  const [showSousFilters, setShowSousFilters] = useState(false)
  const [filtreCollabInput, setFiltreCollabInput] = useState('')
  const [filtreOffreInput, setFiltreOffreInput] = useState('')
  const [filtreDateDebut, setFiltreDateDebut] = useState<DateFilterValue | null>(null)

  const [sousSortConfig, setSousSortConfig] = useState<{ field: string; direction: string }>({
    field: '',
    direction: 'asc',
  })
  const [sousPage, setSousPage] = useState(1)
  const [sousPerPage, setSousPerPage] = useState(25)
  const [groupByCollab, setGroupByCollab] = useState(false)

  // ── Filtres paiements ──────────────────────────────────────────────────────
  const [filtrePaiements, setFiltrePaiements] = useState<'tous' | 'actifs' | 'annules'>('actifs')

  // ── Fetchers individuels ───────────────────────────────────────────────────
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

  const fetchEcheancesForSouscription = useCallback(
    async (id_souscription: number) => {
      if (echeancesBySous[id_souscription]) return
      try {
        const { data: res } = await api.get(`/souscriptions-abonnements/${id_souscription}`)
        if (res?.data?.echeances) {
          const mapped: EcheanceItem[] = res.data.echeances.map((ech: any) => ({
            id_echeance_abonnement: ech.id_echeance_abonnement,
            periode_debut: ech.periode_debut,
            periode_fin: ech.periode_fin,
            montant: ech.montant,
            statut: ech.statut,
            montant_paye: ech.montant_paye ?? (ech.paiements?.[0]?.montant ? ech.paiements.reduce((acc: number, p: any) => acc + (p.montant || 0), 0) : null),
            reste: ech.reste ?? 0,
            date_paiement: ech.paiements?.[0]?.date_paiement ?? null,
            _type: 'ech' as const,
            id_souscription,
          }))
          setEcheancesBySous((prev) => ({
            ...prev,
            [id_souscription]: mapped,
          }))
        }
      } catch {
        // silencieux pour offline / non-bloquant
      }
    },
    [echeancesBySous]
  )

  const toggleShowAllEcheances = useCallback((id_souscription: number) => {
    setExpandedEcheanceSousIds((prev) => ({
      ...prev,
      [id_souscription]: !prev[id_souscription],
    }))
  }, [])

  // ── Initialisation en parallèle (async-parallel de vercel-react-best-practices)
  useEffect(() => {
    // Parallélisation complète des chargements initiaux
    Promise.all([
      fetchOffres(),
      fetchSouscriptions(),
      fetchPaiements(),
      api
        .get('/collaborateurs')
        .then(({ data: res }) => setCollaborateurs(res?.data ?? []))
        .catch(() => {
          /* référence offline-first tolérante */
        }),
    ])
  }, [fetchOffres, fetchSouscriptions, fetchPaiements])

  // ── Rafraîchissement global après mutation ──────────────────────────────────
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchOffres(), fetchSouscriptions(), fetchPaiements()])
  }, [fetchOffres, fetchSouscriptions, fetchPaiements])

  // ── Actions statut / suppression ───────────────────────────────────────────
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

  const deleteOffre = useCallback(
    async (id: number) => {
      try {
        await api.delete(`/abonnements/${id}`)
        showToast('Offre supprimée', 'success')
        await fetchOffres()
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error ?? err?.message ?? 'Erreur suppression', 'error')
      }
    },
    [fetchOffres, showToast]
  )

  // ── Dérivation données Offres triées & paginées ─────────────────────────────
  const { paginatedOffres, totalOffresCount } = useMemo(() => {
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
    const start = (offresPage - 1) * offresPerPage
    return {
      paginatedOffres: d.slice(start, start + offresPerPage),
      totalOffresCount: d.length,
    }
  }, [offres, offresSortConfig, offresPage, offresPerPage])

  // ── Dérivation arborescence Souscriptions (sans useEffect) ──────────────────
  const { souscriptionsDisplayData, totalSouscriptionsCount } = useMemo(() => {
    // 1. Filtrage statut
    let filtered = souscriptions.filter((s) => {
      if (filtreActif === 'TOUTES') return true
      if (filtreActif === 'IMPAYEES') {
        return (
          s.prochaine_echeance !== null &&
          ['en_attente', 'partiellement_payee', 'impayee'].includes(s.prochaine_echeance.statut)
        )
      }
      return s.statut === filtreActif
    })

    // 2. Filtres textuels & date
    if (filtreCollabInput) {
      const q = filtreCollabInput.toLowerCase()
      filtered = filtered.filter((s) => s.collaborateur_nom.toLowerCase().includes(q))
    }
    if (filtreOffreInput) {
      const q = filtreOffreInput.toLowerCase()
      filtered = filtered.filter((s) => s.abonnement_nom.toLowerCase().includes(q))
    }
    if (filtreDateDebut?.dateMin) {
      const min = new Date(filtreDateDebut.dateMin)
      filtered = filtered.filter((s) => new Date(s.date_debut) >= min)
    }
    if (filtreDateDebut?.dateMax) {
      const max = new Date(filtreDateDebut.dateMax)
      filtered = filtered.filter((s) => new Date(s.date_debut) <= max)
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

    // 4. Enrichisseur de souscription avec entête et limitation à 5 échéances
    const enrichSous = (s: Souscription): SouscriptionEnriched => {
      const cachedEchs = echeancesBySous[s.id_souscription_abonnement]
      let echChildren: EcheanceChildRow[] = []

      if (cachedEchs && cachedEchs.length > 0) {
        const isExpanded = !!expandedEcheanceSousIds[s.id_souscription_abonnement]
        const headerRow: EcheanceChildRow = {
          id: `ech_hdr_${s.id_souscription_abonnement}`,
          _type: 'ech_header',
          id_souscription: s.id_souscription_abonnement,
        }

        const visibleEchs = isExpanded ? cachedEchs : cachedEchs.slice(0, 5)

        echChildren = [headerRow, ...visibleEchs]

        if (cachedEchs.length > 5) {
          echChildren.push({
            id: `ech_ftr_${s.id_souscription_abonnement}`,
            _type: 'ech_footer',
            id_souscription: s.id_souscription_abonnement,
            remainingCount: cachedEchs.length - 5,
            expanded: isExpanded,
          })
        }
      } else if (s.prochaine_echeance) {
        const paye =
          s.prochaine_echeance.montant_paye ??
          (s.prochaine_echeance.montant_du - (s.prochaine_echeance.reste ?? 0))
        echChildren = [
          {
            id: `ech_hdr_${s.id_souscription_abonnement}`,
            _type: 'ech_header',
            id_souscription: s.id_souscription_abonnement,
          },
          {
            id_echeance_abonnement: s.prochaine_echeance.id,
            periode_debut: s.prochaine_echeance.periode_debut,
            periode_fin: s.prochaine_echeance.periode_fin,
            montant: s.prochaine_echeance.montant_du,
            montant_paye: paye,
            statut: s.prochaine_echeance.statut,
            reste: s.prochaine_echeance.reste,
            date_paiement: null,
            _type: 'ech',
            id_souscription: s.id_souscription_abonnement,
          },
        ]
      }

      return {
        ...s,
        id: `sous_${s.id_souscription_abonnement}`,
        _type: 'sous',
        paiementStatut: getSousPaiementStatut(s),
        children: echChildren,
      }
    }

    if (!groupByCollab) {
      const startIdx = (sousPage - 1) * sousPerPage
      const paginated = filtered.slice(startIdx, startIdx + sousPerPage)
      return {
        souscriptionsDisplayData: paginated.map(enrichSous),
        totalSouscriptionsCount: filtered.length,
      }
    }

    // Mode agrégé par collaborateur (Map O(1) pour js-index-maps)
    const collabMap = new Map<
      number,
      {
        id_collaborateur: number
        collaborateur_nom: string
        subs: Souscription[]
      }
    >()

    for (const s of filtered) {
      const existing = collabMap.get(s.id_collaborateur)
      if (!existing) {
        collabMap.set(s.id_collaborateur, {
          id_collaborateur: s.id_collaborateur,
          collaborateur_nom: s.collaborateur_nom,
          subs: [s],
        })
      } else {
        existing.subs.push(s)
      }
    }

    const collabs = Array.from(collabMap.values()).sort((a, b) =>
      a.collaborateur_nom.localeCompare(b.collaborateur_nom, 'fr')
    )

    const startIdx = (sousPage - 1) * sousPerPage
    const slicedCollabs = collabs.slice(startIdx, startIdx + sousPerPage)

    const displayData: CollabGroupRow[] = slicedCollabs.map((c) => {
      const subsEnriched = c.subs.map(enrichSous)
      const nbImpayees = c.subs.filter(
        (s) =>
          s.prochaine_echeance &&
          ['en_attente', 'partiellement_payee', 'impayee'].includes(s.prochaine_echeance.statut)
      ).length

      return {
        _type: 'collab',
        id: `collab_${c.id_collaborateur}`,
        id_collaborateur: c.id_collaborateur,
        collaborateur_nom: c.collaborateur_nom,
        nb_souscriptions: c.subs.length,
        nb_impayees: nbImpayees,
        globalPayStatut: collabGlobalPay(c.subs),
        children: subsEnriched,
      }
    })

    return {
      souscriptionsDisplayData: displayData,
      totalSouscriptionsCount: collabs.length,
    }
  }, [
    souscriptions,
    filtreActif,
    filtreCollabInput,
    filtreOffreInput,
    filtreDateDebut,
    sousSortConfig,
    echeancesBySous,
    expandedEcheanceSousIds,
    groupByCollab,
    sousPage,
    sousPerPage,
  ])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => [
      {
        label: 'Offres actives',
        value: offres.filter((o) => o.statut === 'ACTIVE').length,
        color: 'bg-green-500',
      },
      {
        label: 'Offres inactives',
        value: offres.filter((o) => o.statut === 'INACTIVE').length,
        color: 'bg-orange-500',
      },
      {
        label: 'Souscriptions',
        value: souscriptions.filter((s) => s.statut === 'ACTIVE').length,
        color: 'bg-primary',
      },
      {
        label: 'Échéances impayées',
        value: souscriptions.filter(
          (s) =>
            s.prochaine_echeance &&
            ['en_attente', 'partiellement_payee', 'impayee'].includes(s.prochaine_echeance.statut)
        ).length,
        color: 'bg-red-500',
      },
    ],
    [offres, souscriptions]
  )

  return {
    // Offres
    offres,
    offresLoading,
    paginatedOffres,
    totalOffresCount,
    offresPage,
    setOffresPage,
    offresPerPage,
    setOffresPerPage,
    offresSortConfig,
    setOffresSortConfig,
    patchStatut,
    deleteOffre,
    fetchOffres,

    // Souscriptions
    souscriptions,
    souscriptionsLoading,
    souscriptionsDisplayData,
    totalSouscriptionsCount,
    sousPage,
    setSousPage,
    sousPerPage,
    setSousPerPage,
    sousSortConfig,
    setSousSortConfig,
    filtreActif,
    setFiltreActif,
    showSousFilters,
    setShowSousFilters,
    filtreCollabInput,
    setFiltreCollabInput,
    filtreOffreInput,
    setFiltreOffreInput,
    filtreDateDebut,
    setFiltreDateDebut,
    groupByCollab,
    setGroupByCollab,
    fetchSouscriptions,
    fetchEcheancesForSouscription,
    toggleShowAllEcheances,

    // Paiements
    paiements,
    paiementsLoading,
    filtrePaiements,
    setFiltrePaiements,
    fetchPaiements,

    // Collaborateurs
    collaborateurs,

    // Global
    stats,
    refreshAll,
  }
}
