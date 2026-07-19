'use client'

import { useEffect, useRef, useCallback } from 'react'
import api from '@/services/api'
import type { DynamicEntryModule, SyncQueueItem, SyncStatus } from '@/lib/dynamicEntry/types'
import { loadQueue, saveQueue, moveToFailedQueue } from '@/lib/dynamicEntry/storage'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { SYNC_ENDPOINTS } from '@/lib/dynamicEntry/syncEndpoints'

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
      await api.post(SYNC_ENDPOINTS[item.module], item.payload)

      dequeue(item.client_uuid)
      onSyncSuccess?.()
      return true
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string }
      const status = err?.response?.status

      if (status && status >= 400 && status < 500) {
        // Validation error: DO NOT retry indefinitely. Move to failed queue.
        moveToFailedQueue(module, item, err?.response?.data?.error || 'Erreur de validation')
        dequeue(item.client_uuid)
        onSyncError?.(err?.response?.data?.error || 'Entrée rejetée, voir les échecs de synchronisation')
        return true  // Return true to continue processing the rest of the queue
      }

      // Network / 5xx error: Keep in queue, retry on next reconnect
      onSyncError?.(err?.message || 'Erreur de synchronisation, nouvelle tentative à la reconnexion')
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
