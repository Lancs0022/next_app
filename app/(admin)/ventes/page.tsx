'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import MultiSelectTags from '@/components/MultiSelectTags'
import DateRangeFilter from '@/components/DateRangeFilter'
import Drawer from '@/components/Drawer/Drawer'
import { useToast } from '@/components/Toast/ToastContainer'
import api from '@/services/api'
import { getPvId } from '@/lib/pointVente'
import VenteEntryDrawer from '@/components/Ventes/VenteEntryDrawer'

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
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<AnyRecord | null>(null)
  const [selectedRow, setSelectedRow] = useState<AnyRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

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
        api.get('/points-de-vente'),
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
      setCreateOpen(true)
      setPreloadedFromStock(true)
    }
  }, [fromLotId, fromPvId, preloadedFromStock])

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

  const handleVenteSyncSuccess = () => {
    showToast('Vente synchronisée', 'success')
    fetchVentes({ page: 1 })
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
                <option key="all-pv" value="">Tous les points de vente</option>
                {pointsDeVente.map(pv => {
                  const id = getPvId(pv)
                  return <option key={id} value={id}>{pv.nom}</option>
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Statut</label>
              <select value={filters.statut} onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                className="w-full h-[42px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                <option key="all-statuts" value="">Tous les statuts</option>
                <option key="en_attente_paiement" value="en_attente_paiement">En attente</option><option key="payee" value="payee">Payée</option><option key="annulee" value="annulee">Annulée</option><option key="retournee" value="retournee">Retournée</option>
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
                const pv = pointsDeVente.find(p => getPvId(p) === String(filters.id_point_vente))
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

      <VenteEntryDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        collaborateurs={collaborateurs.map(c => ({ id_collaborateur: c.id_collaborateur, nom: c.nom }))}
        pointsVente={pointsDeVente.map(pv => ({ id: getPvId(pv), nom: pv.nom }))}
        initialPvId={fromPvId || ''}
        initialLotId={fromLotId || ''}
        onSyncSuccess={handleVenteSyncSuccess}
        onSyncError={(msg) => showToast(msg, 'info')}
      />
    </div>
  )
}
