'use client'

import { useState, useEffect, useRef } from 'react'

interface Column {
  field: string
  headerName: string
  sortable?: boolean
  filterable?: boolean
  width?: string
  minWidth?: string
  renderCell?: (row: any) => React.ReactNode
  getActions?: (row: any) => Array<{ label: string; onClick?: (row?: any) => void; variant?: string; disabled?: boolean }>
}

interface Pagination {
  page: number
  perPage: number
  total: number
}

interface SortConfig {
  field: string
  direction: string
}

const ResponsiveDataTable = ({
  columns = [],
  data = [],
  loading = false,
  pagination = { page: 1, perPage: 25, total: 0 },
  onPageChange = () => {},
  onPageSizeChange = () => {},
  onSort = () => {},
  sortConfig,
  onRowClick,
  filters = {},
  onFiltersChange = () => {}
}: {
  columns?: Column[]
  data?: any[]
  loading?: boolean
  pagination?: Pagination
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  onSort?: (config: SortConfig) => void
  sortConfig?: SortConfig
  onRowClick?: (row: any) => void
  filters?: Record<string, string>
  onFiltersChange?: (filters: Record<string, string>) => void
}) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const normalizedSortConfig = sortConfig || { field: '', direction: 'asc' }

  const [actionsMenu, setActionsMenu] = useState<{ open: boolean; rowKey: any; x: number; y: number }>({ open: false, rowKey: null, x: 0, y: 0 })
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

  const getRowKey = (row: any, rowIndex: number) => row?.id ?? row?.id_livraison ?? rowIndex

  const openActionsMenu = (row: any, rowIndex: number, x: number, y: number) => {
    const actionsColumn = columns.find(col => col.field === 'actions')
    if (!actionsColumn) return
    const actions = typeof actionsColumn.getActions === 'function' ? (actionsColumn.getActions(row) || []) : []
    if (!actions.length) return
    const rowKey = getRowKey(row, rowIndex)
    setActionsMenu({ open: true, rowKey, x, y })
  }

  const handleRowContextMenu = (e: React.MouseEvent, row: any, rowIndex: number) => {
    e.preventDefault()
    openActionsMenu(row, rowIndex, e.clientX, e.clientY)
  }

  const handleRowTouchStart = (e: React.TouchEvent, row: any, rowIndex: number) => {
    longPressTimerRef.current = setTimeout(() => {
      const touch = e.touches[0]
      openActionsMenu(row, rowIndex, touch.clientX, touch.clientY)
    }, 500)
  }

  const handleRowTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const renderActionsCell = (row: any, rowIndex: number, column: Column) => {
    if (typeof column.renderCell === 'function') {
      return column.renderCell(row)
    }
    const actions = typeof column.getActions === 'function' ? (column.getActions(row) || []) : []
    if (!actions.length) return null

    const rowKey = getRowKey(row, rowIndex)
    const isOpen = actionsMenu.open && actionsMenu.rowKey === rowKey

    return (
      <div className="relative" ref={isOpen ? actionsMenuRef : null}>
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          title="Actions"
          onClick={(e) => {
            e.stopPropagation()
            setActionsMenu(prev => ({ open: !(prev.open && prev.rowKey === rowKey), rowKey, x: 0, y: 0 }))
          }}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {isOpen && actionsMenu.x === 0 && (
          <div className="absolute right-0 mt-2 w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-20 overflow-hidden">
            {actions.map((a, idx) => (
              <button
                key={idx}
                type="button"
                disabled={a.disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  setActionsMenu({ open: false, rowKey: null, x: 0, y: 0 })
                  a.onClick?.(row)
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  a.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const handleSort = (field: string) => {
    if (!field) return
    if (normalizedSortConfig.field !== field) {
      onSort({ field, direction: 'asc' })
    } else if (normalizedSortConfig.direction === 'asc') {
      onSort({ field, direction: 'desc' })
    } else {
      onSort({ field: '', direction: '' })
    }
  }

  const rowsPerPageOptions = [10, 20, 25, 50, 100]
  const currentPage = pagination.page || 1
  const totalPages = Math.ceil((pagination.total || 0) / (pagination.perPage || 25))

  const [localFilters, setLocalFilters] = useState<Record<string, string>>(filters)

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-primary animate-progress-indeterminate"></div>
        </div>
        <div className="p-8 text-center text-slate-600 dark:text-slate-400">
          Chargement...
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">Aucune donnée disponible</p>
      </div>
    )
  }

  // Mobile view - Cards
  if (isMobile) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="space-y-3">
            {columns.filter(col => col.filterable).slice(0, 2).map(column => (
              <div key={column.field}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{column.headerName}</label>
                <input
                  type="text"
                  value={localFilters[column.field] || ''}
                  onChange={(e) => handleFilterChange(column.field, e.target.value)}
                  placeholder={`Filtrer par ${column.headerName}`}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {data.map((row, rowIndex) => (
            <div
              key={row.id || rowIndex}
              className={`p-4 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''} ${hoveredRow === rowIndex ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
              onTouchStart={(e) => handleRowTouchStart(e, row, rowIndex)}
              onTouchEnd={handleRowTouchEnd}
              onTouchMove={handleRowTouchEnd}
              onMouseEnter={() => setHoveredRow(rowIndex)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-semibold">
                      {row.nom?.[0]}{row.prenom?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{row.nom} {row.prenom}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{row.email}</p>
                    </div>
                  </div>
                  {row.statut && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.statut === 'actif' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400'}`}>
                      {row.statut}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {columns.filter(col => col.field !== 'nom' && col.field !== 'prenom' && col.field !== 'actions').map(column => (
                    <div key={column.field} className="flex flex-col">
                      <span className="text-xs text-slate-600 dark:text-slate-400 mb-1">{column.headerName}</span>
                      <div className="text-slate-900 dark:text-white">
                        {column.renderCell ? column.renderCell(row) : row[column.field]}
                      </div>
                    </div>
                  ))}
                </div>

                {columns.find(col => col.field === 'actions') && (
                  <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                    {renderActionsCell(row, rowIndex, columns.find(col => col.field === 'actions')!)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <select
              value={pagination.perPage}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs text-slate-600 dark:text-slate-400">{currentPage} / {totalPages}</span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop view - Table
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-3">
          {columns.filter(col => col.filterable).slice(0, 4).map(column => (
            <div key={column.field} className="flex-1 min-w-0">
              <input
                type="text"
                value={localFilters[column.field] || ''}
                onChange={(e) => handleFilterChange(column.field, e.target.value)}
                placeholder={`Filtrer par ${column.headerName}`}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider ${column.sortable ? 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  onClick={() => column.sortable && handleSort(column.field)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.headerName}</span>
                    {column.sortable && normalizedSortConfig.field === column.field && normalizedSortConfig.direction === 'asc' && (
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    {column.sortable && normalizedSortConfig.field === column.field && normalizedSortConfig.direction === 'desc' && (
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                    {column.sortable && normalizedSortConfig.field !== column.field && (
                      <svg className="w-4 h-4 shrink-0 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5 5 5M7 13l5 5 5-5" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''} ${hoveredRow === rowIndex ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
                onContextMenu={(e) => handleRowContextMenu(e, row, rowIndex)}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {columns.map((column) => (
                  <td
                    key={column.field}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200 ${column.field === 'actions' ? 'text-right' : 'text-left'}`}
                    onClick={(e) => column.field === 'actions' && e.stopPropagation()}
                  >
                    {column.field === 'actions'
                      ? renderActionsCell(row, rowIndex, column)
                      : (column.renderCell ? column.renderCell(row) : row[column.field])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Lignes par page:</span>
          <select
            value={pagination.perPage}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {((currentPage - 1) * pagination.perPage) + 1}–
            {Math.min(currentPage * pagination.perPage, pagination.total)} sur {pagination.total}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menu contextuel global (clic droit / appui long) */}
      {actionsMenu.open && actionsMenu.x > 0 && (() => {
        const row = data.find((r, idx) => getRowKey(r, idx) === actionsMenu.rowKey)
        if (!row) return null
        const actionsColumn = columns.find(col => col.field === 'actions')
        if (!actionsColumn) return null
        const actions = typeof actionsColumn.getActions === 'function' ? (actionsColumn.getActions(row) || []) : []
        if (!actions.length) return null

        return (
          <div
            ref={actionsMenuRef}
            className="fixed w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-50 overflow-hidden"
            style={{ left: `${actionsMenu.x}px`, top: `${actionsMenu.y}px` }}
          >
            {actions.map((a, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActionsMenu({ open: false, rowKey: null, x: 0, y: 0 })
                  a.onClick && a.onClick()
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

export default ResponsiveDataTable
