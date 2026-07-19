'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ColumnFilterDropdown,
  FilterIcon,
  defaultFilterState,
  isFilterActive,
} from './ColumnFilterDropdown'
import type { FilterState, FilterKind } from './ColumnFilterDropdown'

// ─── Column interface ─────────────────────────────────────────────────────────

interface Column {
  field: string
  headerName: string
  sortable?: boolean
  filterable?: boolean
  filterKind?: FilterKind            // defaults to 'text' if absent
  filterOptions?: string[]           // required when filterKind === 'select'
  hideBelow?: 'md' | 'lg'           // hides column below this breakpoint
  width?: string
  minWidth?: string
  renderCell?: (row: any) => React.ReactNode
  renderMobilePrimary?: (row: any) => React.ReactNode  // main card content on mobile
  renderMobileSecondary?: (row: any) => React.ReactNode // secondary line on mobile card
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

// ─── Helper: column visibility class ─────────────────────────────────────────

function hideBelowClass(col: Column): string {
  if (col.hideBelow === 'lg') return 'hidden lg:table-cell'
  if (col.hideBelow === 'md') return 'hidden md:table-cell'
  return ''
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  onFiltersChange?: (filters: Record<string, FilterState>) => void
}) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const normalizedSortConfig = sortConfig || { field: '', direction: 'asc' }

  const [actionsMenu, setActionsMenu] = useState<{ open: boolean; rowKey: any; x: number; y: number }>({ open: false, rowKey: null, x: 0, y: 0 })
  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Column filter state ────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState<string | null>(null)
  const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null)
  const [filterStates, setFilterStates] = useState<Record<string, FilterState>>({})

  const openFilter = (col: Column, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (filterOpen === col.field) {
      setFilterOpen(null)
      setFilterPos(null)
      return
    }
    if (!filterStates[col.field]) {
      setFilterStates(prev => ({ ...prev, [col.field]: defaultFilterState() }))
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterOpen(col.field)
    setFilterPos({ top: rect.bottom + 6, left: rect.left })
  }

  const applyFilter = () => {
    onFiltersChange(filterStates)
    setFilterOpen(null)
    setFilterPos(null)
  }

  const clearFilter = (field: string) => {
    const next = { ...filterStates }
    delete next[field]
    setFilterStates(next)
    onFiltersChange(next)
    setFilterOpen(null)
    setFilterPos(null)
  }

  // ─── Mobile detection ───────────────────────────────────────────────────────

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
                    : 'text-slate-700 dark:text-slate-200 hover:bg-primary/5 dark:hover:bg-primary/5'
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

  // ─── Loading / empty states ─────────────────────────────────────────────────

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

  // ─── Pagination footer (shared) ─────────────────────────────────────────────

  const PaginationMobile = () => (
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
  )

  // ─── Mobile view ────────────────────────────────────────────────────────────

  if (isMobile) {
    const primaryCol = columns.find(c => c.renderMobilePrimary)
    const secondaryCol = columns.find(c => c.renderMobileSecondary)
    const detailCols = columns.filter(
      col => col.field !== 'actions' && !col.renderMobilePrimary && !col.renderMobileSecondary
    )

    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="divide-y divide-border-subtle dark:divide-slate-700">
          {data.map((row, rowIndex) => (
            <div
              key={`row-${row.id ?? 'idx'}-${rowIndex}`}
              className={`p-4 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/5' : ''} ${hoveredRow === rowIndex ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
              onTouchStart={(e) => handleRowTouchStart(e, row, rowIndex)}
              onTouchEnd={handleRowTouchEnd}
              onTouchMove={handleRowTouchEnd}
              onMouseEnter={() => setHoveredRow(rowIndex)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div className="space-y-3">
                {/* Primary + secondary */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {primaryCol
                      ? primaryCol.renderMobilePrimary!(row)
                      : <span className="font-medium text-slate-900 dark:text-white truncate block">{row[columns[0]?.field]}</span>
                    }
                  </div>
                  {secondaryCol && (
                    <div className="flex-none text-right">
                      {secondaryCol.renderMobileSecondary!(row)}
                    </div>
                  )}
                </div>

                {/* Detail grid — exclude primary/secondary/actions columns */}
                {detailCols.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {detailCols.map(column => (
                      <div key={column.field} className="flex flex-col">
                        <span className="text-xs text-slate-600 dark:text-slate-400 mb-1">{column.headerName}</span>
                        <div className="text-slate-900 dark:text-white">
                          {column.renderCell ? column.renderCell(row) : row[column.field]}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {columns.find(col => col.field === 'actions') && (
                  <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                    {renderActionsCell(row, rowIndex, columns.find(col => col.field === 'actions')!)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <PaginationMobile />
      </div>
    )
  }

  // ─── Desktop view ───────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider ${column.sortable ? 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800' : ''} ${hideBelowClass(column)}`}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  onClick={() => column.sortable && handleSort(column.field)}
                >
                  <div className="flex items-center gap-1.5">
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
                    {/* Filter button */}
                    {column.filterable && (
                      <button
                        type="button"
                        onClick={(e) => openFilter(column, e)}
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title={`Filtrer par ${column.headerName}`}
                        aria-label={`Filtrer par ${column.headerName}`}
                      >
                        <FilterIcon
                          active={
                            !!filterStates[column.field] &&
                            isFilterActive(filterStates[column.field], column.filterKind || 'text')
                          }
                        />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle dark:divide-slate-700">
            {data.map((row, rowIndex) => (
              <tr
                key={`row-${row.id ?? 'idx'}-${rowIndex}`}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/5' : ''} ${hoveredRow === rowIndex ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
                onContextMenu={(e) => handleRowContextMenu(e, row, rowIndex)}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {columns.map((column) => (
                  <td
                    key={column.field}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200 ${column.field === 'actions' ? 'text-right' : 'text-left'} ${hideBelowClass(column)}`}
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

      {/* Pagination */}
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

      {/* Context menu (right-click / long-press) */}
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

      {/* Column filter dropdown (single shared instance) */}
      {filterOpen && filterPos && (() => {
        const col = columns.find(c => c.field === filterOpen)
        if (!col) return null
        return (
          <ColumnFilterDropdown
            col={col}
            pos={filterPos}
            state={filterStates[filterOpen] || defaultFilterState()}
            onChange={s => setFilterStates(prev => ({ ...prev, [filterOpen]: s }))}
            onApply={applyFilter}
            onClear={() => clearFilter(filterOpen)}
            onClose={() => { setFilterOpen(null); setFilterPos(null) }}
          />
        )
      })()}
    </div>
  )
}

export default ResponsiveDataTable
