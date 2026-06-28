'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useResizableHeight(
  storageKey: string,
  defaultHeight: number,
  minHeight: number,
  maxHeight = 800
) {
  const [height, setHeight] = useState(defaultHeight)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = Number(raw)
        if (Number.isFinite(parsed) && parsed >= minHeight) {
          setHeight(Math.min(parsed, maxHeight))
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey, minHeight, maxHeight])

  const startResize = useCallback((startY: number) => {
    const startHeight = height

    const onMove = (e: MouseEvent) => {
      const next = Math.min(maxHeight, Math.max(minHeight, startHeight + (e.clientY - startY)))
      setHeight(next)
      localStorage.setItem(storageKey, String(next))
    }

    const onUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    setIsDragging(true)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [height, minHeight, maxHeight, storageKey])

  return { height, startResize, isDragging }
}
