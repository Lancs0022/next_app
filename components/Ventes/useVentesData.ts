import { useCallback, useEffect, useState } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/Toast/ToastContainer'
import { getPvId } from '@/lib/pointVente'
import type { FilterState } from '@/components/ResponsiveDataTable/ColumnFilterDropdown'
import type { AnyRecord, ModeAffichage, VentesFiltersState } from './ventesTypes'

export function useVentesData() {
  const { showToast } = useToast()

  const [loadingLists, setLoadingLists] = useState(false)
  const [collaborateurs, setCollaborateurs] = useState<AnyRecord[]>([])
  const [pointsDeVente, setPointsDeVente] = useState<AnyRecord[]>([])

  const [ventes, setVentes] = useState<AnyRecord[]>([])
  const [ventesPage, setVentesPage] = useState(1)
  const [ventesLimit, setVentesLimit] = useState(20)
  const [ventesTotal, setVentesTotal] = useState(0)
  const [ventesLoading, setVentesLoading] = useState(false)

  const [mode, setMode] = useState<ModeAffichage>('atomique')
  const [columnFilters, setColumnFilters] = useState<Record<string, FilterState>>({})

  const [filters, setFilters] = useState<VentesFiltersState>({
    q: '',
    id_point_vente: '',
    id_collaborateur: [],
    statut: '',
    date: null,
  })

  const refreshLists = useCallback(async () => {
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
      showToast(
        err?.response?.data?.error || err?.message || 'Erreur chargement des listes',
        'info'
      )
    } finally {
      setLoadingLists(false)
    }
  }, [showToast])

  const fetchVentes = useCallback(
    async ({ page, limit }: { page?: number; limit?: number } = {}) => {
      setVentesLoading(true)
      try {
        const targetPage = page || ventesPage
        const targetLimit = limit || ventesLimit
        const params: AnyRecord = {
          page: targetPage,
          limit: targetLimit,
          ...(filters.q && { q: filters.q }),
          ...(filters.id_point_vente && { id_point_vente: filters.id_point_vente }),
          ...(filters.id_collaborateur.length && {
            id_collaborateur: filters.id_collaborateur.join(','),
          }),
          ...(filters.statut && { statut: filters.statut }),
          ...(filters.date?.dateMin && { dateMin: filters.date.dateMin }),
          ...(filters.date?.dateMax && { dateMax: filters.date.dateMax }),
        }
        const endpoint = mode === 'atomique' ? '/ventes/atomiques' : '/ventes'
        const { data: res } = await api.get(endpoint, { params })
        setVentes(res.data || [])
        setVentesPage(res.page || targetPage)
        setVentesLimit(res.limit || targetLimit)
        setVentesTotal(res.total || 0)
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string }
        showToast(
          err?.response?.data?.error || err?.message || 'Erreur chargement des ventes',
          'info'
        )
      } finally {
        setVentesLoading(false)
      }
    },
    [filters, ventesPage, ventesLimit, mode, showToast]
  )

  const handleColumnFiltersChange = useCallback(
    (colFilters: Record<string, FilterState>) => {
      setColumnFilters(colFilters)
      setFilters((prev) => {
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
            next.date = {
              dateMin: mon.toISOString().slice(0, 10),
              dateMax: sun.toISOString().slice(0, 10),
              mode: 'semaine',
            }
          } else if (dateF.date.preset === 'month') {
            const now = new Date()
            const first = new Date(now.getFullYear(), now.getMonth(), 1)
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            next.date = {
              dateMin: first.toISOString().slice(0, 10),
              dateMax: last.toISOString().slice(0, 10),
              mode: 'mois',
            }
          } else if (dateF.date.preset === 'custom' && (dateF.date.from || dateF.date.to)) {
            next.date = {
              dateMin: dateF.date.from,
              dateMax: dateF.date.to,
              mode: 'fourchette',
              start: dateF.date.from,
              end: dateF.date.to,
            }
          } else if ((dateF as AnyRecord).dateMin || (dateF as AnyRecord).dateMax) {
            next.date = dateF as AnyRecord
          } else {
            next.date = null
          }
        } else {
          next.date = null
        }

        // Point de vente select
        const pvF = colFilters['point_vente_nom']
        if (pvF && pvF.select && pvF.select.length > 0) {
          const matched = pointsDeVente.find((pv) => pvF.select?.includes(pv.nom))
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
    },
    [pointsDeVente]
  )

  const clearColumnFilter = useCallback(
    (field: string) => {
      const next = { ...columnFilters }
      delete next[field]
      handleColumnFiltersChange(next)
    },
    [columnFilters, handleColumnFiltersChange]
  )

  useEffect(() => {
    refreshLists()
  }, [refreshLists])

  useEffect(() => {
    fetchVentes()
  }, [filters, mode, fetchVentes])

  return {
    loadingLists,
    collaborateurs,
    pointsDeVente,
    ventes,
    ventesPage,
    setVentesPage,
    ventesLimit,
    setVentesLimit,
    ventesTotal,
    ventesLoading,
    mode,
    setMode,
    filters,
    setFilters,
    columnFilters,
    handleColumnFiltersChange,
    clearColumnFilter,
    refreshLists,
    fetchVentes,
  }
}
