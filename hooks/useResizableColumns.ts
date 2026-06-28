'use client'

import { useCallback, useEffect, useState } from 'react'

export function useResizableColumns(
  storageKey: string,
  defaults: Record<string, number>
) {
  const [widths, setWidths] = useState<Record<string, number>>(defaults)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>
        setWidths(prev => ({ ...prev, ...parsed }))
      }
    } catch {
      // ignore
    }
  }, [storageKey])

  const startResize = useCallback((key: string, startX: number) => {
    const startWidth = widths[key] ?? defaults[key] ?? 100

    const onMove = (e: MouseEvent) => {
      const next = Math.max(48, startWidth + (e.clientX - startX))
      setWidths(prev => {
        const updated = { ...prev, [key]: next }
        localStorage.setItem(storageKey, JSON.stringify(updated))
        return updated
      })
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [widths, defaults, storageKey])

  const getWidth = useCallback((key: string) => widths[key] ?? defaults[key] ?? 100, [widths, defaults])

  return { getWidth, startResize }
}
