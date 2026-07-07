'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import TabBox from '@/components/TabBox/TabBox'
import MultiSelectTags from '@/components/MultiSelectTags'
import Drawer from '@/components/Drawer/Drawer'
import Modal from '@/components/Modal/Modal'
import StockAdjustModal from '@/components/Stock/StockAdjustModal'
import { useToast } from '@/components/Toast/ToastContainer'
import DateRangeFilter from '@/components/DateRangeFilter'
import TypeaheadSelect from '@/components/TypeaheadSelect'
import AddLivraisonDrawer from '@/components/Stock/AddLivraisonDrawer'
import AddCatalogueDrawer from '@/components/Stock/AddCatalogueDrawer'
import QuickAddProduitModal from '@/components/Stock/QuickAddProduitModal'
import { LotExplorer } from '@/components/Stock/LotExplorer'
import type { ActionMenuId } from '@/components/Stock/ActionMenu'
import type { Collaborateur, LotActif, PointDeVente, ProduitCatalogue } from '@/components/Stock/types'
import api from '@/services/api'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { fetchLivraisons, setLivraisonsParams } from '@/redux/livraisonsSlice'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export default function StockPage() {
  const { showToast } = useToast()
  const dispatch = useAppDispatch()
  const livraisonsState = useAppSelector(state => state.livraisons)

  const [, setLoadingLists] = useState(false)
  const [collaborateurs, setCollaborateurs] = useState<AnyRecord[]>([])
  const [pointsDeVente, setPointsDeVente] = useState<AnyRecord[]>([])
  const [produitsCatalogue, setProduitsCatalogue] = useState<AnyRecord[]>([])

  const [lotsDisponibles, setLotsDisponibles] = useState<AnyRecord[]>([])
  const [lotsPage, setLotsPage] = useState(1)
  const [lotsLimit, setLotsLimit] = useState(20)
  const [lotsTotal, setLotsTotal] = useState(0)
  const [lotsLoading, setLotsLoading] = useState(false)
  const [lotsSortConfig, setLotsSortConfig] = useState({ field: '', direction: '' })
  const [livraisonsSortConfig, setLivraisonsSortConfig] = useState({ field: '', direction: '' })
  const [showLotsAdvancedFilters, setShowLotsAdvancedFilters] = useState(false)

  const [lotsFilters, setLotsFilters] = useState({
    q: '',
    id_point_vente: [] as string[],
    id_collaborateur: [] as string[],
    qte_op: '',
    qte_value: '',
    date: null as AnyRecord | null
  })

  const [catalogueStock, setCatalogueStock] = useState<AnyRecord[]>([])
  const [catalogueStockLoading, setCatalogueStockLoading] = useState(false)
  const [catalogueExplorerProduit, setCatalogueExplorerProduit] = useState<ProduitCatalogue | null>(null)
  const [catalogueExplorerLots, setCatalogueExplorerLots] = useState<LotActif[]>([])
  const [catalogueExplorerLoading, setCatalogueExplorerLoading] = useState(false)

  const [livraisonsFilters] = useState({
    q: '',
    id_point_vente: '',
    id_collaborateur: '',
    date: null as AnyRecord | null
  })

  const [catalogueFilterCollab, setCatalogueFilterCollab] = useState('')
  const [catalogueSearch, setCatalogueSearch] = useState('')
  const [showCatalogueFilters, setShowCatalogueFilters] = useState(false)
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [catalogueDraft, setCatalogueDraft] = useState<AnyRecord | null>(null)

  const [livraisonOpen, setLivraisonOpen] = useState(false)

  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddInitialCollab, setQuickAddInitialCollab] = useState('')
  const [quickAddLoading, setQuickAddLoading] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailType, setDetailType] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<AnyRecord | null>(null)
  const [editSeuilOpen, setEditSeuilOpen] = useState(false)
  const [editSeuilLoading, setEditSeuilLoading] = useState(false)
  const [editSeuilProduit, setEditSeuilProduit] = useState<AnyRecord | null>(null)
  const [editSeuilValue, setEditSeuilValue] = useState('')

  const [ajustOpen, setAjustOpen] = useState(false)
  const [ajustLoading, setAjustLoading] = useState(false)
  const [ajustLot, setAjustLot] = useState<AnyRecord | null>(null)

  const [pagination, setPagination] = useState({ page: 1, perPage: 20 })
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: string }>({ key: null, direction: 'asc' })
  const [filters, setFiltersState] = useState<AnyRecord>({})

  const produitsCatalogueOptions = useMemo(() => {
    return produitsCatalogue.map(p => ({
      value: String(p.id_produit),
      label: p.nom || `Produit #${p.id_produit}`,
      id_collaborateur: p.id_collaborateur,
    }))
  }, [produitsCatalogue])

  const produitCategories = useMemo(() => {
    return Array.from(
      new Set(
        produitsCatalogue
          .map(p => String(p.categorie || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [produitsCatalogue])

  const hasLotsAdvancedFilters = Boolean(
    lotsFilters.id_point_vente.length > 0 ||
    lotsFilters.id_collaborateur.length > 0 ||
    lotsFilters.qte_op ||
    lotsFilters.qte_value ||
    lotsFilters.date
  )

  const openDetail = (type: string, row: AnyRecord) => {
    setDetailType(type)
    setDetailData(row)
    setDetailOpen(true)
  }

  const openMouvements = async (lot: AnyRecord) => {
    if (!lot?.id_lot) return
    setDetailType('mouvements')
    setDetailData({ lot, loading: true, mouvements: [] })
    setDetailOpen(true)
    try {
      const { data: res } = await api.get('/stock/mouvements', { params: { id_lot: lot.id_lot, limit: 200 } })
      setDetailData({ lot, loading: false, mouvements: res.data || [] })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setDetailData({ lot, loading: false, mouvements: [], error: err?.response?.data?.error || err?.message || 'Erreur chargement mouvements' })
    }
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailType(null)
    setDetailData(null)
  }

  const openAjustement = (lot: AnyRecord) => {
    setAjustLot(lot)
    setAjustOpen(true)
  }

  const collaborateursById = useMemo(() => {
    return Object.fromEntries(collaborateurs.map(c => [String(c.id_collaborateur), c])) as Record<string, Collaborateur>
  }, [collaborateurs])

  const pointsDeVenteById = useMemo(() => {
    return Object.fromEntries(pointsDeVente.map(p => [String(p.id_pdv), p])) as Record<string, PointDeVente>
  }, [pointsDeVente])

  const toProduitCatalogue = useCallback((row: AnyRecord): ProduitCatalogue => {
    const source = produitsCatalogue.find(p => Number(p.id_produit) === Number(row.id || row.id_produit)) || row
    return {
      id_produit: Number(source.id_produit ?? row.id),
      tenant_id: Number(source.tenant_id ?? 0),
      id_collaborateur: Number(source.id_collaborateur ?? row.id_collaborateur ?? 0),
      nom: String(source.nom ?? source.libelle ?? row.libelle ?? 'Sans nom'),
      description: source.description ?? null,
      categorie: source.categorie ?? row.categorie ?? null,
      sku: source.sku ?? null,
      unite: source.unite ?? row.unite ?? null,
      seuil_alerte: source.seuil_alerte ?? row.seuil_alerte ?? null,
      image_url: source.image_url ?? null,
      statut: source.statut ?? row.statut ?? 'actif',
      created_by: source.created_by ?? undefined,
      modified_by: source.modified_by ?? undefined,
      created_at: source.created_at ?? new Date().toISOString(),
      updated_at: source.updated_at ?? new Date().toISOString(),
      modified_at: source.modified_at ?? undefined,
      deleted_at: source.deleted_at ?? undefined,
      lotsActifs: Number(row.lots_actifs ?? row.lotsActifs ?? 0),
      stockTotal: Number(row.quantite_en_stock ?? row.stockTotal ?? 0),
      chiffreAffaires: Number(row.chiffre_affaires ?? row.chiffreAffaires ?? 0),
    }
  }, [produitsCatalogue])

  const toLotActif = useCallback((row: AnyRecord, produit: ProduitCatalogue): LotActif => {
    return {
      id: String(row.id_lot),
      produitId: String(row.id_produit),
      livraisonId: String(row.id_livraison),
      livraisonItemId: String(row.id_lot),
      pdvId: String(row.id_point_vente ?? row.id_pdv),
      dateArrivee: String(row.date_livraison ?? row.date_creation ?? new Date().toISOString()),
      prixInitial: Number(row.prix_initial ?? 0),
      marge: Number(row.marge ?? 0),
      quantiteActuelle: Number(row.quantite_disponible ?? 0),
      quantiteInitiale: Number(row.quantite_initiale ?? 0),
      quantiteVendue: Number(row.quantite_vendue ?? 0),
      ventesFermees: Number(row.ventes_fermees ?? 0),
      createdAt: String(row.date_creation ?? row.created_at ?? new Date().toISOString()),
      createdBy: String(row.created_by_nom ?? row.created_by ?? 'N/A'),
      produitNom: produit.nom,
      produitDescription: row.description_produit ?? produit.description ?? null,
      produitCategorie: row.categorie_produit ?? produit.categorie ?? null,
      produitCreatedAt: row.produit_created_at ?? produit.created_at,
      produitCreatedBy: row.produit_created_by != null ? String(row.produit_created_by) : produit.created_by?.toString() ?? null,
      produitCreateurNom: row.produit_createur_nom ?? null,
      collaborateurId: row.id_collaborateur != null ? String(row.id_collaborateur) : String(produit.id_collaborateur),
      collaborateurNom: row.collaborateur_nom ?? null,
      pdvNom: row.point_vente_nom ?? null,
      pdvVille: row.point_vente_ville ?? null,
      chiffreAffaires: Number(row.chiffre_affaires ?? row.chiffreAffaires ?? 0),
      benefice: Number(row.benefice ?? 0),
    }
  }, [])

  const openCatalogueExplorer = useCallback(async (row: AnyRecord) => {
    const produit = toProduitCatalogue(row)
    setCatalogueExplorerProduit(produit)
    setCatalogueExplorerLots([])
    setCatalogueExplorerLoading(true)
    try {
      const { data: res } = await api.get('/stock/lots', {
        params: { id_produit: produit.id_produit, limit: 200 },
      })
      const rows = res?.data || []
      setCatalogueExplorerLots(rows.map((lot: AnyRecord) => toLotActif(lot, produit)))
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur chargement des lots du produit', 'info')
      setCatalogueExplorerProduit(null)
    } finally {
      setCatalogueExplorerLoading(false)
    }
  }, [showToast, toLotActif, toProduitCatalogue])

  const openEditSeuil = (produit: AnyRecord) => {
    setEditSeuilProduit(produit)
    setEditSeuilValue(produit?.seuil_alerte != null ? String(produit.seuil_alerte) : '')
    setEditSeuilOpen(true)
  }

  const handleSaveSeuil = async () => {
    if (!editSeuilProduit?.id) return
    setEditSeuilLoading(true)
    try {
      await api.patch(`/produits/${editSeuilProduit.id}`, {
        seuil_alerte: editSeuilValue === '' ? null : Number(editSeuilValue)
      })
      showToast('Seuil mis à jour', 'success')
      setEditSeuilOpen(false)
      setEditSeuilProduit(null)
      setEditSeuilValue('')
      await Promise.all([refreshLists(), refreshStockTables()])
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur lors de la mise à jour du seuil', 'error')
    } finally {
      setEditSeuilLoading(false)
    }
  }

  const handleSubmitAjustement = async (form: AnyRecord) => {
    if (!ajustLot) return
    setAjustLoading(true)
    try {
      await api.post('/stock/ajustements', {
        id_lot: ajustLot.id_lot,
        type: form.type,
        delta: form.delta,
        motif: form.motif || null,
        date_ajustement: form.date_ajustement || null
      })
      showToast('Ajustement de stock enregistré', 'success')
      setAjustOpen(false)
      setAjustLot(null)
      await fetchLots({ page: 1 })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || "Erreur lors de l'ajustement de stock", 'error')
    } finally {
      setAjustLoading(false)
    }
  }

  const handleQuickAddProduit = async (form: AnyRecord) => {
    if (!form.id_collaborateur) {
      showToast('Sélectionne un collaborateur pour le produit', 'info')
      return
    }
    if (!form.nom.trim()) {
      showToast('Le nom du produit est requis', 'info')
      return
    }
    setQuickAddLoading(true)
    try {
      const payload = {
        id_collaborateur: Number(form.id_collaborateur),
        nom: form.nom.trim(),
        categorie: form.categorie.trim() || null,
        unite: form.unite_mesure?.trim() || form.unite?.trim() || null,
        seuil_alerte: form.seuil_alerte ? Number(form.seuil_alerte) : null,
        description: null,
      }
      const { data: created } = await api.post('/produits', payload)
      const createdProduit = {
        id_produit: created.id_produit,
        id_collaborateur: created.id_collaborateur,
        nom: created.nom,
        description: created.description,
        categorie: created.categorie,
        unite: created.unite,
        statut: created.statut,
        date_creation: created.date_creation,
        date_update: created.date_update
      }
      setProduitsCatalogue(prev => [createdProduit, ...prev])
      showToast('Produit catalogue créé', 'success')
      setQuickAddOpen(false)
    } catch {
      showToast("Erreur lors de la création du produit", 'error')
    } finally {
      setQuickAddLoading(false)
    }
  }

  const refreshLists = async () => {
    setLoadingLists(true)
    try {
      const [cRes, pvRes, pRes] = await Promise.all([
        api.get('/collaborateurs'),
        api.get('/points-de-vente'),
        api.get('/produits')
      ])
      setCollaborateurs(cRes.data?.data || cRes.data || [])
      setPointsDeVente(pvRes.data?.data || pvRes.data || [])
      setProduitsCatalogue(pRes.data?.data || pRes.data || [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur chargement des listes', 'info')
    } finally {
      setLoadingLists(false)
    }
  }

  const refreshStockTables = async () => {
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
  }

  const catalogueRows = useMemo(() => {
    if (!Array.isArray(catalogueStock)) return []
    const search = catalogueSearch.trim().toLowerCase()
    return catalogueStock
      .filter((p) => {
        if (!search) return true
        return [p.libelle, p.nom, p.categorie, p.collaborateur_nom]
          .some((value) => String(value ?? '').toLowerCase().includes(search))
      })
      .map(p => ({
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
        unite: p.unite || ''
      }))
  }, [catalogueStock, catalogueSearch])

  const catalogueColumns = [
    {
      field: 'libelle', headerName: 'Produit', width: '220px', minWidth: '180px', sortable: true, filterable: true,
      renderCell: (row: AnyRecord) => (
        <div className="flex flex-col gap-1">
          <div className="font-medium text-slate-900 dark:text-white truncate" title={row.libelle || 'Sans nom'}>
            {row.libelle || 'Sans nom'}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.collaborateur_nom || 'Collaborateur -'}</span>
        </div>
      )
    },
    { field: 'categorie', headerName: 'Catégorie', width: '130px', minWidth: '100px', sortable: true, filterable: true },
    {
      field: 'stock_seuil', headerName: 'Stock / Seuil', width: '140px', minWidth: '120px', sortable: true,
      renderCell: (row: AnyRecord) => {
        const qty = row.quantite_en_stock || 0
        const seuil = row.seuil_alerte
        const isAlert = seuil != null && qty <= Number(seuil)
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            <div className={`font-medium ${isAlert ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
              {qty.toLocaleString('fr-FR')}{row.unite ? ` ${row.unite}` : ''}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              Seuil: {seuil != null ? Number(seuil).toLocaleString('fr-FR') : '-'}
            </div>
          </div>
        )
      }
    },
    {
      field: 'actions', headerName: 'Actions', width: '80px', minWidth: '70px',
      getActions: (row: AnyRecord) => [
        { label: 'Voir les lots', onClick: () => openCatalogueExplorer(row) },
        { label: 'Voir détails', onClick: () => openDetail('catalogue', row) },
        { label: 'Modifier le seuil', onClick: () => openEditSeuil(row) }
      ]
    }
  ]

  const handleCreateProduitCatalogue = async (form: AnyRecord) => {
    if (!form.id_collaborateur) { showToast('Sélectionne un collaborateur', 'info'); return }
    if (!form.nom?.trim() && !form.libelle?.trim()) { showToast('Le nom du produit est requis', 'info'); return }
    setCatalogueLoading(true)
    try {
      await api.post('/produits', {
        id_collaborateur: Number(form.id_collaborateur),
        nom: (form.nom || form.libelle || '').trim(),
        categorie: form.categorie?.trim() || null,
        description: form.description?.trim() || null,
        unite: form.unite?.trim() || null,
        seuil_alerte: form.seuil_alerte != null && form.seuil_alerte !== '' ? Number(form.seuil_alerte) : null
      })
      showToast('Produit ajouté au catalogue', 'success')
      setCatalogueOpen(false)
      await refreshLists()
      await refreshStockTables()
    } catch (e2: unknown) {
      const err = e2 as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur création produit', 'info')
    } finally {
      setCatalogueLoading(false)
    }
  }

  const handleCloseCatalogueDrawer = (draft?: AnyRecord) => {
    setCatalogueOpen(false)
    if (draft) setCatalogueDraft(draft)
  }

  const handleCloseLivraisonDrawer = () => {
    setLivraisonOpen(false)
  }

  const handleLivraisonSyncSuccess = async () => {
    showToast('Livraison synchronisée', 'success')
    await refreshLists()
    await fetchLots({ page: 1 })
    fetchLivraisonsList({ page: 1 })
  }

  const handleQuickAddClick = () => {
    setQuickAddInitialCollab('')
    setQuickAddOpen(true)
  }

  const fetchLots = useCallback(async ({ page, limit }: { page?: number; limit?: number } = {}) => {
    setLotsLoading(true)
    try {
      const params: AnyRecord = {
        page: page || lotsPage,
        limit: limit || lotsLimit,
        ...(lotsFilters.q && { q: lotsFilters.q }),
        ...(lotsFilters.id_point_vente.length && { id_point_vente: lotsFilters.id_point_vente.join(',') }),
        ...(lotsFilters.id_collaborateur.length && { id_collaborateur: lotsFilters.id_collaborateur.join(',') }),
        ...(lotsFilters.qte_op && lotsFilters.qte_value && { qte_op: lotsFilters.qte_op, qte_value: lotsFilters.qte_value }),
        ...(lotsFilters.date?.dateMin && { dateMin: lotsFilters.date.dateMin }),
        ...(lotsFilters.date?.dateMax && { dateMax: lotsFilters.date.dateMax }),
        ...(lotsFilters.date?.target && { date_target: lotsFilters.date.target })
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
  }, [lotsFilters, lotsPage, lotsLimit, showToast])

  const handleCatalogueLotAction = useCallback(async (actionId: ActionMenuId, lot: LotActif) => {
    if (actionId === 'vendre') {
      window.location.href = `/ventes?from_lot=${encodeURIComponent(lot.id)}&from_pv=${encodeURIComponent(lot.pdvId)}`
      return
    }
    if (actionId === 'ajuster') {
      openAjustement({
        id_lot: lot.id,
        id_point_vente: lot.pdvId,
        libelle_produit: lot.produitNom,
        point_vente_nom: lot.pdvNom,
        quantite_disponible: lot.quantiteActuelle,
        quantite_initiale: lot.quantiteInitiale,
      })
      return
    }
    if (actionId === 'transfert') {
      const destination = window.prompt(
        `ID du point de vente destination pour le lot #${lot.id}\nPV actuel: ${lot.pdvNom || lot.pdvId}\n\nPV disponibles: ${pointsDeVente.map(p => `${p.id_pdv}=${p.nom}`).join(', ')}`
      )
      if (!destination) return
      const quantite = window.prompt(`Quantité à transférer (stock actuel: ${lot.quantiteActuelle})`, String(lot.quantiteActuelle))
      if (!quantite) return
      const commentaire = window.prompt('Commentaire de transfert (optionnel)', '') || null
      try {
        await api.post('/stock/transferts', {
          id_lot: Number(lot.id),
          id_point_vente_source: Number(lot.pdvId),
          id_point_vente_destination: Number(destination),
          quantite,
          commentaire,
        })
        showToast('Transfert de stock enregistré', 'success')
        await Promise.all([fetchLots({ page: 1 }), refreshStockTables()])
        if (catalogueExplorerProduit) await openCatalogueExplorer(catalogueExplorerProduit)
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error || err?.message || 'Erreur transfert de stock', 'error')
      }
      return
    }
    if (actionId === 'prix') {
      const prixInitial = window.prompt('Nouveau prix initial', String(lot.prixInitial))
      if (prixInitial == null) return
      const marge = window.prompt('Nouvelle marge', String(lot.marge))
      if (marge == null) return
      try {
        await api.patch(`/stock/lots/${lot.id}/prix`, {
          prix_initial: prixInitial,
          marge,
        })
        showToast('Prix et marge du lot mis à jour', 'success')
        await Promise.all([fetchLots({ page: 1 }), refreshStockTables()])
        if (catalogueExplorerProduit) await openCatalogueExplorer(catalogueExplorerProduit)
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error || err?.message || 'Erreur mise à jour prix/marge', 'error')
      }
    }
  }, [catalogueExplorerProduit, fetchLots, openCatalogueExplorer, pointsDeVente, refreshStockTables, showToast])

  const fetchLivraisonsList = useCallback(async ({ page, limit }: { page?: number; limit?: number } = {}) => {
    const params: AnyRecord = {
      page: page || livraisonsState.page,
      limit: limit || livraisonsState.limit,
      ...(livraisonsFilters.q && { q: livraisonsFilters.q }),
      ...(livraisonsFilters.id_point_vente && { id_point_vente: livraisonsFilters.id_point_vente }),
      ...(livraisonsFilters.id_collaborateur && { id_collaborateur: livraisonsFilters.id_collaborateur }),
      ...(livraisonsFilters.date?.dateMin && { dateMin: livraisonsFilters.date.dateMin }),
      ...(livraisonsFilters.date?.dateMax && { dateMax: livraisonsFilters.date.dateMax })
    }
    dispatch(setLivraisonsParams(params))
    dispatch(fetchLivraisons(params))
  }, [dispatch, livraisonsFilters, livraisonsState.page, livraisonsState.limit])

  useEffect(() => {
    refreshLists()
    fetchLots()
    fetchLivraisonsList()
    refreshStockTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    refreshStockTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogueFilterCollab])

  const lotsColumns = [
    {
      field: 'produit', headerName: 'Produit', width: '220px', minWidth: '180px', sortable: true,
      renderCell: (row: AnyRecord) => (
        <div className="flex flex-col gap-1">
          <div className="font-medium text-slate-900 dark:text-white truncate" title={row.libelle_produit || 'Sans nom'}>
            {row.libelle_produit || 'Sans nom'}
          </div>
          {row.categorie_produit && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary dark:bg-primary/15 w-fit">
              {row.categorie_produit}
            </span>
          )}
        </div>
      )
    },
    {
      field: 'lot_localisation', headerName: 'Lot / Localisation', width: '240px', minWidth: '200px',
      renderCell: (row: AnyRecord) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <div className="text-slate-700 dark:text-slate-300">{row.id_livraison ? `Livraison n°${row.id_livraison}` : 'Livraison -'}</div>
          <div className="text-slate-600 dark:text-slate-400">Lot #{row.id_lot}</div>
          <div className="text-slate-600 dark:text-slate-400">{row.collaborateur_nom || 'Collaborateur -'} · {row.point_vente_nom || `PV #${row.id_point_vente}`}</div>
        </div>
      )
    },
    {
      field: 'qte_prix', headerName: 'Qté / Prix', width: '160px', minWidth: '140px', sortable: true,
      renderCell: (row: AnyRecord) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <div className="font-medium text-slate-900 dark:text-white">{row.quantite_disponible || 0} / {row.quantite_initiale || 0}</div>
          <div className="text-slate-600 dark:text-slate-400">Prix: {row.prix_initial ? `${Number(row.prix_initial).toLocaleString('fr-FR')} Ar` : '-'}</div>
          <div className="text-slate-600 dark:text-slate-400">Marge: {row.marge ? `${Number(row.marge).toLocaleString('fr-FR')} Ar` : '-'}</div>
        </div>
      )
    },
    {
      field: 'dates', headerName: 'Dates', width: '180px', minWidth: '160px', sortable: true,
      renderCell: (row: AnyRecord) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <div className="text-slate-700 dark:text-slate-300"><span className="font-medium">Arrivé:</span> {row.date_livraison ? new Date(row.date_livraison).toLocaleDateString('fr-FR') : '-'}</div>
          <div className="text-slate-600 dark:text-slate-400"><span className="font-medium">Créé:</span> {row.date_creation ? new Date(row.date_creation).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</div>
        </div>
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: '80px', minWidth: '70px',
      getActions: (row: AnyRecord) => {
        const actions = [
          { label: 'Voir détails', onClick: () => openDetail('lot', row) },
          { label: 'Historique mouvements', onClick: () => openMouvements(row) }
        ]
        if (row.quantite_disponible > 0) {
          actions.push({ label: 'Ajuster stock', onClick: () => openAjustement(row) })
          actions.push({ label: 'Transférer', onClick: () => showToast(`Transfert du lot #${row.id_lot}: bientôt`, 'info') })
        }
        return actions
      }
    }
  ]

  const livraisonsColumns = [
    { field: 'id_livraison', headerName: 'ID', width: '80px', minWidth: '60px', filterable: true, sortable: true },
    {
      field: 'date_livraison', headerName: 'Date', width: '130px', minWidth: '110px', filterable: true, sortable: true,
      renderCell: (row: AnyRecord) => row.date_livraison ? new Date(row.date_livraison).toLocaleDateString('fr-FR') : '-'
    },
    {
      field: 'localisation', headerName: 'Collaborateur / Point de vente', width: '260px', minWidth: '220px',
      renderCell: (row: AnyRecord) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-slate-700 dark:text-slate-200 font-medium">{row.collaborateur_nom || 'Collaborateur -'}</span>
          <span className="text-slate-600 dark:text-slate-400">{row.point_vente_nom || (row.id_point_vente ? `PV #${row.id_point_vente}` : 'Point de vente -')}</span>
        </div>
      )
    },
    {
      field: 'reference', headerName: 'Référence', width: '220px', minWidth: '180px', filterable: true,
      renderCell: (row: AnyRecord) => <span className="block truncate max-w-xs text-slate-700 dark:text-slate-200" title={row.reference || ''}>{row.reference || '-'}</span>
    },
    {
      field: 'actions', headerName: 'Actions', width: '80px', minWidth: '70px',
      getActions: (row: AnyRecord) => [{ label: 'Voir détails', onClick: () => openDetail('livraison', row) }]
    }
  ]

  return (
    <>
      <TabBox
        tabs={[
          {
            id: 'lots-disponibles',
            label: 'Lots disponibles',
            content: (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex flex-col md:flex-row gap-3 md:items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Recherche</label>
                      <input type="text" placeholder="Rechercher un lot..." value={lotsFilters.q}
                        onChange={(e) => setLotsFilters(prev => ({ ...prev, q: e.target.value }))}
                        className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLotsAdvancedFilters(prev => !prev)}
                      className="inline-flex items-center justify-center gap-2 h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
                    >
                      <svg className={`w-4 h-4 transition-transform ${showLotsAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Filtres avancés
                    </button>
                  </div>
                  {showLotsAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Points de vente</label>
                      <MultiSelectTags options={pointsDeVente.map(pv => ({ value: String(pv.id_pdv), label: pv.nom }))}
                        value={lotsFilters.id_point_vente} onChange={(val) => setLotsFilters(prev => ({ ...prev, id_point_vente: val }))}
                        placeholder="Tous les PV" />
                      </div>
                      <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Collaborateurs</label>
                      <MultiSelectTags options={collaborateurs.map(c => ({ value: String(c.id_collaborateur), label: c.nom }))}
                        value={lotsFilters.id_collaborateur} onChange={(val) => setLotsFilters(prev => ({ ...prev, id_collaborateur: val }))}
                        placeholder="Tous les collaborateurs" />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Quantité</label>
                          <select value={lotsFilters.qte_op} onChange={(e) => setLotsFilters(prev => ({ ...prev, qte_op: e.target.value }))}
                            className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                            <option value="">Opérateur</option><option value="=">=</option><option value=">">&gt;</option><option value="<">&lt;</option><option value=">=">&gt;=</option><option value="<=">&lt;=</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Valeur</label>
                          <input type="number" placeholder="Valeur" value={lotsFilters.qte_value}
                            onChange={(e) => setLotsFilters(prev => ({ ...prev, qte_value: e.target.value }))}
                            className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500" />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Période</label>
                        <DateRangeFilter value={lotsFilters.date} onChange={(val) => setLotsFilters(prev => ({ ...prev, date: val }))} />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={() => setLotsFilters({ q: '', id_point_vente: [], id_collaborateur: [], qte_op: '', qte_value: '', date: null })}
                          className="w-full h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors">
                          Réinitialiser
                        </button>
                      </div>
                    </div>
                  )}
                  {(lotsFilters.q || hasLotsAdvancedFilters) && (
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Filtres actifs :</span>
                      {lotsFilters.q && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20">
                          Recherche: {lotsFilters.q}
                          <button onClick={() => setLotsFilters(prev => ({ ...prev, q: '' }))} className="hover:text-primary-strong">×</button>
                        </span>
                      )}
                      {lotsFilters.id_point_vente.map(pvId => {
                        const pv = pointsDeVente.find(p => String(p.id_pdv) === pvId)
                        return pv ? (
                          <span key={pvId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/15">
                            PV: {pv.nom}
                            <button onClick={() => setLotsFilters(prev => ({ ...prev, id_point_vente: prev.id_point_vente.filter(id => id !== pvId) }))} className="hover:text-primary-strong dark:hover:text-primary">×</button>
                          </span>
                        ) : null
                      })}
                      {lotsFilters.id_collaborateur.map(collabId => {
                        const collab = collaborateurs.find(c => String(c.id_collaborateur) === collabId)
                        return collab ? (
                          <span key={collabId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Collab: {collab.nom}
                            <button onClick={() => setLotsFilters(prev => ({ ...prev, id_collaborateur: prev.id_collaborateur.filter(id => id !== collabId) }))} className="hover:text-green-900 dark:hover:text-green-100">×</button>
                          </span>
                        ) : null
                      })}
                      {lotsFilters.qte_op && lotsFilters.qte_value && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          Qté {lotsFilters.qte_op} {lotsFilters.qte_value}
                          <button onClick={() => setLotsFilters(prev => ({ ...prev, qte_op: '', qte_value: '' }))} className="hover:text-purple-900 dark:hover:text-purple-100">×</button>
                        </span>
                      )}
                      {lotsFilters.date && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          Période: {lotsFilters.date.dateMin} - {lotsFilters.date.dateMax}
                          <button onClick={() => setLotsFilters(prev => ({ ...prev, date: null }))} className="hover:text-orange-900 dark:hover:text-orange-100">×</button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end mb-2">
                  <button type="button" onClick={() => setLivraisonOpen(true)}
                    className="px-3 md:px-4 py-2 bg-[#7e3560] hover:bg-[#6a2f55] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                    Ajouter une marchandise
                  </button>
                </div>
                <ResponsiveDataTable columns={lotsColumns} data={lotsDisponibles.map(lot => ({ ...lot, id: lot.id_lot }))} loading={lotsLoading}
                  pagination={{ page: lotsPage, perPage: lotsLimit, total: lotsTotal }}
                  onPageChange={(page: number) => fetchLots({ page })} onPageSizeChange={(perPage: number) => fetchLots({ page: 1, limit: perPage })}
                  onSort={(s: { field: string; direction: string }) => setLotsSortConfig(s)} sortConfig={lotsSortConfig} onFiltersChange={() => {}}
                  onRowClick={(row: AnyRecord) => openDetail('lot', row)} />
              </div>
            )
          },
          {
            id: 'livraisons',
            label: 'Livraisons',
            content: (
              <div className="space-y-4 -mx-4 md:mx-0">
                <div className="flex justify-end mb-2 px-4 md:px-0">
                  <button type="button" onClick={() => setLivraisonOpen(true)}
                    className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                    Nouvelle livraison
                  </button>
                </div>
                <ResponsiveDataTable columns={livraisonsColumns} data={(livraisonsState.items as AnyRecord[]).map((it) => ({ ...it, id: it.id_livraison }))}
                  loading={livraisonsState.loading} pagination={{ page: livraisonsState.page, perPage: livraisonsState.limit, total: livraisonsState.total }}
                  onPageChange={(page: number) => fetchLivraisonsList({ page })} onPageSizeChange={(perPage: number) => fetchLivraisonsList({ page: 1, limit: perPage })}
                  onSort={(s: { field: string; direction: string }) => setLivraisonsSortConfig(s)} sortConfig={livraisonsSortConfig} onFiltersChange={() => {}}
                  onRowClick={(row: AnyRecord) => openDetail('livraison', row)} />
              </div>
            )
          },
          {
            id: 'catalogue',
            label: 'Catalogue',
            content: (
              <div className="space-y-4 -mx-4 md:mx-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 px-4 md:px-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setShowCatalogueFilters(prev => !prev)}
                      className="inline-flex items-center justify-center gap-2 h-[38px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors">
                      <Filter size={14} />
                      Filtres
                    </button>
                    {catalogueFilterCollab && (
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        Collaborateur: {collaborateurs.find(c => String(c.id_collaborateur) === catalogueFilterCollab)?.nom || catalogueFilterCollab}
                      </span>
                    )}
                    {catalogueSearch && (
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        Recherche: {catalogueSearch}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={() => setCatalogueOpen(true)}
                    className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                    Ajouter au catalogue
                  </button>
                </div>
                {showCatalogueFilters && (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <TypeaheadSelect
                          label="Collaborateur"
                          options={collaborateurs.map(c => ({ value: String(c.id_collaborateur), label: c.nom }))}
                          value={catalogueFilterCollab}
                          onChange={(value) => setCatalogueFilterCollab(value)}
                          placeholder="Choisir un collaborateur"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Produit</label>
                        <input
                          type="text"
                          value={catalogueSearch}
                          placeholder="Recherche produit"
                          onChange={(e) => setCatalogueSearch(e.target.value)}
                          className="w-full h-[42px] px-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button type="button" onClick={() => { setCatalogueFilterCollab(''); setCatalogueSearch('') }}
                          className="w-full h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors">
                          Réinitialiser
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <ResponsiveDataTable columns={catalogueColumns} data={catalogueRows}
                  pagination={{ ...pagination, total: catalogueRows.length }} onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
                  onPageSizeChange={(perPage: number) => setPagination(prev => ({ ...prev, perPage, page: 1 }))}
                  onSort={(s: { field: string; direction: string }) => setSortConfig({ key: s.field, direction: s.direction })}
                  sortConfig={{ field: sortConfig.key || '', direction: sortConfig.direction }} filters={filters as Record<string, string>} onFiltersChange={(f: AnyRecord) => { setFiltersState(f); setPagination(prev => ({ ...prev, page: 1 })) }}
                  loading={catalogueStockLoading} onRowClick={(row: AnyRecord) => openCatalogueExplorer(row)} />
              </div>
            )
          }
        ]}
      />

      <AddCatalogueDrawer open={catalogueOpen} onClose={handleCloseCatalogueDrawer} collaborateurs={collaborateurs as { id_collaborateur: string | number; nom: string }[]}
        pointsVente={pointsDeVente as { id_pdv: string | number; nom: string }[]}
        categories={produitCategories}
        onSubmit={handleCreateProduitCatalogue as (form: Parameters<typeof handleCreateProduitCatalogue>[0]) => void} loading={catalogueLoading} draft={catalogueDraft as never} />

      <QuickAddProduitModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)}
        collaborateurs={collaborateurs as { id_collaborateur: string | number; nom: string }[]}
        categories={produitCategories}
        onSubmit={handleQuickAddProduit as (form: Parameters<typeof handleQuickAddProduit>[0]) => void} loading={quickAddLoading} initialCollab={quickAddInitialCollab} />

      <StockAdjustModal open={ajustOpen && !!ajustLot} onClose={() => { if (!ajustLoading) { setAjustOpen(false); setAjustLot(null) } }}
        lot={ajustLot as never} onSubmit={handleSubmitAjustement as (form: Parameters<typeof handleSubmitAjustement>[0]) => void} loading={ajustLoading} />

      <Drawer open={Boolean(catalogueExplorerProduit)} onClose={() => {
        setCatalogueExplorerProduit(null)
        setCatalogueExplorerLots([])
      }} fullScreen title={catalogueExplorerProduit ? `Lots • ${catalogueExplorerProduit.nom}` : 'Lots'}>
        {catalogueExplorerProduit && (
          <LotExplorer
            produit={catalogueExplorerProduit}
            onClose={() => {
              setCatalogueExplorerProduit(null)
              setCatalogueExplorerLots([])
            }}
            collaborateurs={collaborateursById}
            pointsDeVente={pointsDeVenteById}
            lots={catalogueExplorerLoading ? [] : catalogueExplorerLots}
            onLotAction={handleCatalogueLotAction}
          />
        )}
      </Drawer>

      <AddLivraisonDrawer open={livraisonOpen} onClose={handleCloseLivraisonDrawer}
        collaborateurs={collaborateurs as { id_collaborateur: string | number; nom: string }[]}
        pointsVente={pointsDeVente as { id_pdv: string | number; nom: string }[]}
        produitsCatalogue={produitsCatalogueOptions}
        onQuickAddClick={handleQuickAddClick}
        onSyncSuccess={handleLivraisonSyncSuccess}
        onSyncError={(msg) => showToast(msg, 'info')}
      />

      <Modal
        open={editSeuilOpen}
        title={editSeuilProduit ? `Modifier le seuil • ${editSeuilProduit.libelle}` : 'Modifier le seuil'}
        onClose={() => {
          if (!editSeuilLoading) {
            setEditSeuilOpen(false)
            setEditSeuilProduit(null)
            setEditSeuilValue('')
          }
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (!editSeuilLoading) {
                  setEditSeuilOpen(false)
                  setEditSeuilProduit(null)
                  setEditSeuilValue('')
                }
              }}
              disabled={editSeuilLoading}
              className="px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveSeuil}
              disabled={editSeuilLoading}
              className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {editSeuilLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Seuil d&apos;alerte</label>
            <input
              type="number"
              min="0"
              value={editSeuilValue}
              onChange={(e) => setEditSeuilValue(e.target.value)}
              placeholder="Laisser vide pour aucun seuil"
              disabled={editSeuilLoading}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ce seuil sert à signaler les produits dont le stock devient bas dans le catalogue.
          </p>
        </div>
      </Modal>

      <Drawer open={detailOpen && !!detailType && !!detailData} onClose={closeDetail}
        title={detailType === 'lot' ? (detailData?.libelle_produit || 'Détails du lot')
          : detailType === 'livraison' ? `Livraison #${detailData?.id_livraison || ''}`
          : detailType === 'catalogue' ? (detailData?.libelle || 'Détails du produit')
          : detailType === 'mouvements' ? `Mouvements du lot #${detailData?.lot?.id_lot || ''}`
          : 'Détails'}>
        {detailType === 'lot' && detailData && (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Produit</h3>
              <p className="text-slate-900 dark:text-white">{detailData.libelle_produit || 'Sans nom'}</p>
              {detailData.categorie_produit && <p className="text-xs text-slate-500 dark:text-slate-400">Catégorie : {detailData.categorie_produit}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Lot</p><p className="text-slate-900 dark:text-white">#{detailData.id_lot}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Livraison</p><p className="text-slate-900 dark:text-white">{detailData.id_livraison ? `#${detailData.id_livraison}` : '-'}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Quantité</p><p className="text-slate-900 dark:text-white">{detailData.quantite_disponible || 0} / {detailData.quantite_initiale || 0}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Prix initial</p><p className="text-slate-900 dark:text-white">{detailData.prix_initial ? `${Number(detailData.prix_initial).toLocaleString('fr-FR')} Ar` : '-'}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Marge</p><p className="text-slate-900 dark:text-white">{detailData.marge ? `${Number(detailData.marge).toLocaleString('fr-FR')} Ar` : '-'}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Collaborateur / Point de vente</p><p className="text-slate-900 dark:text-white">{(detailData.collaborateur_nom || 'Collaborateur -') + ' · ' + (detailData.point_vente_nom || (detailData.id_point_vente ? `PV #${detailData.id_point_vente}` : 'Point de vente -'))}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Date de livraison</p><p className="text-slate-900 dark:text-white">{detailData.date_livraison ? new Date(detailData.date_livraison).toLocaleString('fr-FR', { dateStyle: 'short' }) : '-'}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Créé le</p><p className="text-slate-900 dark:text-white">{detailData.date_creation ? new Date(detailData.date_creation).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</p></div>
            </div>
          </div>
        )}
        {detailType === 'mouvements' && detailData && (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Mouvements du lot #{detailData?.lot?.id_lot}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{detailData?.lot?.libelle_produit || 'Produit -'}</p>
            </div>
            {detailData.loading && <div className="text-slate-600 dark:text-slate-300">Chargement...</div>}
            {!detailData.loading && detailData.error && <div className="text-red-600 dark:text-red-400">{detailData.error}</div>}
            {!detailData.loading && !detailData.error && (
              <div className="space-y-2">
                {(detailData.mouvements || []).length === 0 ? <div className="text-slate-600 dark:text-slate-300">Aucun mouvement</div> : (
                  <div className="space-y-2">
                    {(detailData.mouvements || []).map((m: AnyRecord) => (
                      <div key={m.id_stock_mouvement} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-900 dark:text-white">{String(m.type || '').toUpperCase()}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{m.date_mouvement ? new Date(m.date_mouvement).toLocaleString('fr-FR') : '-'}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Qté: {Number(m.quantite || 0).toLocaleString('fr-FR')} · Avant: {m.before_qty ?? '-'} · Après: {m.after_qty ?? '-'}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Source: {m.source_type || '-'}{m.source_id != null ? ` #${m.source_id}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {detailType === 'livraison' && detailData && (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Livraison #{detailData.id_livraison}</h3>
              <p className="text-slate-900 dark:text-white">{detailData.collaborateur_nom || 'Collaborateur -'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{detailData.point_vente_nom || (detailData.id_point_vente ? `PV #${detailData.id_point_vente}` : 'Point de vente -')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Date</p><p className="text-slate-900 dark:text-white">{detailData.date_livraison ? new Date(detailData.date_livraison).toLocaleString('fr-FR', { dateStyle: 'short' }) : '-'}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Référence</p><p className="text-slate-900 dark:text-white">{detailData.reference || '-'}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Nombre de lots</p><p className="text-slate-900 dark:text-white">{detailData.nb_lots ?? '-'}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Quantité totale</p><p className="text-slate-900 dark:text-white">{detailData.quantite_totale != null ? Number(detailData.quantite_totale).toLocaleString('fr-FR') : '-'}</p></div>
            </div>
            {detailData.commentaire && <div><p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Commentaire</p><p className="text-slate-900 dark:text-white whitespace-pre-wrap">{detailData.commentaire}</p></div>}
          </div>
        )}
        {detailType === 'catalogue' && detailData && (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{detailData.libelle}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Catégorie : {detailData.categorie || 'Sans catégorie'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Collaborateur : {detailData.collaborateur_nom || 'Collaborateur -'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Stock</p><p className="text-slate-900 dark:text-white">{Number(detailData.quantite_en_stock ?? 0).toLocaleString('fr-FR')}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Seuil d&apos;alerte</p><p className="text-slate-900 dark:text-white">{detailData.seuil_alerte != null ? detailData.seuil_alerte : '-'}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Statut</p><p className="text-slate-900 dark:text-white">{detailData.statut}</p></div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
