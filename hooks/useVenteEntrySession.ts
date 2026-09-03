'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '@/services/api'
import { createClientUuid, clearSessionStorage } from '@/lib/dynamicEntry/storage'
import { useOfflineSyncQueue } from '@/hooks/useOfflineSyncQueue'
import type { SyncQueueItem } from '@/lib/dynamicEntry/types'

export interface LotRow {
  id_lot: number
  id_produit?: number
  id_collaborateur?: number
  collaborateur_nom?: string
  libelle_produit?: string
  prix_initial?: number
  marge?: number
  quantite_disponible?: number
  id_point_vente?: number
  point_vente_nom?: string
  categorie_produit?: string
  // Unité de mesure
  id_unite?: number | null
  unite_code?: string | null
  unite_label?: string | null
  est_decimal?: boolean
  precision?: number
}

export interface SelectedLine {
  id_lot: number
  id_collaborateur: number
  libelle_produit: string
  collaborateur_nom: string
  prix_initial: number
  marge: number
  quantite: string
  reduction: string
  maxQty: number
  // Unité de mesure — propagée depuis LotRow pour l'affichage des inputs
  unite_code: string
  unite_label: string
  est_decimal: boolean
  precision: number
}

export type LotSortField = 'libelle_produit' | 'collaborateur_nom' | 'prix_initial' | 'quantite_disponible'

interface VenteMeta {
  date: string
  id_pdv: string
  id_client: string
  client_uuid: string
}

interface UseVenteEntrySessionOptions {
  onSyncSuccess?: () => void
  onSyncError?: (msg: string) => void
}

