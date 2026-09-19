import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { fetchLivraisons, setLivraisonsParams } from '@/redux/livraisonsSlice'
import type { Collaborateur, PointDeVente } from '@/components/Stock/types'
import type { AnyRecord, LotsFiltersState, SortConfig } from './stockTypes'

export function useStockData() {
  const { showToast } = useToast()
  const dispatch = useAppDispatch()
  const livraisonsState = useAppSelector((state) => state.livraisons)

  // ─── Listes de référence ──────────────────────────────────────────────────
  const [loadingLists, setLoadingLists] = useState(false)
  const [collaborateurs, setCollaborateurs] = useState<AnyRecord[]>([])
  const [pointsDeVente, setPointsDeVente] = useState<AnyRecord[]>([])
  const [produitsCatalogue, setProduitsCatalogue] = useState<AnyRecord[]>([])
  const [unitesDeMesure, setUnitesDeMesure] = useState<AnyRecord[]>([])

  // ─── Lots disponibles ─────────────────────────────────────────────────────
  const [lotsDisponibles, setLotsDisponibles] = useState<AnyRecord[]>([])
  const [lotsPage, setLotsPage] = useState(1)
  const [lotsLimit, setLotsLimit] = useState(20)
  const [lotsTotal, setLotsTotal] = useState(0)
  const [lotsLoading, setLotsLoading] = useState(false)
  const [lotsSortConfig, setLotsSortConfig] = useState<SortConfig>({ field: '', direction: '' })
  const [showLotsAdvancedFilters, setShowLotsAdvancedFilters] = useState(false)

  const [lotsFilters, setLotsFilters] = useState<LotsFiltersState>({
    q: '',
    id_point_vente: [],
    id_collaborateur: [],
    qte_op: '',
    qte_value: '',
    showEpuise: false,
    date: null,
  })

  // ─── Catalogue consolidé ──────────────────────────────────────────────────
  const [catalogueStock, setCatalogueStock] = useState<AnyRecord[]>([])
  const [catalogueStockLoading, setCatalogueStockLoading] = useState(false)
  const [catalogueFilterCollab, setCatalogueFilterCollab] = useState('')
  const [catalogueSearch, setCatalogueSearch] = useState('')
  const [showCatalogueFilters, setShowCatalogueFilters] = useState(false)

  // ─── Livraisons ───────────────────────────────────────────────────────────
  const [livraisonsSortConfig, setLivraisonsSortConfig] = useState<SortConfig>({ field: '', direction: '' })
  const [livraisonsFilters] = useState({
    q: '',
    id_point_vente: '',
    id_collaborateur: '',
    date: null as AnyRecord | null,
  })

  // ─── Lookups mémoïsés ─────────────────────────────────────────────────────
  const collaborateursById = useMemo(() => {
    return Object.fromEntries(
      collaborateurs.map((c) => [String(c.id_collaborateur), c])
    ) as Record<string, Collaborateur>
  }, [collaborateurs])

  const pointsDeVenteById = useMemo(() => {
    return Object.fromEntries(
      pointsDeVente.map((p) => [String(p.id_pdv), p])
    ) as Record<string, PointDeVente>
  }, [pointsDeVente])

  const produitsCatalogueOptions = useMemo(() => {
    return produitsCatalogue.map((p) => ({
      value: String(p.id_produit),
      label: p.nom || `Produit #${p.id_produit}`,
      id_collaborateur: p.id_collaborateur,
    }))
  }, [produitsCatalogue])

  const produitCategories = useMemo(() => {
    return Array.from(
      new Set(
        produitsCatalogue
          .map((p) => String(p.categorie || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [produitsCatalogue])

  // ─── Chargements asynchrones ──────────────────────────────────────────────
  const refreshLists = useCallback(async () => {
    setLoadingLists(true)
    try {
      const [cRes, pvRes, pRes, uRes] = await Promise.all([
        api.get('/collaborateurs'),
        api.get('/points-de-vente'),
        api.get('/produits'),
        api.get('/unites-de-mesure'),
      ])
      setCollaborateurs(cRes.data?.data || cRes.data || [])
      setPointsDeVente(pvRes.data?.data || pvRes.data || [])
      setProduitsCatalogue(pRes.data?.data || pRes.data || [])
      setUnitesDeMesure((uRes.data?.data || []).filter((u: AnyRecord) => u.actif))
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur chargement des listes', 'info')
    } finally {
      setLoadingLists(false)
    }
  }, [showToast])

  const refreshStockTables = useCallback(async () => {
    setCatalogueStockLoading(true)
    try {
      const params: AnyRecord = {}
      if (catalogueFilterCollab) params.id_collaborateur = catalogueFilterCollab
      const { data: catalogueRes } = await api.get('/stock/catalogue', { params })
      setCatalogueStock(catalogueRes?.data || catalogueRes || [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur chargement du stock', 'info')
    } finally {
      setCatalogueStockLoading(false)
    }
  }, [catalogueFilterCollab, showToast])

  const fetchLots = useCallback(
    async ({ page, limit }: { page?: number; limit?: number } = {}) => {
      setLotsLoading(true)
      try {
        const params: AnyRecord = {
          page: page || lotsPage,
          limit: limit || lotsLimit,
          ...(lotsFilters.q && { q: lotsFilters.q }),
          ...(lotsFilters.id_point_vente.length && {
            id_point_vente: lotsFilters.id_point_vente.join(','),
          }),
          ...(lotsFilters.id_collaborateur.length && {
            id_collaborateur: lotsFilters.id_collaborateur.join(','),
          }),
          ...(lotsFilters.qte_op &&
            lotsFilters.qte_value && {
              qte_op: lotsFilters.qte_op,
              qte_value: lotsFilters.qte_value,
            }),
          ...(lotsFilters.showEpuise && { statut: 'tous' }),
          ...(lotsFilters.date?.dateMin && { dateMin: lotsFilters.date.dateMin }),
          ...(lotsFilters.date?.dateMax && { dateMax: lotsFilters.date.dateMax }),
          ...(lotsFilters.date?.target && { date_target: lotsFilters.date.target }),
        }
        const { data: res } = await api.get('/stock/lots', { params })
        setLotsDisponibles(res.data || [])
        setLotsPage(res.page || 1)
        setLotsLimit(res.limit || 20)
        setLotsTotal(res.total || 0)
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error || err?.message || 'Erreur chargement des lots', 'info')
      } finally {
        setLotsLoading(false)
      }
    },
    [lotsFilters, lotsPage, lotsLimit, showToast]
  )

  const fetchLivraisonsList = useCallback(
    async ({ page, limit }: { page?: number; limit?: number } = {}) => {
      const params: AnyRecord = {
        page: page || livraisonsState.page,
        limit: limit || livraisonsState.limit,
        ...(livraisonsFilters.q && { q: livraisonsFilters.q }),
        ...(livraisonsFilters.id_point_vente && {
          id_point_vente: livraisonsFilters.id_point_vente,
        }),
        ...(livraisonsFilters.id_collaborateur && {
          id_collaborateur: livraisonsFilters.id_collaborateur,
        }),
        ...(livraisonsFilters.date?.dateMin && { dateMin: livraisonsFilters.date.dateMin }),
        ...(livraisonsFilters.date?.dateMax && { dateMax: livraisonsFilters.date.dateMax }),
      }
      dispatch(setLivraisonsParams(params))
      dispatch(fetchLivraisons(params))
    },
    [dispatch, livraisonsFilters, livraisonsState.page, livraisonsState.limit]
  )

  // ─── Effets d'initialisation et synchronisation ───────────────────────────
  useEffect(() => {
    refreshLists()
    fetchLots()
    fetchLivraisonsList()
    refreshStockTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchLots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotsFilters, lotsPage, lotsLimit])

  useEffect(() => {
    refreshStockTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogueFilterCollab])

  // ─── Catalogue rows calculés ──────────────────────────────────────────────
  const catalogueRows = useMemo(() => {
    if (!Array.isArray(catalogueStock)) return []
    const search = catalogueSearch.trim().toLowerCase()
    return catalogueStock
      .filter((p) => {
        if (!search) return true
        return [p.libelle, p.nom, p.categorie, p.collaborateur_nom].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(search)
        )
      })
      .map((p) => ({
        id: p.id_produit,
        libelle: p.libelle || p.nom || 'Sans nom',
        categorie: p.categorie || 'Sans catégorie',
        quantite_en_stock: Number(p.quantite_en_stock ?? 0),
        seuil_alerte: p.seuil_alerte ?? null,
        statut: p.statut || 'actif',
        prix_vente_actuel: p.prix_vente_actuel ?? null,
        prix_achat_actuel: p.prix_achat_actuel ?? null,
        id_collaborateur: p.id_collaborateur,
        collaborateur_nom: p.collaborateur_nom || 'Collaborateur -',
        unite: p.unite || '',
      }))
  }, [catalogueStock, catalogueSearch])

  return {
    // Listes
    loadingLists,
    collaborateurs,
    pointsDeVente,
    produitsCatalogue,
    setProduitsCatalogue,
    unitesDeMesure,
    collaborateursById,
    pointsDeVenteById,
    produitsCatalogueOptions,
    produitCategories,
    refreshLists,

    // Lots
    lotsDisponibles,
    lotsPage,
    setLotsPage,
    lotsLimit,
    setLotsLimit,
    lotsTotal,
    lotsLoading,
    lotsSortConfig,
    setLotsSortConfig,
    showLotsAdvancedFilters,
    setShowLotsAdvancedFilters,
    lotsFilters,
    setLotsFilters,
    fetchLots,

    // Catalogue
    catalogueStock,
    catalogueStockLoading,
    catalogueFilterCollab,
    setCatalogueFilterCollab,
    catalogueSearch,
    setCatalogueSearch,
    showCatalogueFilters,
    setShowCatalogueFilters,
    catalogueRows,
    refreshStockTables,

    // Livraisons
    livraisonsState,
    livraisonsSortConfig,
    setLivraisonsSortConfig,
    fetchLivraisonsList,
  }
}
