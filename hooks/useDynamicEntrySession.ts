'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CollaboratorTab,
  DynamicEntryModule,
  EntryRow,
  ProductOption,
  SessionMeta,
  SessionSnapshot,
  SyncQueueItem,
  SyncStatus,
} from '@/lib/dynamicEntry/types'
import {
  clearSessionStorage,
  createClientUuid,
  createRowId,
  loadSnapshot,
  saveSnapshot,
} from '@/lib/dynamicEntry/storage'
import { useOfflineSyncQueue } from '@/hooks/useOfflineSyncQueue'

const DEBOUNCE_MS = 1500

export function createEmptyRow(): EntryRow {
  return {
    id: createRowId(),
    id_produit: '',
    prix_initial: '',
    marge: '',
    quantite: '',
    reduction: '',
    id_lot: '',
    description: '',
  }
}

const RECENT_COLLABS_KEY = 'pejaa.livraison.recentCollabs'

function loadRecentCollabIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_COLLABS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecentCollabId(collabId: string) {
  if (typeof window === 'undefined') return
  const prev = loadRecentCollabIds().filter(id => id !== collabId)
  localStorage.setItem(RECENT_COLLABS_KEY, JSON.stringify([collabId, ...prev].slice(0, 8)))
}

function clearRecentCollabIds() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(RECENT_COLLABS_KEY)
}

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildDefaultMeta(): SessionMeta {
  return {
    date: todayIso(),
    id_pdv: '',
    reference: '',
    comment: '',
    id_client: '',
  }
}

function buildDefaultTab(collab: { id_collaborateur: string | number; nom: string }): CollaboratorTab {
  return {
    id: String(collab.id_collaborateur),
    client_uuid: createClientUuid(),
    id_collaborateur: String(collab.id_collaborateur),
    nom: collab.nom,
    rows: [createEmptyRow()],
  }
}

interface UseDynamicEntrySessionOptions {
  module: DynamicEntryModule
  collaborateurs: Array<{ id_collaborateur: string | number; nom: string }>
  produitsCatalogue: ProductOption[]
  lotsDisponibles?: Array<{ id_lot: number; id_produit?: number; id_collaborateur?: number; libelle_produit?: string; quantite_disponible?: number }>
  onSyncSuccess?: () => void
  onSyncError?: (msg: string) => void
}