export function useVenteEntrySession({ onSyncSuccess, onSyncError }: UseVenteEntrySessionOptions = {}) {
  // Stable ref so callbacks that depend on onSyncError/onSyncSuccess never
  // get a new identity just because the caller passed a new inline arrow.
  const onSyncErrorRef = useRef(onSyncError)
  const onSyncSuccessRef = useRef(onSyncSuccess)
  useEffect(() => { onSyncErrorRef.current = onSyncError }, [onSyncError])
  useEffect(() => { onSyncSuccessRef.current = onSyncSuccess }, [onSyncSuccess])

  const [meta, setMeta] = useState<VenteMeta>(() => ({
    date: '',          // vide au SSR — peuplé par useEffect côté client
    id_pdv: '',
    id_client: '',
    client_uuid: createClientUuid(),
  }))
  const [lots, setLots] = useState<LotRow[]>([])
  const [lotsLoading, setLotsLoading] = useState(false)
  const [filterCollaborateur, setFilterCollaborateur] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<LotSortField>('libelle_produit')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Record<number, SelectedLine>>({})

  const { enqueue, processQueue, hasPendingSync } = useOfflineSyncQueue({
    module: 'vente',
    onSyncSuccess: useCallback(() => onSyncSuccessRef.current?.(), []),
    onSyncError: useCallback((msg: string) => onSyncErrorRef.current?.(msg), []),
  })

  // loadLots has no dependency on onSyncError thanks to the ref — its identity
  // stays stable across renders, preventing the useEffect below from looping.
  const loadLots = useCallback(async (pvId: string): Promise<LotRow[]> => {
    if (!pvId) {
      setLots([])
      return []
    }
    setLotsLoading(true)
    try {
      const { data: res } = await api.get('/stock/lots', {
        params: { id_point_vente: pvId, limit: 500 },
      })
      const loaded = (res.data || []).filter((l: LotRow) => (l.quantite_disponible ?? 0) > 0)
      setLots(loaded)
      return loaded
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      onSyncErrorRef.current?.(err?.response?.data?.error || err?.message || 'Erreur chargement des lots')
      setLots([])
      return []
    } finally {
      setLotsLoading(false)
    }
  }, []) // no external deps — uses stable ref for error reporting

  useEffect(() => {
    if (meta.id_pdv) loadLots(meta.id_pdv)
  }, [meta.id_pdv, loadLots])

  const filteredLots = useMemo(() => {
    let result = [...lots]
    if (filterCollaborateur) {
      result = result.filter(l => String(l.id_collaborateur) === filterCollaborateur)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l =>
        (l.libelle_produit || '').toLowerCase().includes(q)
        || (l.collaborateur_nom || '').toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortField === 'libelle_produit') {
        av = (a.libelle_produit || '').toLowerCase()
        bv = (b.libelle_produit || '').toLowerCase()
      } else if (sortField === 'collaborateur_nom') {
        av = (a.collaborateur_nom || '').toLowerCase()
        bv = (b.collaborateur_nom || '').toLowerCase()
      } else if (sortField === 'prix_initial') {
        av = Number(a.prix_initial || 0)
        bv = Number(b.prix_initial || 0)
      } else {
        av = Number(a.quantite_disponible || 0)
        bv = Number(b.quantite_disponible || 0)
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [lots, filterCollaborateur, searchQuery, sortField, sortDir])

  const toggleSort = useCallback((field: LotSortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return prev
      }
      setSortDir('asc')
      return field
    })
  }, [])

  const toggleLot = useCallback((lot: LotRow) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[lot.id_lot]) {
        delete next[lot.id_lot]
      } else {
        next[lot.id_lot] = {
          id_lot: lot.id_lot,
          id_collaborateur: Number(lot.id_collaborateur || 0),
          libelle_produit: lot.libelle_produit || `Lot #${lot.id_lot}`,
          collaborateur_nom: lot.collaborateur_nom || '',
          prix_initial: Number(lot.prix_initial || 0),
          marge: Number(lot.marge || 0),
          quantite: '1',
          reduction: '0',
          maxQty: Number(lot.quantite_disponible || 0),
          unite_code: lot.unite_code || 'U',
          unite_label: lot.unite_label || 'Unité',
          est_decimal: lot.est_decimal ?? false,
          precision: lot.precision ?? 0,
        }
      }
      return next
    })
  }, [])

  const updateLine = useCallback((idLot: number, field: 'quantite' | 'reduction', value: string) => {
    setSelected(prev => {
      const line = prev[idLot]
      if (!line) return prev
      let cleaned: string
      if (field === 'quantite' && line.est_decimal) {
        // Autoriser chiffres, point et virgule (normalise en point)
        cleaned = value.replace(',', '.').replace(/[^0-9.]/g, '')
        // Empêcher plusieurs points
        const parts = cleaned.split('.')
        if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('')
        // Bloquer au-dessus du stock disponible
        const numVal = parseFloat(cleaned)
        if (!isNaN(numVal) && numVal > line.maxQty) {
          cleaned = String(line.maxQty)
        }
      } else if (field === 'quantite') {
        cleaned = value.replace(/[^0-9]/g, '')
        const numVal = parseInt(cleaned, 10)
        if (!isNaN(numVal) && numVal > line.maxQty) {
          cleaned = String(Math.floor(line.maxQty))
        }
      } else {
        cleaned = value.replace(/[^0-9]/g, '')
      }
      return { ...prev, [idLot]: { ...line, [field]: cleaned } }
    })
  }, [])

  const removeLine = useCallback((idLot: number) => {
    setSelected(prev => {
      const next = { ...prev }
      delete next[idLot]
      return next
    })
  }, [])

  const selectedLines = useMemo(() => Object.values(selected), [selected])

  const metrics = useMemo(() => {
    let totalArticles = 0
    let totalCost = 0
    let totalProfit = 0
    for (const line of selectedLines) {
      const qty = Number(line.quantite || 0)
      const reduction = Number(line.reduction || 0)
      totalArticles += qty
      totalCost += Math.max(0, qty * line.prix_initial - reduction)
      totalProfit += qty * line.marge
    }
    return { totalArticles, totalCost, totalProfit }
  }, [selectedLines])

  const validateVente = useCallback((idClientOverride?: number) => {
    if (!meta.id_pdv) {
      onSyncErrorRef.current?.('Sélectionnez un point de vente')
      return
    }
    const resolvedClientId = idClientOverride ?? Number(meta.id_client)
    if (!resolvedClientId || Number.isNaN(resolvedClientId)) {
      onSyncErrorRef.current?.('Sélectionnez un client')
      return
    }
    const validLines = selectedLines.filter(l => Number(l.quantite) > 0)
    if (validLines.length === 0) {
      onSyncErrorRef.current?.('Sélectionnez au moins un lot avec une quantité')
      return
    }

    // Vérification locale stock — le backend rejettera aussi, mais on
    // informe l'utilisateur avant d'envoyer.
    const overStock = validLines.find(l => Number(l.quantite) > l.maxQty)
    if (overStock) {
      onSyncErrorRef.current?.(
        `Quantité trop élevée pour "${overStock.libelle_produit}" : max ${overStock.maxQty} ${overStock.unite_code}`
      )
      return
    }

    const item: SyncQueueItem = {
      client_uuid: meta.client_uuid,
      module: 'vente',
      payload: {
        client_uuid: meta.client_uuid,
        header: {
          id_point_vente: Number(meta.id_pdv),
          id_client: resolvedClientId,
          date_vente: meta.date,
        },
        lines: validLines.map(l => ({
          id_lot: l.id_lot,
          id_collaborateur: l.id_collaborateur,
          quantite: Number(l.quantite),
          prix_initial: l.prix_initial,
          marge: l.marge,
          reduction: Number(l.reduction || 0),
        })),
      },
      enqueuedAt: Date.now(),
    }

    enqueue(item)
    processQueue()
    setSelected({})
    setMeta(prev => ({ ...prev, client_uuid: createClientUuid() }))
  }, [meta, selectedLines, enqueue, processQueue])

  const resetSession = useCallback(() => {
    clearSessionStorage('vente')
    setMeta({
      date: '',   // useEffect de la page reposera todayIso() au prochain cycle
      id_pdv: '',
      id_client: '',
      client_uuid: createClientUuid(),
    })
    setLots([])
    setSelected({})
    setFilterCollaborateur('')
    setSearchQuery('')
  }, [])

  const selectLotById = useCallback((lotId: string, fromLots?: LotRow[]) => {
    const id = Number(lotId)
    if (!id) return
    const list = fromLots ?? lots
    const lot = list.find(l => l.id_lot === id)
    if (lot && !selected[id]) toggleLot(lot)
  }, [lots, selected, toggleLot])

  return {
    meta,
    setMeta,
    lots: filteredLots,
    lotsLoading,
    filterCollaborateur,
    setFilterCollaborateur,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDir,
    toggleSort,
    selected,
    selectedLines,
    toggleLot,
    updateLine,
    removeLine,
    metrics,
    validateVente,
    resetSession,
    selectLotById,
    loadLots,
    hasPendingSync,
  }
}
