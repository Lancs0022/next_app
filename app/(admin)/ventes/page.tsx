'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import MultiSelectTags from '@/components/MultiSelectTags'
import DateRangeFilter from '@/components/DateRangeFilter'
import Drawer from '@/components/Drawer/Drawer'
import { useToast } from '@/components/Toast/ToastContainer'
import api from '@/services/api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export default function VentesPage() {
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  // Handle fromStockLot via search params (?from_lot=X&from_pv=Y)
  const fromLotId = searchParams.get('from_lot')
  const fromPvId = searchParams.get('from_pv')

  const [loadingLists, setLoadingLists] = useState(false)
  const [collaborateurs, setCollaborateurs] = useState<AnyRecord[]>([])
  const [pointsDeVente, setPointsDeVente] = useState<AnyRecord[]>([])

  const [ventes, setVentes] = useState<AnyRecord[]>([])
  const [ventesPage, setVentesPage] = useState(1)
  const [ventesLimit, setVentesLimit] = useState(20)
  const [ventesTotal, setVentesTotal] = useState(0)
  const [ventesLoading, setVentesLoading] = useState(false)

  const [mode, setMode] = useState<'atomique' | 'aggrege'>('atomique')
  const [lotsDisponibles, setLotsDisponibles] = useState<AnyRecord[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<AnyRecord | null>(null)
  const [selectedRow, setSelectedRow] = useState<AnyRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    id_client: '',
    id_point_vente: '',
    date_vente: new Date().toISOString().slice(0, 10),
    lignes: [{ id_lot: '', id_collaborateur: '', quantite: '' }]
  })

  const [preloadedFromStock, setPreloadedFromStock] = useState(false)

  const [filters, setFilters] = useState({
    q: '',
    id_point_vente: '',
    id_collaborateur: [] as string[],
    statut: '',
    date: null as AnyRecord | null
  })

  const refreshLists = async () => {
    setLoadingLists(true)
    try {
      const [cRes, pvRes] = await Promise.all([
        api.get('/collaborateurs'),
        api.get('/points-de-vente')
      ])
      setCollaborateurs(cRes.data?.data || cRes.data || [])
      setPointsDeVente(pvRes.data?.data || pvRes.data || [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur chargement des listes', 'info')
    } finally {
      setLoadingLists(false)
    }
  }

  const fetchVentes = useCallback(async ({ page, limit }: { page?: number; limit?: number } = {}) => {
    setVentesLoading(true)
    try {
      const params: AnyRecord = {
        page: page || ventesPage,
        limit: limit || ventesLimit,
        ...(filters.q && { q: filters.q }),
        ...(filters.id_point_vente && { id_point_vente: filters.id_point_vente }),
        ...(filters.id_collaborateur.length && { id_collaborateur: filters.id_collaborateur.join(',') }),
        ...(filters.statut && { statut: filters.statut }),
        ...(filters.date?.dateMin && { dateMin: filters.date.dateMin }),
        ...(filters.date?.dateMax && { dateMax: filters.date.dateMax })
      }
      const endpoint = mode === 'atomique' ? '/ventes/atomiques' : '/ventes'
      const { data: res } = await api.get(endpoint, { params })
      setVentes(res.data || [])
      setVentesPage(res.page || 1)
      setVentesLimit(res.limit || 20)
      setVentesTotal(res.total || 0)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur chargement des ventes', 'info')
    } finally {
      setVentesLoading(false)
    }
  }, [filters, ventesPage, ventesLimit, mode, showToast])

  useEffect(() => { refreshLists() }, [])

  useEffect(() => { fetchVentes() }, [filters, fetchVentes])

  // Handle preloading from stock (via search params)
  useEffect(() => {
    if ((fromLotId || fromPvId) && !preloadedFromStock) {
      setCreateForm(prev => ({
        ...prev,
        id_point_vente: fromPvId || prev.id_point_vente,
        lignes: prev.lignes && prev.lignes.length > 0
          ? [{ ...prev.lignes[0], id_lot: fromLotId || '' }, ...prev.lignes.slice(1)]
          : [{ id_lot: fromLotId || '', id_collaborateur: '', quantite: '' }]
      }))
      setCreateOpen(true)
      setPreloadedFromStock(true)
    }
  }, [fromLotId, fromPvId, preloadedFromStock])

  // Load lots when create drawer opens with a point de vente
  useEffect(() => {
    if (!createOpen || !createForm.id_point_vente) return
    const loadLots = async () => {
      try {
        const { data: res } = await api.get('/stock/lots', { params: { id_point_vente: createForm.id_point_vente, limit: 200 } })
        setLotsDisponibles(res.data || [])
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error || err?.message || 'Erreur chargement des lots disponibles', 'info')
      }
    }
    loadLots()
  }, [createOpen, createForm.id_point_vente, showToast])

  const handleRowClick = async (row: AnyRecord) => {
    setSelectedRow(row)
    setDetailOpen(true)
    if (mode === 'aggrege') {
      setDetailLoading(true)
      try {
        const { data: res } = await api.get(`/ventes/${row.id_vente}`)
        setDetailData(res.data || res || null)
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(err?.response?.data?.error || err?.message || 'Erreur chargement du détail de la vente', 'info')
        setDetailOpen(false)
      } finally {
        setDetailLoading(false)
      }
    } else {
      setDetailData(row)
    }
  }

  const formatStatut = (statut: string) => {
    const labels: Record<string, string> = { en_attente_paiement: 'En attente', payee: 'Payée', annulee: 'Annulée', retournee: 'Retournée' }
    return labels[statut] || statut
  }

  const getStatutBadgeClass = (statut: string) => {
    const classes: Record<string, string> = {
      en_attente_paiement: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      payee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      annulee: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      retournee: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    }
    return classes[statut] || 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
  }

  const resetCreateForm = () => {
    setCreateForm({ id_client: '', id_point_vente: '', date_vente: new Date().toISOString().slice(0, 10), lignes: [{ id_lot: '', id_collaborateur: '', quantite: '' }] })
  }

  const addLigne = () => setCreateForm(prev => ({ ...prev, lignes: [...prev.lignes, { id_lot: '', id_collaborateur: '', quantite: '' }] }))
  const removeLigne = (index: number) => setCreateForm(prev => prev.lignes.length <= 1 ? prev : { ...prev, lignes: prev.lignes.filter((_, i) => i !== index) })
  const updateLigne = (index: number, updates: AnyRecord) => setCreateForm(prev => ({ ...prev, lignes: prev.lignes.map((ligne, i) => (i === index ? { ...ligne, ...updates } : ligne)) }))

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.id_point_vente || !createForm.id_client) { showToast('Point de vente et client requis', 'info'); return }
    if (!Array.isArray(createForm.lignes) || createForm.lignes.length === 0) { showToast('Au moins une ligne de produit est requise', 'info'); return }
    if (createForm.lignes.some(l => !l.id_lot || !l.id_collaborateur || !l.quantite)) { showToast('Chaque ligne doit avoir un lot, un collaborateur et une quantité', 'info'); return }
    setCreateLoading(true)
    try {
      await api.post('/ventes/directe', {
        header: { id_point_vente: Number(createForm.id_point_vente), id_client: Number(createForm.id_client), date_vente: createForm.date_vente },
        lines: createForm.lignes.map(l => ({ id_lot: Number(l.id_lot), id_collaborateur: Number(l.id_collaborateur), quantite: Number(l.quantite) }))
      })
      showToast('Vente créée', 'success')
      setCreateOpen(false)
      resetCreateForm()
      fetchVentes({ page: 1 })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      showToast(err?.response?.data?.error || err?.message || 'Erreur lors de la création de la vente', 'info')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCloseDetail = () => { setDetailOpen(false); setSelectedRow(null); setDetailData(null) }

  const atomiqueColumns = [
    { field: 'date_vente', headerName: 'Date', width: '140px', minWidth: '120px', sortable: true,
      renderCell: (row: AnyRecord) => row.date_vente ? new Date(row.date_vente).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-' },
    { field: 'point_vente_nom', headerName: 'Point de vente', width: '180px', minWidth: '150px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="font-medium text-slate-900 dark:text-white">{row.point_vente_nom || `PV #${row.id_point_vente}`}</span> },
    { field: 'libelle_produit', headerName: 'Produit / lot', width: '200px', minWidth: '160px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="text-slate-900 dark:text-white">{row.libelle_produit || `Lot #${row.id_lot}`}</span> },
    { field: 'collaborateur_nom', headerName: 'Collaborateur', width: '160px', minWidth: '140px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="text-slate-700 dark:text-slate-200">{row.collaborateur_nom || '-'}</span> },
    { field: 'quantite_vendue', headerName: 'Quantité', width: '90px', minWidth: '80px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="text-right block">{row.quantite_vendue}</span> },
    { field: 'montant_ht', headerName: 'Montant ligne', width: '130px', minWidth: '120px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="font-semibold text-slate-900 dark:text-white block text-right">{row.montant_ht ? `${Number(row.montant_ht).toLocaleString('fr-FR')} Ar` : '-'}</span> },
    { field: 'montant_marge', headerName: 'Marge', width: '120px', minWidth: '100px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="font-medium text-green-600 dark:text-green-400 block text-right">{row.montant_marge ? `${Number(row.montant_marge).toLocaleString('fr-FR')} Ar` : '-'}</span> },
    { field: 'statut', headerName: 'Statut', width: '130px', minWidth: '110px', sortable: true,
      renderCell: (row: AnyRecord) => <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatutBadgeClass(row.statut)}`}>{formatStatut(row.statut)}</span> },
    { field: 'actions', headerName: 'Actions', width: '80px', minWidth: '70px',
      getActions: (row: AnyRecord) => [{ label: 'Voir détails', onClick: () => handleRowClick(row) }] }
  ]

  const aggregeColumns = [
    { field: 'date_vente', headerName: 'Date', width: '140px', minWidth: '120px', sortable: true,
      renderCell: (row: AnyRecord) => row.date_vente ? new Date(row.date_vente).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-' },
    { field: 'point_vente_nom', headerName: 'Point de vente', width: '180px', minWidth: '150px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="font-medium text-slate-900 dark:text-white">{row.point_vente_nom || `PV #${row.id_point_vente}`}</span> },
    { field: 'client_nom', headerName: 'Client', width: '180px', minWidth: '150px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="text-slate-700 dark:text-slate-200">{row.client_nom || 'Client anonyme'}</span> },
    { field: 'montant_total', headerName: 'Montant total', width: '140px', minWidth: '120px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="font-semibold text-slate-900 dark:text-white">{row.montant_total ? `${Number(row.montant_total).toLocaleString('fr-FR')} Ar` : '-'}</span> },
    { field: 'montant_marge', headerName: 'Marge', width: '120px', minWidth: '100px', sortable: true,
      renderCell: (row: AnyRecord) => <span className="font-medium text-green-600 dark:text-green-400">{row.montant_marge ? `${Number(row.montant_marge).toLocaleString('fr-FR')} Ar` : '-'}</span> },
    { field: 'statut', headerName: 'Statut', width: '130px', minWidth: '110px', sortable: true,
      renderCell: (row: AnyRecord) => <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatutBadgeClass(row.statut)}`}>{formatStatut(row.statut)}</span> },
    { field: 'cree_par_nom', headerName: 'Créé par', width: '150px', minWidth: '130px',
      renderCell: (row: AnyRecord) => <span className="text-xs text-slate-600 dark:text-slate-400">{row.cree_par_nom || '-'}</span> },
    { field: 'actions', headerName: 'Actions', width: '80px', minWidth: '70px',
      getActions: (row: AnyRecord) => [{ label: 'Voir détails', onClick: () => handleRowClick(row) }] }
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Mode d&apos;affichage</span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button type="button" onClick={() => setMode('atomique')}
                  className={`px-3 py-1.5 text-xs font-medium ${mode === 'atomique' ? 'bg-primary text-white' : 'bg-transparent text-slate-600 dark:text-slate-300'}`}>Atomique</button>
                <button type="button" onClick={() => setMode('aggrege')}
                  className={`px-3 py-1.5 text-xs font-medium ${mode === 'aggrege' ? 'bg-primary text-white' : 'bg-transparent text-slate-600 dark:text-slate-300'}`}>Agrégé</button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setCreateOpen(true)}
                className="inline-flex items-center justify-center px-3 md:px-4 py-2 rounded-lg bg-primary hover:bg-primary-strong text-white text-sm font-medium transition-colors">
                <span className="text-lg leading-none mr-1">+</span><span>Nouvelle vente</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Recherche</label>
              <input type="text" placeholder="Rechercher une vente..." value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Point de vente</label>
              <select value={filters.id_point_vente} onChange={(e) => setFilters(prev => ({ ...prev, id_point_vente: e.target.value }))}
                className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                <option value="">Tous les points de vente</option>
                {pointsDeVente.map(pv => <option key={pv.id_point_vente} value={pv.id_point_vente}>{pv.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Statut</label>
              <select value={filters.statut} onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                <option value="">Tous les statuts</option>
                <option value="en_attente_paiement">En attente</option><option value="payee">Payée</option><option value="annulee">Annulée</option><option value="retournee">Retournée</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <DateRangeFilter label="Période" value={filters.date} onChange={(val) => setFilters(prev => ({ ...prev, date: val }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Collaborateurs</label>
              <MultiSelectTags options={collaborateurs.map(c => ({ value: String(c.id_collaborateur), label: c.nom }))}
                value={filters.id_collaborateur} onChange={(val) => setFilters(prev => ({ ...prev, id_collaborateur: val }))}
                placeholder="Tous les collaborateurs" />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => setFilters({ q: '', id_point_vente: '', id_collaborateur: [], statut: '', date: null })}
                className="w-full h-[42px] px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors">
                Réinitialiser
              </button>
            </div>
          </div>
          {(filters.q || filters.id_point_vente || filters.id_collaborateur.length > 0 || filters.statut || filters.date) && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Filtres actifs :</span>
              {filters.q && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20">
                  Recherche: {filters.q}<button onClick={() => setFilters(prev => ({ ...prev, q: '' }))} className="hover:text-primary-strong">×</button>
                </span>
              )}
              {filters.id_point_vente && (() => {
                const pv = pointsDeVente.find(p => String(p.id_point_vente) === String(filters.id_point_vente))
                return pv ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/15">
                    PV: {pv.nom}<button onClick={() => setFilters(prev => ({ ...prev, id_point_vente: '' }))} className="hover:text-primary-strong dark:hover:text-primary">×</button>
                  </span>
                ) : null
              })()}
              {filters.id_collaborateur.map(collabId => {
                const collab = collaborateurs.find(c => String(c.id_collaborateur) === collabId)
                return collab ? (
                  <span key={collabId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Collab: {collab.nom}<button onClick={() => setFilters(prev => ({ ...prev, id_collaborateur: prev.id_collaborateur.filter(id => id !== collabId) }))} className="hover:text-green-900 dark:hover:text-green-100">×</button>
                  </span>
                ) : null
              })}
              {filters.statut && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  Statut: {formatStatut(filters.statut)}<button onClick={() => setFilters(prev => ({ ...prev, statut: '' }))} className="hover:text-purple-900 dark:hover:text-purple-100">×</button>
                </span>
              )}
              {filters.date && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  Période: {filters.date.dateMin} - {filters.date.dateMax}<button onClick={() => setFilters(prev => ({ ...prev, date: null }))} className="hover:text-orange-900 dark:hover:text-orange-100">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <ResponsiveDataTable columns={mode === 'atomique' ? atomiqueColumns : aggregeColumns}
        data={ventes.map(v => ({ ...v, id: mode === 'atomique' ? v.id_vente_article : v.id_vente }))}
        loading={ventesLoading} pagination={{ page: ventesPage, perPage: ventesLimit, total: ventesTotal }}
        onPageChange={(page: number) => fetchVentes({ page })} onPageSizeChange={(perPage: number) => fetchVentes({ page: 1, limit: perPage })}
        onRowClick={handleRowClick} onFiltersChange={() => {}} />

      {detailOpen && (
        <Drawer open={detailOpen} title={mode === 'atomique' ? 'Détail de la transaction' : `Détail vente #${detailData?.id_vente || selectedRow?.id_vente || ''}`} onClose={handleCloseDetail}>
          {detailLoading ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Chargement du détail...</div>
          ) : (
            <>
              {mode === 'aggrege' && detailData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Vente</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">ID: {detailData.id_vente}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Date: {detailData.date_vente ? new Date(detailData.date_vente).toLocaleString('fr-FR') : '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Point de vente: {detailData.point_vente_nom || `PV #${detailData.id_point_vente}`}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Client: {detailData.client_nom || 'Client anonyme'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Statut: {formatStatut(detailData.statut)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Montants</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total: {detailData.montant_total ? `${Number(detailData.montant_total).toLocaleString('fr-FR')} Ar` : '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Marge: {detailData.montant_marge ? `${Number(detailData.montant_marge).toLocaleString('fr-FR')} Ar` : '-'}</p>
                    </div>
                  </div>
                  {Array.isArray(detailData.lignes) && detailData.lignes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Lignes</h3>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Produit</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Collaborateur</th>
                              <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Qté</th>
                              <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Montant</th>
                              <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Marge</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {detailData.lignes.map((ligne: AnyRecord) => (
                              <tr key={ligne.id}>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{ligne.libelle_produit || `Lot #${ligne.id_lot}`}</td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{ligne.collaborateur_nom || '-'}</td>
                                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">{ligne.quantite_vendue}</td>
                                <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">{ligne.montant_ht ? `${Number(ligne.montant_ht).toLocaleString('fr-FR')} Ar` : '-'}</td>
                                <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">{ligne.montant_marge ? `${Number(ligne.montant_marge).toLocaleString('fr-FR')} Ar` : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {mode === 'atomique' && detailData && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Vente</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Vente #{detailData.id_vente}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Date: {detailData.date_vente ? new Date(detailData.date_vente).toLocaleString('fr-FR') : '-'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Point de vente: {detailData.point_vente_nom || `PV #${detailData.id_point_vente}`}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Client: {detailData.client_nom || 'Client anonyme'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Statut: {formatStatut(detailData.statut)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Transaction</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Produit / lot: {detailData.libelle_produit || `Lot #${detailData.id_lot}`}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Collaborateur: {detailData.collaborateur_nom || '-'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quantité: {detailData.quantite_vendue}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Montant: {detailData.montant_ht ? `${Number(detailData.montant_ht).toLocaleString('fr-FR')} Ar` : '-'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Marge: {detailData.montant_marge ? `${Number(detailData.montant_marge).toLocaleString('fr-FR')} Ar` : '-'}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </Drawer>
      )}

      {createOpen && (
        <Drawer open={createOpen} title="Nouvelle vente" onClose={() => { if (!createLoading) setCreateOpen(false) }}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => { if (!createLoading) setCreateOpen(false) }} disabled={createLoading}
                className="px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">Annuler</button>
              <button type="submit" form="create-vente-form" disabled={createLoading}
                className="px-3 md:px-4 py-2 bg-primary hover:bg-primary-strong text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {createLoading ? 'Création...' : 'Créer'}
              </button>
            </div>
          }>
          <form id="create-vente-form" onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Point de vente</label>
                <select value={createForm.id_point_vente} onChange={(e) => setCreateForm(prev => ({ ...prev, id_point_vente: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required disabled={createLoading}>
                  <option value="">Sélectionner</option>
                  {pointsDeVente.map(pv => <option key={pv.id_point_vente} value={pv.id_point_vente}>{pv.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ID client</label>
                <input type="number" value={createForm.id_client} onChange={(e) => setCreateForm(prev => ({ ...prev, id_client: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required disabled={createLoading} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date de vente</label>
              <input type="date" value={createForm.date_vente} onChange={(e) => setCreateForm(prev => ({ ...prev, date_vente: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" required disabled={createLoading} />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Lignes de vente</h3>
                <button type="button" onClick={addLigne} disabled={createLoading}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60">
                  <span className="text-lg leading-none mr-1">+</span><span>Ajouter une ligne</span>
                </button>
              </div>
              <div className="space-y-3">
                {createForm.lignes.map((ligne, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Lot / produit</label>
                      <select value={ligne.id_lot} onChange={(e) => updateLigne(index, { id_lot: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                        required disabled={createLoading || !createForm.id_point_vente}>
                        <option value="">Sélectionner un lot</option>
                        {lotsDisponibles.map((lot: AnyRecord) => <option key={lot.id_lot} value={lot.id_lot}>{lot.libelle_produit} — {lot.quantite_disponible} dispo</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Collaborateur</label>
                      <select value={ligne.id_collaborateur} onChange={(e) => updateLigne(index, { id_collaborateur: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" required disabled={createLoading}>
                        <option value="">Sélectionner</option>
                        {collaborateurs.map(c => <option key={c.id_collaborateur} value={c.id_collaborateur}>{c.nom}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Quantité</label>
                        {createForm.lignes.length > 1 && (
                          <button type="button" onClick={() => removeLigne(index)} disabled={createLoading} className="text-xs text-red-500 hover:text-red-600">Supprimer</button>
                        )}
                      </div>
                      <input type="number" min="1" value={ligne.quantite} onChange={(e) => updateLigne(index, { quantite: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" required disabled={createLoading} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  )
}
