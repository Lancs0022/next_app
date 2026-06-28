'use client'

import { useEffect, useRef, useCallback } from 'react'
import api from '@/services/api'
import type { DynamicEntryModule, SyncQueueItem, SyncStatus } from '@/lib/dynamicEntry/types'
import { loadQueue, saveQueue } from '@/lib/dynamicEntry/storage'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

interface UseOfflineSyncQueueOptions {
  module: DynamicEntryModule
  onSyncSuccess?: () => void
  onSyncError?: (error: string) => void
}

export function useOfflineSyncQueue({
  module,
  onSyncSuccess,
  onSyncError,
}: UseOfflineSyncQueueOptions) {
  const isOnline = useOnlineStatus()
  const processingRef = useRef(false)
  const statusRef = useRef<SyncStatus>('synced')

  const getQueue = useCallback(() => loadQueue(module), [module])

  const getSyncStatus = useCallback((): SyncStatus => {
    const queue = loadQueue(module)
    if (!isOnline) return queue.length > 0 ? 'offline' : 'offline'
    if (processingRef.current) return 'syncing'
    if (queue.length > 0) return 'pending'
    return 'synced'
  }, [module, isOnline])

  const enqueue = useCallback((item: SyncQueueItem) => {
    const queue = loadQueue(module)
    const existing = queue.findIndex(q => q.client_uuid === item.client_uuid)
    if (existing >= 0) {
      queue[existing] = item
    } else {
      queue.push(item)
    }
    saveQueue(module, queue)
  }, [module])

  const dequeue = useCallback((clientUuid: string) => {
    const queue = loadQueue(module).filter(q => q.client_uuid !== clientUuid)
    saveQueue(module, queue)
  }, [module])

  const processOne = useCallback(async (): Promise<boolean> => {
    if (processingRef.current || !isOnline) return false

    const queue = loadQueue(module)
    if (queue.length === 0) return false

    const item = queue[0]
    processingRef.current = true

    try {
      if (item.module === 'livraison') {
        await api.post('/livraisons', {
          client_uuid: item.client_uuid,
          id_collaborateur: item.id_collaborateur,
          id_pdv: item.id_pdv,
          date_livraison: item.date_livraison,
          reference: item.reference,
          commentaire: item.commentaire,
          lines: item.lines,
        })
      } else {
        await api.post('/ventes/directe', {
          client_uuid: item.client_uuid,
          header: {
            id_point_vente: item.id_pdv,
            id_client: item.id_client,
            date_vente: item.date_vente,
          },
          lines: item.lines,
        })
      }

      dequeue(item.client_uuid)
      onSyncSuccess?.()
      return true
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      onSyncError?.(err?.response?.data?.error || err?.message || 'Erreur de synchronisation')
      return false
    } finally {
      processingRef.current = false
    }
  }, [module, isOnline, dequeue, onSyncSuccess, onSyncError])

  const processQueue = useCallback(async () => {
    let processed = true
    while (processed && isOnline) {
      processed = await processOne()
    }
  }, [processOne, isOnline])

  useEffect(() => {
    if (isOnline && loadQueue(module).length > 0) {
      processQueue()
    }
  }, [isOnline, module, processQueue])

  const hasPendingSync = useCallback(() => loadQueue(module).length > 0, [module])

  return {
    enqueue,
    dequeue,
    getQueue,
    processQueue,
    getSyncStatus,
    hasPendingSync,
    isOnline,
    syncStatus: getSyncStatus(),
  }
}
