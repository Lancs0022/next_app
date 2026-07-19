import type { DynamicEntryModule, SessionSnapshot, SyncQueueItem, FailedSyncItem } from './types'

const snapshotKey = (module: DynamicEntryModule) => `pejaa.dynamicEntry.${module}.snapshot`
const queueKey = (module: DynamicEntryModule) => `pejaa.dynamicEntry.${module}.queue`
const failedQueueKey = (module: DynamicEntryModule) => `pejaa.dynamicEntry.${module}.failedQueue`

export function loadSnapshot(module: DynamicEntryModule): SessionSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(snapshotKey(module))
    if (!raw) return null
    return JSON.parse(raw) as SessionSnapshot
  } catch {
    return null
  }
}

export function saveSnapshot(module: DynamicEntryModule, snapshot: SessionSnapshot): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(snapshotKey(module), JSON.stringify(snapshot))
}

export function loadQueue(module: DynamicEntryModule): SyncQueueItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(queueKey(module))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SyncQueueItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveQueue(module: DynamicEntryModule, queue: SyncQueueItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(queueKey(module), JSON.stringify(queue))
}

export function clearSessionStorage(module: DynamicEntryModule): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(snapshotKey(module))
  localStorage.removeItem(queueKey(module))
}

export function loadFailedQueue(module: DynamicEntryModule): FailedSyncItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(failedQueueKey(module))
    if (!raw) return []
    const parsed = JSON.parse(raw) as FailedSyncItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveFailedQueue(module: DynamicEntryModule, queue: FailedSyncItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(failedQueueKey(module), JSON.stringify(queue))
}

export function moveToFailedQueue(module: DynamicEntryModule, item: SyncQueueItem, reason: string): void {
  const queue = loadFailedQueue(module)
  queue.push({
    ...item,
    failedAt: Date.now(),
    reason,
  })
  saveFailedQueue(module, queue)
}

export function clearFailedItem(module: DynamicEntryModule, clientUuid: string): void {
  const queue = loadFailedQueue(module).filter(q => q.client_uuid !== clientUuid)
  saveFailedQueue(module, queue)
}

export function createClientUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function createRowId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
