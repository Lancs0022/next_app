import { useCallback, useEffect, useRef, useState } from 'react'
import type { Column } from './types'

export interface UseDataTableInteractionParams<T extends Record<string, any>> {
  columns: Column<T>[]
  computeRowKey: (row: T, rowIndex: number, depth?: number) => string | number
  onRowContextMenu?: (row: T, e: React.MouseEvent) => void
}

export function useDataTableInteraction<T extends Record<string, any>>({
  columns,
  computeRowKey,
  onRowContextMenu,
}: UseDataTableInteractionParams<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [actionsMenu, setActionsMenu] = useState<{
    open: boolean
    rowKey: any
    x: number
    y: number
  }>({
    open: false,
    rowKey: null,
    x: 0,
    y: 0,
  })

  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!actionsMenu.open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!actionsMenuRef.current) return
      if (!actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenu({ open: false, rowKey: null, x: 0, y: 0 })
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [actionsMenu.open])

  const openActionsMenu = useCallback(
    (row: T, rowIndex: number, x: number, y: number) => {
      const actionsColumn = columns.find((col) => col.field === 'actions')
      if (!actionsColumn) return
      const actions =
        typeof actionsColumn.getActions === 'function' ? actionsColumn.getActions(row) || [] : []
      if (!actions.length) return
      const rowKey = computeRowKey(row, rowIndex)
      setActionsMenu({ open: true, rowKey, x, y })
    },
    [columns, computeRowKey]
  )

  const handleRowContextMenu = useCallback(
    (e: React.MouseEvent, row: T, rowIndex: number) => {
      e.preventDefault()
      if (onRowContextMenu) {
        onRowContextMenu(row, e)
        return
      }
      openActionsMenu(row, rowIndex, e.clientX, e.clientY)
    },
    [onRowContextMenu, openActionsMenu]
  )

  const handleRowTouchStart = useCallback(
    (e: React.TouchEvent, row: T, rowIndex: number) => {
      const touch = e.touches[0]
      const clientX = touch ? touch.clientX : 0
      const clientY = touch ? touch.clientY : 0
      longPressTimerRef.current = setTimeout(() => {
        if (onRowContextMenu) {
          onRowContextMenu(row, {
            clientX,
            clientY,
            preventDefault: () => {},
            stopPropagation: () => {},
          } as unknown as React.MouseEvent)
          return
        }
        openActionsMenu(row, rowIndex, clientX, clientY)
      }, 500)
    },
    [onRowContextMenu, openActionsMenu]
  )

  const handleRowTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  return {
    isMobile,
    hoveredRow,
    setHoveredRow,
    actionsMenu,
    setActionsMenu,
    actionsMenuRef,
    openActionsMenu,
    handleRowContextMenu,
    handleRowTouchStart,
    handleRowTouchEnd,
  }
}
