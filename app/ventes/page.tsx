'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ResponsiveDataTable from '@/components/ResponsiveDataTable/ResponsiveDataTable'
import MultiSelectTags from '@/components/MultiSelectTags'
import DateRangeFilter from '@/components/DateRangeFilter'
import Drawer from '@/components/Drawer/Drawer'
import { useToast } from '@/components/Toast/ToastContainer'
import { useRouter } from 'next/navigation'
import api from '@/services/api'
import { getPvId } from '@/lib/pointVente'
import type { FilterState } from '@/components/ResponsiveDataTable/ColumnFilterDropdown'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

function VentesPageContent() {
  const router = useRouter()
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

  const [columnFilters, setColumnFilters] = useState<Record<string, FilterState>>({})

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

  const handleColumnFiltersChange = useCallback((colFilters: Record<string, FilterState>) => {
    setColumnFilters(colFilters)
    setFilters(prev => {
      const next = { ...prev }

      // Date column filter
      const dateF = colFilters['date_vente']
      if (dateF && dateF.date) {
        if (dateF.date.preset === 'today') {
          const today = new Date().toISOString().slice(0, 10)
          next.date = { dateMin: today, dateMax: today, mode: 'jour', day: today }
        } else if (dateF.date.preset === 'week') {
          const now = new Date()
          const mon = new Date(now)
          mon.setDate(now.getDate() - now.getDay() + 1)
          const sun = new Date(mon)
          sun.setDate(mon.getDate() + 6)
          next.date = { dateMin: mon.toISOString().slice(0, 10), dateMax: sun.toISOString().slice(0, 10), mode: 'semaine' }
        } else if (dateF.date.preset === 'month') {
          const now = new Date()
          const first = new Date(now.getFullYear(), now.getMonth(), 1)
          const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          next.date = { dateMin: first.toISOString().slice(0, 10), dateMax: last.toISOString().slice(0, 10), mode: 'mois' }
        } else if (dateF.date.preset === 'custom' && (dateF.date.from || dateF.date.to)) {
          next.date = { dateMin: dateF.date.from, dateMax: dateF.date.to, mode: 'fourchette', start: dateF.date.from, end: dateF.date.to }
        } else if ((dateF as any).dateMin || (dateF as any).dateMax) {
          next.date = dateF as any
        } else {
          next.date = null
        }
      } else {
        next.date = null
      }

      // Point de vente select
      const pvF = colFilters['point_vente_nom']
      if (pvF && pvF.select && pvF.select.length > 0) {
        const matched = pointsDeVente.find(pv => pvF.select.includes(pv.nom))
        next.id_point_vente = matched ? String(getPvId(matched)) : ''
      } else {
        next.id_point_vente = ''
      }

      // Statut select
      const statutF = colFilters['statut']
      if (statutF && statutF.select && statutF.select.length > 0) {
        next.statut = statutF.select[0]
      } else {
        next.statut = ''
      }

      return next
    })
  }, [pointsDeVente])

  const clearColumnFilter = (field: string) => {
    const next = { ...columnFilters }
    delete next[field]
    handleColumnFiltersChange(next)
  }

  const handleCloseDetail = () => { setDetailOpen(false); setSelectedRow(null); setDetailData(null) }

  const cancelVente = async (venteId: number, raison: string) => {
    try {
      await api.post(`/api/ventes/${venteId}/annuler`, { raison });
      showToast('Vente annulée avec succès', 'success');
      fetchVentes({ page: 1 });
    } catch (err: any) {
      showToast(err?.response?.data?.error || err?.message || 'Erreur lors de l\'annulation de la vente', 'error');
    }
  };

  const STATUT_LETTER: Record<string, string> = { en_attente_paiement: 'A', payee: 'P', annulee: 'X', retournee: 'R' }

  const atomiqueColumns = [
    {
      field: 'libelle_produit', headerName: 'Produit / Contexte', width: '240px', minWidth: '180px', sortable: true, filterable: true, filterKind: 'text' as const,
      renderCell: (row: AnyRecord) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">{row.libelle_produit || `Lot #${row.id_lot}`}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{row.point_vente_nom || `PV #${row.id_point_vente}`} · {row.collaborateur_nom || '-'}</div>
        </div>
      )
    },
    {
      field: 'montant_ht', headerName: 'Qté / Montant', width: '160px', minWidth: '130px', sortable: true, filterable: true, filterKind: 'numeric' as const,
      renderCell: (row: AnyRecord) => (
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {row.quantite_vendue} x {row.montant_ht ? `${Number(row.montant_ht).toLocaleString('fr-FR')} Ar` : '-'}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            Marge: {row.montant_marge ? `${Number(row.montant_marge).toLocaleString('fr-FR')} Ar` : '-'}
          </div>
        </div>
      )
    },
    {
      field: 'date_vente', headerName: 'Dates', width: '180px', minWidth: '140px', sortable: true, filterable: true, filterKind: 'date' as const,
      renderCell: (row: AnyRecord) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">
            {row.date_vente ? new Date(row.date_vente).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Par Admin #{row.enregistre_par_admin_id}
          </div>
        </div>
      )
    },
    {
      field: 'statut', headerName: 'Statut', width: '60px', minWidth: '40px', sortable: true, filterable: true, filterKind: 'select' as const,
      filterOptions: ['en_attente_paiement', 'payee', 'annulee', 'retournee'],
      renderCell: (row: AnyRecord) => (
        <span
          title={formatStatut(row.statut)}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${getStatutBadgeClass(row.statut)}`}
        >
          {STATUT_LETTER[row.statut] || '?'}
        </span>
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: '80px', minWidth: '70px',
      getActions: (row: AnyRecord) => [
        { label: 'Voir détails', onClick: () => handleRowClick(row) },
        {
          label: 'Annuler la vente',
          onClick: () => {
            const reason = window.prompt("Raison de l'annulation :");
            if (reason !== null && reason.trim() !== '') {
              cancelVente(row.id_vente, reason.trim());
            }
          }
        }
      ]
    }
  ]

  const aggregeColumns = [
    {
      field: 'client_nom', headerName: 'Client / Contexte', width: '240px', minWidth: '180px', sortable: true,
      renderCell: (row: AnyRecord) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">{row.client_nom || 'Client anonyme'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{row.point_vente_nom || `PV #${row.id_point_vente}`}</div>
        </div>
      )
    },
    {
      field: 'montant_total', headerName: 'Montant', width: '160px', minWidth: '130px', sortable: true,
      renderCell: (row: AnyRecord) => (
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {row.montant_total ? `${Number(row.montant_total).toLocaleString('fr-FR')} Ar` : '-'}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            Marge: {row.montant_marge ? `${Number(row.montant_marge).toLocaleString('fr-FR')} Ar` : '-'}
          </div>
        </div>
      )
    },
    {
      field: 'date_vente', headerName: 'Dates', width: '180px', minWidth: '140px', sortable: true,
      renderCell: (row: AnyRecord) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">
            {row.date_vente ? new Date(row.date_vente).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Créé par {row.cree_par_nom || '-'}
          </div>
        </div>
      )
    },
    {
      field: 'statut', headerName: 'Statut', width: '60px', minWidth: '40px', sortable: true,
      renderCell: (row: AnyRecord) => (
        <span
          title={formatStatut(row.statut)}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${getStatutBadgeClass(row.statut)}`}
        >
          {STATUT_LETTER[row.statut] || '?'}
        </span>
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: '80px', minWidth: '70px',
      getActions: (row: AnyRecord) => [
        { label: 'Voir détails', onClick: () => handleRowClick(row) },
        {
          label: 'Annuler la vente',
          onClick: () => {
            const reason = window.prompt("Raison de l'annulation :");
            if (reason !== null && reason.trim() !== '') {
              cancelVente(row.id_vente, reason.trim());
            }
          }
        }
      ]
    }
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
              <button type="button" onClick={() => router.push('/ventes/nouvelle')}
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
          {(filters.q || filters.id_point_vente || filters.id_collaborateur.length > 0 || filters.statut || filters.date || Object.keys(columnFilters).length > 0) && (
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
                    PV: {pv.nom}<button onClick={() => { setFilters(prev => ({ ...prev, id_point_vente: '' })); clearColumnFilter('point_vente_nom') }} className="hover:text-primary-strong dark:hover:text-primary">×</button>
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
                  Statut: {formatStatut(filters.statut)}<button onClick={() => { setFilters(prev => ({ ...prev, statut: '' })); clearColumnFilter('statut') }} className="hover:text-purple-900 dark:hover:text-purple-100">×</button>
                </span>
              )}
              {filters.date && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  Période: {filters.date.dateMin} - {filters.date.dateMax}<button onClick={() => { setFilters(prev => ({ ...prev, date: null })); clearColumnFilter('date_vente') }} className="hover:text-orange-900 dark:hover:text-orange-100">×</button>
                </span>
              )}
              {Object.entries(columnFilters).map(([field, state]) => {
                if (field === 'point_vente_nom' || field === 'statut' || field === 'date_vente') return null
                return (
                  <span key={field} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {field}: {state.text || (state.select && state.select.join(', ')) || (state.numeric && `${state.numeric.min}-${state.numeric.max}`) || 'Filtre'}<button onClick={() => clearColumnFilter(field)} className="hover:text-blue-900 dark:hover:text-blue-100">×</button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ResponsiveDataTable columns={mode === 'atomique' ? atomiqueColumns : aggregeColumns}
        data={ventes.map(v => ({ ...v, id: mode === 'atomique' ? v.id_vente_article : v.id_vente }))}
        loading={ventesLoading} pagination={{ page: ventesPage, perPage: ventesLimit, total: ventesTotal }}
        onPageChange={(page: number) => fetchVentes({ page })} onPageSizeChange={(perPage: number) => fetchVentes({ page: 1, limit: perPage })}
        onRowClick={handleRowClick} onFiltersChange={handleColumnFiltersChange} />

      {detailOpen && (
        <Drawer open={detailOpen} title={mode === 'atomique' ? 'Détail de la transaction' : `Détail vente #${detailData?.id_vente || selectedRow?.id_vente || ''}`} onClose={handleCloseDetail}>
          {detailLoading ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Chargement du détail...</div>
          ) : (
            <>
              {mode === 'aggrege' && detailData && (
                <div className="space-y-4">
                  {/* En-tête vente */}
                  <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                      <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Vente #{detailData.id_vente}</h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Date</p>
                        <p className="text-slate-900 dark:text-slate-100">{detailData.date_vente ? new Date(detailData.date_vente).toLocaleString('fr-FR') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Statut</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatutBadgeClass(detailData.statut)}`}>{formatStatut(detailData.statut)}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Point de vente</p>
                        <p className="text-slate-900 dark:text-slate-100">{detailData.point_vente_nom || `PV #${detailData.id_point_vente}`}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Client</p>
                        <p className="text-slate-900 dark:text-slate-100">{detailData.client_nom || 'Client anonyme'}</p>
                      </div>
                      <div className="col-span-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Total</p>
                            <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
                              {detailData.montant_total ? `${Number(detailData.montant_total).toLocaleString('fr-FR')} Ar` : '—'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Marge</p>
                            <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                              {detailData.montant_marge ? `${Number(detailData.montant_marge).toLocaleString('fr-FR')} Ar` : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Lignes */}
                  {Array.isArray(detailData.lignes) && detailData.lignes.length > 0 && (
                    <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                        <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Lignes ({detailData.lignes.length})</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs divide-y divide-slate-100 dark:divide-slate-700">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">Produit</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">Collaborateur</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">Qté</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">Montant</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-500 dark:text-slate-400">Marge</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900/40">
                            {detailData.lignes.map((ligne: AnyRecord) => (
                              <tr key={ligne.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">{ligne.libelle_produit || `Lot #${ligne.id_lot}`}</td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{ligne.collaborateur_nom || '—'}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-slate-200">{Number(ligne.quantite_vendue).toLocaleString('fr-FR')}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-slate-200">{ligne.montant_ht ? `${Number(ligne.montant_ht).toLocaleString('fr-FR')} Ar` : '—'}</td>
                                <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{ligne.montant_marge ? `${Number(ligne.montant_marge).toLocaleString('fr-FR')} Ar` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {mode === 'atomique' && detailData && (
                <div className="space-y-4">
                  <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                      <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Vente #{detailData.id_vente}</h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Date</p>
                        <p className="text-slate-900 dark:text-slate-100">{detailData.date_vente ? new Date(detailData.date_vente).toLocaleString('fr-FR') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Statut</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatutBadgeClass(detailData.statut)}`}>{formatStatut(detailData.statut)}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Point de vente</p>
                        <p className="text-slate-900 dark:text-slate-100">{detailData.point_vente_nom || `PV #${detailData.id_point_vente}`}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Client</p>
                        <p className="text-slate-900 dark:text-slate-100">{detailData.client_nom || 'Client anonyme'}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                      <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Transaction</h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40 text-sm">
                      <div className="col-span-2">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Produit</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{detailData.libelle_produit || `Lot #${detailData.id_lot}`}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Collaborateur</p>
                        <p className="text-slate-900 dark:text-slate-100">{detailData.collaborateur_nom || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Quantité</p>
                        <p className="font-mono text-slate-900 dark:text-slate-100">{Number(detailData.quantite_vendue).toLocaleString('fr-FR')}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Montant</p>
                        <p className="font-mono text-slate-900 dark:text-slate-100">{detailData.montant_ht ? `${Number(detailData.montant_ht).toLocaleString('fr-FR')} Ar` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">Marge</p>
                        <p className="font-mono text-emerald-600 dark:text-emerald-400">{detailData.montant_marge ? `${Number(detailData.montant_marge).toLocaleString('fr-FR')} Ar` : '—'}</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </Drawer>
      )}

    </div>
  )
}

export default function VentesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement des ventes...</div>}>
      <VentesPageContent />
    </Suspense>
  )
}