export function useDynamicEntrySession({
  module,
  collaborateurs,
  produitsCatalogue,
  lotsDisponibles = [],
  onSyncSuccess,
  onSyncError,
}: UseDynamicEntrySessionOptions) {
  const [meta, setMeta] = useState<SessionMeta>(buildDefaultMeta)
  const [tabs, setTabs] = useState<CollaboratorTab[]>([])
  const [activeTabId, setActiveTabId] = useState('')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { enqueue, processQueue, hasPendingSync, isOnline } = useOfflineSyncQueue({
    module,
    onSyncSuccess: () => {
      setSyncStatus(hasPendingSync() ? 'pending' : 'synced')
      onSyncSuccess?.()
    },
    onSyncError,
  })

  const initFromCollaborateurs = useCallback(() => {
    const saved = loadSnapshot(module)
    if (saved) {
      setMeta({ ...buildDefaultMeta(), ...saved.meta, date: saved.meta.date || todayIso() })
      setTabs(saved.tabs || [])
      setActiveTabId(saved.activeTabId || saved.tabs?.[0]?.id || '')
      return
    }
    setMeta(buildDefaultMeta())
    setTabs([])
    setActiveTabId('')
  }, [module])

  useEffect(() => {
    initFromCollaborateurs()
  }, [initFromCollaborateurs])

  const persistSnapshot = useCallback(() => {
    const snapshot: SessionSnapshot = {
      module,
      meta,
      activeTabId,
      tabs,
      updatedAt: Date.now(),
    }
    saveSnapshot(module, snapshot)
  }, [module, meta, activeTabId, tabs])

  const schedulePersist = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persistSnapshot()
    }, DEBOUNCE_MS)
  }, [persistSnapshot])

  useEffect(() => {
    schedulePersist()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [meta, tabs, activeTabId, schedulePersist])

  useEffect(() => {
    const updateStatus = () => {
      if (!isOnline) {
        setSyncStatus(hasPendingSync() ? 'offline' : 'offline')
      } else if (hasPendingSync()) {
        setSyncStatus('syncing')
      } else {
        setSyncStatus('synced')
      }
    }
    updateStatus()
    const interval = setInterval(updateStatus, 500)
    return () => clearInterval(interval)
  }, [hasPendingSync, isOnline])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPendingSync()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasPendingSync])

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const getProductOptionsForTab = useCallback((tabId: string): ProductOption[] => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return []
    return produitsCatalogue
      .filter(p => String(p.id_collaborateur) === String(tab.id_collaborateur))
      .map(p => ({ ...p, value: String(p.value) }))
  }, [tabs, produitsCatalogue])

  const updateRow = useCallback((rowId: string, field: keyof EntryRow, value: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId
        ? { ...tab, rows: tab.rows.map(r => r.id === rowId ? { ...r, [field]: value } : r) }
        : tab
    ))
  }, [activeTabId])

  const addRow = useCallback(() => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId
        ? { ...tab, rows: [...tab.rows, createEmptyRow()] }
        : tab
    ))
  }, [activeTabId])

  const removeRow = useCallback((rowId: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab
      const next = tab.rows.filter(r => r.id !== rowId)
      return { ...tab, rows: next.length > 0 ? next : [createEmptyRow()] }
    }))
  }, [activeTabId])

  const addCollaboratorTab = useCallback(() => {
    const used = new Set(tabs.map(t => t.id_collaborateur))
    const next = collaborateurs.find(c => !used.has(String(c.id_collaborateur)))
    if (!next) return
    const newTab = buildDefaultTab(next)
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [collaborateurs, tabs])

  const addCollaboratorById = useCallback((collabId: string) => {
    const collab = collaborateurs.find(c => String(c.id_collaborateur) === collabId)
    if (!collab) return false
    const used = new Set(tabs.map(t => t.id_collaborateur))
    if (used.has(collabId)) return false
    const newTab = buildDefaultTab(collab)
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
    saveRecentCollabId(collabId)
    return true
  }, [collaborateurs, tabs])

  const removeCollaboratorTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId)
      if (activeTabId === tabId) {
        setActiveTabId(next[0]?.id || '')
      }
      return next
    })
  }, [activeTabId])

  const buildQueueItem = useCallback((tab: CollaboratorTab): SyncQueueItem | null => {
    const validRows = tab.rows.filter(r => r.id_produit && r.quantite)
    if (validRows.length === 0 || !meta.id_pdv) return null

    if (module === 'livraison') {
      return {
        client_uuid: tab.client_uuid,
        module: 'livraison',
        id_collaborateur: Number(tab.id_collaborateur),
        id_pdv: Number(meta.id_pdv),
        date_livraison: meta.date,
        reference: meta.reference || null,
        commentaire: meta.comment || meta.commentaire || null,
        lines: validRows.map(r => ({
          id_produit: Number(r.id_produit),
          prix_initial: Number(r.prix_initial || 0),
          marge: Number(r.marge || 0),
          quantite_initiale: Number(r.quantite || 0),
          description: r.description || null,
        })),
        enqueuedAt: Date.now(),
      }
    }

    return {
      client_uuid: tab.client_uuid,
      module: 'vente',
      id_collaborateur: Number(tab.id_collaborateur),
      id_pdv: Number(meta.id_pdv),
      date_vente: meta.date,
      id_client: Number(meta.id_client || 0),
      lines: validRows.map(r => {
        const lot = lotsDisponibles.find(
          l => String(l.id_produit) === String(r.id_produit)
            && String(l.id_collaborateur) === String(tab.id_collaborateur)
        ) || lotsDisponibles.find(l => String(l.id_lot) === String(r.id_produit))
        return {
          id_lot: Number(lot?.id_lot || r.id_lot || r.id_produit),
          id_collaborateur: Number(tab.id_collaborateur),
          quantite: Number(r.quantite || 0),
          prix_initial: Number(r.prix_initial || 0),
          marge: Number(r.marge || 0),
          reduction: Number(r.reduction || 0),
        }
      }),
      enqueuedAt: Date.now(),
    }
  }, [meta, module, lotsDisponibles])

  const enqueueTab = useCallback((tab: CollaboratorTab) => {
    const item = buildQueueItem(tab)
    if (!item) return false
    enqueue(item)
    setSyncStatus('syncing')
    processQueue()
    return true
  }, [buildQueueItem, enqueue, processQueue])

  const saveAndNext = useCallback(() => {
    if (!activeTab) return
    const ok = enqueueTab(activeTab)
    if (!ok) {
      onSyncError?.('Complétez au moins une ligne valide et sélectionnez un point de vente')
      return
    }
    const idx = tabs.findIndex(t => t.id === activeTabId)
    const nextTab = tabs[idx + 1]
    if (nextTab) setActiveTabId(nextTab.id)
  }, [activeTab, activeTabId, tabs, enqueueTab, onSyncError])

  const validateSession = useCallback(() => {
    let enqueued = 0
    for (const tab of tabs) {
      if (enqueueTab(tab)) enqueued++
    }
    if (enqueued === 0) {
      onSyncError?.('Aucune ligne valide à synchroniser')
    }
  }, [tabs, enqueueTab, onSyncError])

  const resetSession = useCallback(() => {
    clearSessionStorage(module)
    clearRecentCollabIds()
    setMeta(buildDefaultMeta())
    setTabs([])
    setActiveTabId('')
    setSyncStatus('synced')
  }, [module])

  return {
    meta,
    setMeta,
    tabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    syncStatus,
    updateRow,
    addRow,
    removeRow,
    addCollaboratorTab,
    addCollaboratorById,
    removeCollaboratorTab,
    getProductOptionsForTab,
    saveAndNext,
    validateSession,
    resetSession,
    getRecentCollabIds: loadRecentCollabIds,
    hasPendingSync,
  }
}
