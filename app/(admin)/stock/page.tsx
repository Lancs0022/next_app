'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import TabBox from '@/components/TabBox/TabBox'
import MultiSelectTags from '@/components/MultiSelectTags'
import Drawer from '@/components/Drawer/Drawer'
import StockAdjustModal from '@/components/Stock/StockAdjustModal'
import { useToast } from '@/components/Toast/ToastContainer'
import DateRangeFilter from '@/components/DateRangeFilter'
import AddLivraisonDrawer from '@/components/Stock/AddLivraisonDrawer'
import AddCatalogueDrawer from '@/components/Stock/AddCatalogueDrawer'
import QuickAddProduitModal from '@/components/Stock/QuickAddProduitModal'
import api from '@/services/api'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { fetchLivraisons, setLivraisonsParams } from '@/redux/livraisonsSlice'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export default function StockPage() {
  const { showToast } = useToast()
  const dispatch = useAppDispatch()
  const livraisonsState = useAppSelector(state => state.livraisons)

  const [loadingLists, setLoadingLists] = useState(false)
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

  const [livraisonsFilters, setLivraisonsFilters] = useState({
    q: '',
    id_point_vente: '',
    id_collaborateur: '',
    date: null as AnyRecord | null
  })

  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [catalogueDraft, setCatalogueDraft] = useState<AnyRecord | null>(null)

  const [livraisonOpen, setLivraisonOpen] = useState(false)
  const [livraisonLoading, setLivraisonLoading] = useState(false)
  const [livraisonKeepManual, setLivraisonKeepManual] = useState(false)
  const [livraisonDraft, setLivraisonDraft] = useState<AnyRecord | null>(null)

  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddInitialCollab, setQuickAddInitialCollab] = useState('')
  const [quickAddTargetLotIndex, setQuickAddTargetLotIndex] = useState<number | null>(null)
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [quickAddProduitId, setQuickAddProduitId] = useState<number | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailType, setDetailType] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<AnyRecord | null>(null)

  const [ajustOpen, setAjustOpen] = useState(false)
  const [ajustLoading, setAjustLoading] = useState(false)
  const [ajustLot, setAjustLot] = useState<AnyRecord | null>(null)

  const [pagination, setPagination] = useState({ page: 1, perPage: 20 })
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: string }>({ key: null, direction: 'asc' })
  const [filters, setFiltersState] = useState<AnyRecord>({})

  const produitsCatalogueOptions = useMemo(() => {
    return produitsCatalogue.map(p => ({
      value: String(p.id_produit_catalogue),
      label: p.libelle || p.nom || `Produit #${p.id_produit_catalogue}`
    }))
  }, [produitsCatalogue])

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
        libelle: form.nom.trim(),
        categorie: form.categorie.trim() || null,
        unite_mesure: form.unite_mesure.trim() || null,
        seuil_alerte: form.seuil_alerte ? Number(form.seuil_alerte) : null,
        description: null,
        prix_initial_actuel: null,
        marge_actuelle: null
      }
      const { data: created } = await api.post('/produits', payload)
      const createdProduit = {
        id_produit_catalogue: created.id_produit_catalogue,
        id_collaborateur: created.id_collaborateur,
        libelle: created.libelle,
        description: created.description,
        categorie: created.categorie,
        prix_initial_actuel: created.prix_initial_actuel,
        marge_actuelle: created.marge_actuelle,
        statut: created.statut,
        date_creation: created.date_creation,
        date_update: created.date_update
      }
      setProduitsCatalogue(prev => [createdProduit, ...prev])
      setQuickAddProduitId(createdProduit.id_produit_catalogue)
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
      const { data: catalogueRes } = await api.get('/stock/catalogue')
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
    return catalogueStock.map(p => ({
      id: p.id_produit_catalogue,
      libelle: p.libelle || 'Sans nom',
      categorie: p.categorie || 'Sans catégorie',
      quantite_en_stock: Number(p.quantite_en_stock ?? 0),
      seuil_alerte: p.seuil_alerte ?? null,
      statut: p.statut || 'actif',
      prix_vente_actuel: p.prix_vente_actuel ?? null,
      prix_achat_actuel: p.prix_achat_actuel ?? null
    }))
  }, [catalogueStock])

  const catalogueColumns = [
    { field: 'libelle', headerName: 'Produit', width: '200px', minWidth: '150px', sortable: true, filterable: true },
    { field: 'categorie', headerName: 'Catégorie', width: '150px', minWidth: '120px', sortable: true, filterable: true },
    { field: 'quantite_en_stock', headerName: 'Stock', width: '100px', minWidth: '80px', sortable: true },
    { field: 'seuil_alerte', headerName: 'Seuil', width: '100px', minWidth: '80px', sortable: true },
    { field: 'actions', headerName: 'Actions', width: '100px', minWidth: '80px', sortable: true, filterable: true }
  ]

  const handleCreateProduitCatalogue = async (form: AnyRecord) => {
    if (!form.id_collaborateur) { showToast('Sélectionne un collaborateur', 'info'); return }
    if (!form.libelle.trim()) { showToast('Le libellé est requis', 'info'); return }
    setCatalogueLoading(true)
    try {
      await api.post('/produits', {
        id_collaborateur: Number(form.id_collaborateur),
        libelle: form.libelle.trim(),
        categorie: form.categorie.trim() || null,
        description: form.description.trim() || null,
        prix_initial_actuel: form.prix_initial_actuel === '' ? null : Number(form.prix_initial_actuel),
        marge_actuelle: form.marge_actuelle === '' ? null : Number(form.marge_actuelle)
      })
      showToast('Produit ajouté au catalogue', 'success')
      setCatalogueOpen(false)
      await refreshLists()
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

  const handleCreateLivraison = async (form: AnyRecord) => {
    if (!form.id_collaborateur) { showToast('Sélectionne un collaborateur', 'info'); return }
    if (!form.id_point_vente) { showToast('Sélectionne un point de vente', 'info'); return }
    if (!form.date_livraison) { showToast('La date de livraison est requise', 'info'); return }
    if (!Array.isArray(form.lots) || form.lots.length === 0) { showToast('Ajoute au moins un lot', 'info'); return }
    for (const lot of form.lots) {
      if (!String(lot.id_produit_catalogue || '').trim()) {
        showToast("Chaque lot doit avoir un produit catalogue sélectionné", 'info'); return
      }
      if (lot.prix_initial === '' || lot.marge === '' || lot.quantite_initiale === '') {
        showToast('Prix, marge et quantité sont requis pour chaque lot', 'info'); return
      }
    }
    setLivraisonLoading(true)
    try {
      await api.post('/livraisons', {
        header: {
          id_collaborateur: Number(form.id_collaborateur),
          id_point_vente: Number(form.id_point_vente),
          date: form.date_livraison,
          reference: form.reference || null,
          commentaire: form.commentaire || null
        },
        lines: form.lots.map((lot: AnyRecord) => ({
          id_produit_catalogue: lot.id_produit_catalogue || null,
          nom: lot.libelle || '',
          prix_initial: Number(lot.prix_initial || 0),
          marge: Number(lot.marge || 0),
          qty: Number(lot.quantite_initiale || 0),
          description: lot.description || null
        }))
      })
      showToast('Livraison créée', 'success')
      setLivraisonOpen(false)
      await refreshLists()
      await fetchLots({ page: 1 })
    } catch (e2: unknown) {
      const err = e2 as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur création livraison', 'info')
    } finally {
      setLivraisonLoading(false)
    }
  }

  const handleCloseLivraisonDrawer = (draft?: AnyRecord) => {
    setLivraisonOpen(false)
    if (draft) setLivraisonDraft(draft)
  }

  const handleQuickAddClick = (lotIndex: number, collabId: string | number) => {
    setQuickAddTargetLotIndex(lotIndex)
    setQuickAddInitialCollab(collabId ? String(collabId) : '')
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

  const lotsColumns = [
    {
      field: 'produit', headerName: 'Produit', width: '220px', minWidth: '180px', sortable: true,
      renderCell: (row: AnyRecord) => (
        <div className="flex flex-col gap-1">
          <div className="font-medium text-slate-900 dark:text-white truncate" title={row.libelle_produit || 'Sans nom'}>
            {row.libelle_produit || 'Sans nom'}
          </div>
          {row.categorie_produit && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 w-fit">
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Recherche</label>
                      <input type="text" placeholder="Rechercher un lot..." value={lotsFilters.q}
                        onChange={(e) => setLotsFilters(prev => ({ ...prev, q: e.target.value }))}
                        className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Points de vente</label>
                      <MultiSelectTags options={pointsDeVente.map(pv => ({ value: String(pv.id_point_vente), label: pv.nom }))}
                        value={lotsFilters.id_point_vente} onChange={(val) => setLotsFilters(prev => ({ ...prev, id_point_vente: val }))}
                        placeholder="Tous les PV" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Collaborateurs</label>
                      <MultiSelectTags options={collaborateurs.map(c => ({ value: String(c.id_collaborateur), label: c.nom }))}
                        value={lotsFilters.id_collaborateur} onChange={(val) => setLotsFilters(prev => ({ ...prev, id_collaborateur: val }))}
                        placeholder="Tous les collaborateurs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                  {(lotsFilters.q || lotsFilters.id_point_vente.length > 0 || lotsFilters.id_collaborateur.length > 0 || lotsFilters.qte_op || lotsFilters.date) && (
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Filtres actifs :</span>
                      {lotsFilters.q && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20">
                          Recherche: {lotsFilters.q}
                          <button onClick={() => setLotsFilters(prev => ({ ...prev, q: '' }))} className="hover:text-primary-strong">×</button>
                        </span>
                      )}
                      {lotsFilters.id_point_vente.map(pvId => {
                        const pv = pointsDeVente.find(p => String(p.id_point_vente) === pvId)
                        return pv ? (
                          <span key={pvId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            PV: {pv.nom}
                            <button onClick={() => setLotsFilters(prev => ({ ...prev, id_point_vente: prev.id_point_vente.filter(id => id !== pvId) }))} className="hover:text-blue-900 dark:hover:text-blue-100">×</button>
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
                <div className="flex justify-end mb-2 px-4 md:px-0">
                  <button type="button" onClick={() => setCatalogueOpen(true)}
                    className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                    Ajouter au catalogue
                  </button>
                </div>
                <ResponsiveDataTable columns={catalogueColumns} data={catalogueRows}
                  pagination={{ ...pagination, total: catalogueRows.length }} onPageChange={(page: number) => setPagination(prev => ({ ...prev, page }))}
                  onPageSizeChange={(perPage: number) => setPagination(prev => ({ ...prev, perPage, page: 1 }))}
                  onSort={(s: { field: string; direction: string }) => setSortConfig({ key: s.field, direction: s.direction })}
                  sortConfig={{ field: sortConfig.key || '', direction: sortConfig.direction }} filters={filters as Record<string, string>} onFiltersChange={(f: AnyRecord) => { setFiltersState(f); setPagination(prev => ({ ...prev, page: 1 })) }}
                  loading={catalogueStockLoading} onRowClick={(row: AnyRecord) => openDetail('catalogue', row)} />
              </div>
            )
          }
        ]}
      />

      <AddCatalogueDrawer open={catalogueOpen} onClose={handleCloseCatalogueDrawer} collaborateurs={collaborateurs as { id_collaborateur: string | number; nom: string }[]}
        onSubmit={handleCreateProduitCatalogue as (form: Parameters<typeof handleCreateProduitCatalogue>[0]) => void} loading={catalogueLoading} draft={catalogueDraft as never} />

      <QuickAddProduitModal open={quickAddOpen} onClose={() => { setQuickAddOpen(false); setQuickAddTargetLotIndex(null) }}
        collaborateurs={collaborateurs as { id_collaborateur: string | number; nom: string }[]} onSubmit={handleQuickAddProduit as (form: Parameters<typeof handleQuickAddProduit>[0]) => void} loading={quickAddLoading} initialCollab={quickAddInitialCollab} />

      <StockAdjustModal open={ajustOpen && !!ajustLot} onClose={() => { if (!ajustLoading) { setAjustOpen(false); setAjustLot(null) } }}
        lot={ajustLot as never} onSubmit={handleSubmitAjustement as (form: Parameters<typeof handleSubmitAjustement>[0]) => void} loading={ajustLoading} />

      <AddLivraisonDrawer open={livraisonOpen} onClose={handleCloseLivraisonDrawer} collaborateurs={collaborateurs as { id_collaborateur: string | number; nom: string }[]}
        pointsVente={pointsDeVente as { id_point_vente: string | number; nom: string }[]} produitsCatalogue={produitsCatalogueOptions} onSubmit={handleCreateLivraison as (form: Parameters<typeof handleCreateLivraison>[0]) => void}
        onQuickAddClick={handleQuickAddClick} loading={livraisonLoading} draft={livraisonDraft as never}
        keepManual={livraisonKeepManual} onKeepManualChange={setLivraisonKeepManual}
        quickAddTargetLotIndex={quickAddTargetLotIndex} quickAddProduitId={quickAddProduitId} />

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
