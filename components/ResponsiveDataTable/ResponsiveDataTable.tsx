'use client'

import { useState, useEffect, useRef, useMemo, useId, useCallback } from 'react'
import {
  ColumnFilterDropdown,
  FilterIcon,
  defaultFilterState,
  isFilterActive,
} from './ColumnFilterDropdown'
import type { FilterState, FilterKind } from './ColumnFilterDropdown'

// ─── Column interface ─────────────────────────────────────────────────────────

export interface Column<T = any> {
  field: string
  headerName: string
  sortable?: boolean
  filterable?: boolean
  filterKind?: FilterKind            // defaults to 'text' if absent
  filterOptions?: string[]           // required when filterKind === 'select'
  hideBelow?: 'md' | 'lg'           // hides column below this breakpoint
  width?: string
  minWidth?: string
  renderCell?: (row: T, depth?: number) => React.ReactNode
  renderMobilePrimary?: (row: T, depth?: number) => React.ReactNode  // main card content on mobile
  renderMobileSecondary?: (row: T, depth?: number) => React.ReactNode // secondary line on mobile card
  getActions?: (row: T, depth?: number) => Array<{ label: string; onClick?: (row?: T) => void; variant?: string; disabled?: boolean }>
}

export interface Pagination {
  page: number
  perPage: number
  total: number
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc' | '' | string
}

export interface ResponsiveDataTableProps<T = any> {
  columns?: Column<T>[]
  data?: T[]
  loading?: boolean
  pagination?: Pagination
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  onSort?: (config: SortConfig) => void
  sortConfig?: SortConfig
  onRowClick?: (row: T) => void
  onRowDoubleClick?: (row: T) => void
  onRowContextMenu?: (row: T, e: React.MouseEvent) => void
  onFiltersChange?: (filters: Record<string, FilterState>) => void

  // ── Mode serveur / client explicite ──
  serverSide?: boolean
  instanceId?: string

  // ── Clé de ligne ──
  getRowId?: (row: T, index: number, depth?: number) => string | number

  // ── Agrégation & Expansion de lignes (Group Rows / Sub-rows) ──
  getSubRows?: (row: T, depth?: number) => T[] | undefined
  childrenField?: string
  renderExpandedRow?: (row: T, isExpanded: boolean, depth?: number) => React.ReactNode
  rowClassName?: (row: T, depth: number) => string
  expandedRowKeys?: (string | number)[]
  onExpandedChange?: (keys: (string | number)[]) => void
  defaultExpandedAll?: boolean
  expandOnRowClick?: boolean
}

// ─── Helpers: visibility class ───────────────────────────────────────────────

function hideBelowClass(col: Column): string {
  if (col.hideBelow === 'lg') return 'hidden lg:table-cell'
  if (col.hideBelow === 'md') return 'hidden md:table-cell'
  return ''
}

// ─── Client-side Filter Pipeline ─────────────────────────────────────────────

function applyClientFilters<T extends Record<string, any>>(
  data: T[],
  filterStates: Record<string, FilterState>,
  columns: Column<T>[]
): T[] {
  const activeFields = Object.keys(filterStates).filter(f => {
    const col = columns.find(c => c.field === f)
    return isFilterActive(filterStates[f], col?.filterKind || 'text')
  })
  if (activeFields.length === 0) return data

  return data.filter(row => {
    return activeFields.every(field => {
      const state = filterStates[field]
      const col = columns.find(c => c.field === field)
      const kind = col?.filterKind || 'text'
      const val = row[field]

      if (kind === 'text') {
        if (!state.text) return true
        const strVal = String(val ?? '').toLowerCase()
        return strVal.includes(state.text.toLowerCase().trim())
      }
      if (kind === 'select') {
        if (!state.select || state.select.length === 0) return true
        return state.select.includes(String(val ?? ''))
      }
      if (kind === 'numeric') {
        const num = Number(val)
        if (isNaN(num)) return false
        if (state.numeric.min !== '' && num < Number(state.numeric.min)) return false
        if (state.numeric.max !== '' && num > Number(state.numeric.max)) return false
        return true
      }
      if (kind === 'date') {
        if (!val) return false
        const d = new Date(val).getTime()
        if (isNaN(d)) return false
        if (state.date.from) {
          const from = new Date(state.date.from).getTime()
          if (!isNaN(from) && d < from) return false
        }
        if (state.date.to) {
          const to = new Date(state.date.to).getTime()
          if (!isNaN(to) && d > to) return false
        }
        return true
      }
      return true
    })
  })
}

// ─── Client-side Sort Pipeline ───────────────────────────────────────────────

function applyClientSort<T extends Record<string, any>>(
  data: T[],
  sortConfig: SortConfig
): T[] {
  if (!sortConfig.field || !sortConfig.direction) return data

  const { field, direction } = sortConfig
  const dir = direction === 'asc' ? 1 : -1

  return [...data].sort((a, b) => {
    const va = a[field]
    const vb = b[field]

    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1

    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir
    }

    if (va instanceof Date && vb instanceof Date) {
      return (va.getTime() - vb.getTime()) * dir
    }

    if (typeof va === 'string' && typeof vb === 'string') {
      const isDateA = /^\d{4}-\d{2}/.test(va)
      const isDateB = /^\d{4}-\d{2}/.test(vb)
      if (isDateA && isDateB) {
        const da = Date.parse(va)
        const db = Date.parse(vb)
        if (!isNaN(da) && !isNaN(db)) {
          return (da - db) * dir
        }
      }
      return va.localeCompare(vb, 'fr', { sensitivity: 'base', numeric: true }) * dir
    }

    return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base', numeric: true }) * dir
  })
}

// ─── Chevron SVG ─────────────────────────────────────────────────────────────

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-90 text-primary' : 'rotate-0'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

const ResponsiveDataTable = <T extends Record<string, any>>({
  columns = [],
  data = [],
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortConfig,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  onFiltersChange,
  serverSide,
  instanceId,
  getRowId,
  getSubRows,
  childrenField,
  renderExpandedRow,
  rowClassName,
  expandedRowKeys,
  onExpandedChange,
  defaultExpandedAll = false,
  expandOnRowClick = false,
}: ResponsiveDataTableProps<T>) => {
  const generatedId = useId()
  const tableId = instanceId || generatedId

  // ─── Auto-detection serverSide vs clientSide ────────────────────────────────
  // Si serverSide n'est pas précisé explicitement, on détecte si pagination.total > data.length
  // (signal typique d'une pagination serveur où data ne contient qu'une page partielle).
  const isServerSide = serverSide ?? (
    pagination?.total != null &&
    data.length > 0 &&
    pagination.total > data.length
  )

  // ─── Tri interne & synchronisation ──────────────────────────────────────────
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig>(
    sortConfig || { field: '', direction: '' }
  )

  useEffect(() => {
    if (sortConfig !== undefined) {
      setInternalSortConfig(sortConfig)
    }
  }, [sortConfig?.field, sortConfig?.direction])

  const activeSortConfig = sortConfig !== undefined ? sortConfig : internalSortConfig

  // ─── Pagination interne & synchronisation ────────────────────────────────────
  const [internalPage, setInternalPage] = useState<number>(pagination?.page || 1)
  const [internalPerPage, setInternalPerPage] = useState<number>(pagination?.perPage || 25)

  useEffect(() => {
    if (pagination?.page != null && pagination.page !== internalPage) {
      setInternalPage(pagination.page)
    }
  }, [pagination?.page])

  useEffect(() => {
    if (pagination?.perPage != null && pagination.perPage !== internalPerPage) {
      setInternalPerPage(pagination.perPage)
    }
  }, [pagination?.perPage])

  // ─── Filtres de colonne ─────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState<string | null>(null)
  const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null)
  const [filterStates, setFilterStates] = useState<Record<string, FilterState>>({})

  // ─── Expansion des lignes ───────────────────────────────────────────────────
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<string | number>>(() => new Set())

  // Clé unique pour chaque ligne, avec prise en compte du depth optionnel
  const computeRowKey = useCallback((row: T, rowIndex: number, depth: number = 0): string | number => {
    if (typeof getRowId === 'function') return getRowId(row, rowIndex, depth)
    return row?.id ??
      row?.id_paiement_abonnement ??
      row?.id_echeance_abonnement ??
      row?.id_vente_article ??
      row?.id_stock_mouvement ??
      row?.id_souscription_abonnement ??
      row?.id_abonnement ??
      row?.id_collaborateur ??
      row?.id_lot ??
      row?.id_livraison ??
      row?.id_vente ??
      row?.id_transaction_financiere ??
      row?.id_produit ??
      row?.id_article ??
      row?.id_client ??
      row?.id_fournisseur ??
      row?.id_user ??
      row?.uuid ??
      row?.key ??
      `${depth}-${rowIndex}`
  }, [getRowId])

  // Extraction des sous-lignes d'une ligne
  const extractSubRows = useCallback((row: T, depth: number = 0): T[] | undefined => {
    if (typeof getSubRows === 'function') return getSubRows(row, depth)
    if (childrenField && Array.isArray(row[childrenField])) return row[childrenField]
    if (Array.isArray(row.subRows)) return row.subRows
    if (Array.isArray(row.children)) return row.children
    return undefined
  }, [getSubRows, childrenField])

  // Initialisation defaultExpandedAll récursive
  useEffect(() => {
    if (defaultExpandedAll && data.length > 0 && expandedRowKeys === undefined) {
      const allKeys = new Set<string | number>()
      const collectKeys = (rows: T[], depth: number = 0) => {
        rows.forEach((row, idx) => {
          const key = computeRowKey(row, idx, depth)
          const sub = extractSubRows(row, depth)
          const isGroup = (sub && sub.length > 0) || Boolean(renderExpandedRow)
          if (isGroup) {
            allKeys.add(key)
            if (sub && sub.length > 0) {
              collectKeys(sub, depth + 1)
            }
          }
        })
      }
      collectKeys(data, 0)
      setInternalExpandedKeys(allKeys)
    }
  }, [defaultExpandedAll, data, computeRowKey, extractSubRows, renderExpandedRow, expandedRowKeys])

  const isRowExpanded = useCallback((key: string | number): boolean => {
    if (expandedRowKeys !== undefined) {
      return expandedRowKeys.includes(key)
    }
    return internalExpandedKeys.has(key)
  }, [expandedRowKeys, internalExpandedKeys])

  const toggleRowExpansion = useCallback((key: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (expandedRowKeys !== undefined) {
      const next = expandedRowKeys.includes(key)
        ? expandedRowKeys.filter(k => k !== key)
        : [...expandedRowKeys, key]
      onExpandedChange?.(next)
    } else {
      setInternalExpandedKeys(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    }
  }, [expandedRowKeys, onExpandedChange])

  // ─── Interaction Mobile & Menus ─────────────────────────────────────────────
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [actionsMenu, setActionsMenu] = useState<{ open: boolean; rowKey: any; x: number; y: number }>({
    open: false, rowKey: null, x: 0, y: 0
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

  // ─── Traitement des données (Pipeline Client vs Serveur) ─────────────────────
  const { processedData, totalCount, totalPages, safePage } = useMemo(() => {
    if (isServerSide) {
      const total = pagination?.total ?? data.length
      const perPage = pagination?.perPage ?? internalPerPage
      const p = pagination?.page ?? internalPage
      const tPages = Math.max(1, Math.ceil(total / perPage))
      return {
        processedData: data,
        totalCount: total,
        totalPages: tPages,
        safePage: Math.min(Math.max(1, p), tPages),
      }
    }

    // Pipeline client autonome
    const filtered = applyClientFilters(data, filterStates, columns)
    const sorted = applyClientSort(filtered, activeSortConfig)
    const total = sorted.length
    const perPage = internalPerPage
    const tPages = Math.max(1, Math.ceil(total / perPage))
    const p = Math.min(Math.max(1, internalPage), tPages)
    const startIdx = (p - 1) * perPage
    const sliced = sorted.slice(startIdx, startIdx + perPage)

    return {
      processedData: sliced,
      totalCount: total,
      totalPages: tPages,
      safePage: p,
    }
  }, [isServerSide, data, filterStates, columns, activeSortConfig, pagination?.total, pagination?.perPage, pagination?.page, internalPerPage, internalPage])

  // ─── Détection de groupes dans l'ensemble de l'arbre (AVANT tout return conditionnel) ───
  const hasAnyGroup = useMemo(() => {
    const checkGroup = (rows: T[], depth: number = 0): boolean => {
      return rows.some((r, idx) => {
        const sub = extractSubRows(r, depth)
        if ((sub && sub.length > 0) || Boolean(renderExpandedRow)) return true
        if (sub && sub.length > 0) return checkGroup(sub, depth + 1)
        return false
      })
    }
    return checkGroup(processedData, 0)
  }, [processedData, extractSubRows, renderExpandedRow])

  // ─── Gestionnaire de tri 3 états (asc -> desc -> neutre) ────────────────────
  const handleSort = (field: string) => {
    if (!field) return
    let nextConfig: SortConfig

    if (activeSortConfig.field !== field) {
      nextConfig = { field, direction: 'asc' }
    } else if (activeSortConfig.direction === 'asc') {
      nextConfig = { field, direction: 'desc' }
    } else if (activeSortConfig.direction === 'desc') {
      nextConfig = { field: '', direction: '' } // Neutre (3ème clic)
    } else {
      nextConfig = { field, direction: 'asc' }
    }

    setInternalSortConfig(nextConfig)
    onSort?.(nextConfig)

    // Réinitialisation douce de la page à 1
    if (safePage !== 1) {
      setInternalPage(1)
      onPageChange?.(1)
    }
  }

  // ─── Gestionnaire de pagination ─────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    const bounded = Math.min(Math.max(1, newPage), totalPages)
    setInternalPage(bounded)
    onPageChange?.(bounded)
  }

  const handlePageSizeChange = (newSize: number) => {
    setInternalPerPage(newSize)
    setInternalPage(1)
    onPageSizeChange?.(newSize)
    onPageChange?.(1)
  }

  // ─── Gestionnaire de filtres ────────────────────────────────────────────────
  const openFilter = (col: Column<T>, e: React.MouseEvent<HTMLButtonElement>) => {
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
    onFiltersChange?.(filterStates)
    setInternalPage(1)
    onPageChange?.(1)
    setFilterOpen(null)
    setFilterPos(null)
  }

  const clearFilter = (field: string) => {
    const next = { ...filterStates }
    delete next[field]
    setFilterStates(next)
    onFiltersChange?.(next)
    setInternalPage(1)
    onPageChange?.(1)
    setFilterOpen(null)
    setFilterPos(null)
  }

  // ─── Context menu & Actions ─────────────────────────────────────────────────
  const openActionsMenu = (row: T, rowIndex: number, x: number, y: number) => {
    const actionsColumn = columns.find(col => col.field === 'actions')
    if (!actionsColumn) return
    const actions = typeof actionsColumn.getActions === 'function' ? (actionsColumn.getActions(row) || []) : []
    if (!actions.length) return
    const rowKey = computeRowKey(row, rowIndex)
    setActionsMenu({ open: true, rowKey, x, y })
  }

  const handleRowContextMenu = (e: React.MouseEvent, row: T, rowIndex: number) => {
    e.preventDefault()
    if (onRowContextMenu) {
      onRowContextMenu(row, e)
      return
    }
    openActionsMenu(row, rowIndex, e.clientX, e.clientY)
  }

  const handleRowTouchStart = (e: React.TouchEvent, row: T, rowIndex: number) => {
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
  }

  const handleRowTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const renderActionsCell = (row: T, rowIndex: number, column: Column<T>) => {
    if (typeof column.renderCell === 'function') {
      return column.renderCell(row)
    }
    const actions = typeof column.getActions === 'function' ? (column.getActions(row) || []) : []
    if (!actions.length) return null

    const rowKey = computeRowKey(row, rowIndex)
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

  const rowsPerPageOptions = [10, 20, 25, 50, 100]

  // ─── État de chargement ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div data-testid={`table-loading-${tableId}`} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-primary animate-progress-indeterminate"></div>
        </div>
        <div className="p-8 text-center text-slate-600 dark:text-slate-400">
          Chargement...
        </div>
      </div>
    )
  }

  // ─── État vide ──────────────────────────────────────────────────────────────
  if (!data || data.length === 0 || totalCount === 0) {
    return (
      <div data-testid={`table-empty-${tableId}`} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">Aucune donnée disponible</p>
      </div>
    )
  }

  // ─── Pagination Mobile (partagée) ───────────────────────────────────────────
  const PaginationMobile = () => (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <select
          value={internalPerPage}
          onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
          className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          {rowsPerPageOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Page précédente"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-400">{safePage} / {totalPages}</span>
          <button
            type="button"
            onClick={() => handlePageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Page suivante"
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

  // ─── Vue Mobile ─────────────────────────────────────────────────────────────
  const renderMobileTreeRow = (row: T, rowIndex: number, depth: number = 0, parentKey?: string | number): React.ReactNode => {
    const rowKey = computeRowKey(row, rowIndex, depth)
    const subRows = extractSubRows(row, depth)
    const isGroup = (subRows && subRows.length > 0) || Boolean(renderExpandedRow)
    const expanded = isRowExpanded(rowKey)
    const customClass = rowClassName ? rowClassName(row, depth) : ''

    const primaryCol = columns.find(c => c.renderMobilePrimary)
    const secondaryCol = columns.find(c => c.renderMobileSecondary)
    const detailCols = columns.filter(
      col => col.field !== 'actions' && !col.renderMobilePrimary && !col.renderMobileSecondary
    )

    return (
      <div
        key={`mobile-row-${tableId}-${parentKey ? `${parentKey}-` : ''}${rowKey}-${rowIndex}`}
        className={`p-4 transition-colors ${
          depth > 0
            ? 'mt-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs'
            : isGroup ? 'bg-slate-50/50 dark:bg-slate-800/60' : ''
        } ${(onRowClick || onRowDoubleClick) ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/5' : ''} ${
          hoveredRow === rowKey ? 'bg-slate-50 dark:bg-slate-700/50' : ''
        } ${customClass}`}
        onClick={() => {
          if (expandOnRowClick && isGroup) toggleRowExpansion(rowKey)
          else onRowClick?.(row)
        }}
        onDoubleClick={() => onRowDoubleClick?.(row)}
        onContextMenu={(e) => {
          if (onRowContextMenu) {
            e.preventDefault()
            onRowContextMenu(row, e)
          }
        }}
        onTouchStart={(e) => handleRowTouchStart(e, row, rowIndex)}
        onTouchEnd={handleRowTouchEnd}
        onTouchMove={handleRowTouchEnd}
        onMouseEnter={() => setHoveredRow(rowKey)}
        onMouseLeave={() => setHoveredRow(null)}
      >
        <div className="space-y-3">
          {/* Primary + secondary + chevron toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isGroup && (
                <button
                  type="button"
                  onClick={(e) => toggleRowExpansion(rowKey, e)}
                  aria-label={expanded ? 'Replier le groupe' : 'Déplier le groupe'}
                  className="p-1 -ml-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                >
                  <ChevronIcon expanded={expanded} />
                </button>
              )}
              <div className="min-w-0 flex-1">
                {primaryCol
                  ? primaryCol.renderMobilePrimary!(row, depth)
                  : <span className="font-medium text-slate-900 dark:text-white truncate block">{row[columns[0]?.field]}</span>
                }
              </div>
            </div>
            {secondaryCol && (
              <div className="flex-none text-right">
                {secondaryCol.renderMobileSecondary!(row, depth)}
              </div>
            )}
          </div>

          {/* Detail grid */}
          {detailCols.length > 0 && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {detailCols.map(column => (
                <div key={column.field} className="flex flex-col">
                  <span className="text-xs text-slate-600 dark:text-slate-400 mb-1">{column.headerName}</span>
                  <div className="text-slate-900 dark:text-white">
                    {column.renderCell ? column.renderCell(row, depth) : row[column.field]}
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

          {/* Section Enfants dépliée (Mobile) */}
          {isGroup && expanded && (
            <div className={`mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 ${depth === 0 ? 'pl-3 border-l-2 border-primary/40' : 'pl-2 border-l border-slate-300 dark:border-slate-600'} space-y-3`}>
              {renderExpandedRow ? (
                renderExpandedRow(row, true, depth)
              ) : (
                subRows?.map((child, cIdx) => renderMobileTreeRow(child, cIdx, depth + 1, rowKey))
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div data-testid={`table-mobile-${tableId}`} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="divide-y divide-border-subtle dark:divide-slate-700">
          {processedData.map((row, rowIndex) => renderMobileTreeRow(row, rowIndex, 0))}
        </div>

        <PaginationMobile />
      </div>
    )
  }

  // ─── Vue Desktop ────────────────────────────────────────────────────────────
  const renderTreeRow = (row: T, rowIndex: number, depth: number = 0, parentKey?: string | number): React.ReactNode => {
    const rowKey = computeRowKey(row, rowIndex, depth)
    const subRows = extractSubRows(row, depth)
    const isGroup = (subRows && subRows.length > 0) || Boolean(renderExpandedRow)
    const expanded = isRowExpanded(rowKey)
    const customClass = rowClassName ? rowClassName(row, depth) : ''

    const defaultClass = depth === 0
      ? (isGroup ? 'bg-slate-50/75 dark:bg-slate-800/75 font-medium border-l-2 border-l-slate-300 dark:border-l-slate-600' : '')
      : depth === 1
        ? (isGroup ? 'bg-slate-50/50 dark:bg-slate-800/50 font-medium' : 'bg-slate-50/30 dark:bg-slate-900/30')
        : 'bg-slate-100/25 dark:bg-slate-900/40 text-xs'

    return (
      <FragmentWrapper key={`row-wrap-${tableId}-${parentKey ? `${parentKey}-` : ''}${rowKey}-${rowIndex}`}>
        {/* Ligne principale ou sous-ligne */}
        <tr
          className={`transition-colors ${customClass || defaultClass} ${
            (onRowClick || onRowDoubleClick) ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/5' : ''
          } ${hoveredRow === rowKey ? 'bg-slate-100/70 dark:bg-slate-700/60' : ''}`}
          onClick={() => {
            if (expandOnRowClick && isGroup) toggleRowExpansion(rowKey)
            else onRowClick?.(row)
          }}
          onDoubleClick={() => onRowDoubleClick?.(row)}
          onContextMenu={(e) => handleRowContextMenu(e, row, rowIndex)}
          onMouseEnter={() => setHoveredRow(rowKey)}
          onMouseLeave={() => setHoveredRow(null)}
        >
          {/* Colonne chevron si groupement présent */}
          {hasAnyGroup && (
            <td className="w-10 px-3 py-3 text-center whitespace-nowrap">
              {isGroup ? (
                <button
                  type="button"
                  onClick={(e) => toggleRowExpansion(rowKey, e)}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center justify-center"
                  style={{ marginLeft: depth > 0 ? `${depth * 10}px` : undefined }}
                  aria-label={expanded ? 'Replier' : 'Déplier'}
                >
                  <ChevronIcon expanded={expanded} />
                </button>
              ) : depth > 0 ? (
                <span
                  className="inline-block w-2.5 h-0.5 bg-slate-300 dark:bg-slate-600 align-middle -mt-1"
                  style={{ marginLeft: `${depth * 10 + 4}px` }}
                />
              ) : null}
            </td>
          )}

          {columns.map((column, colIdx) => (
            <td
              key={column.field}
              className={`px-6 py-3 whitespace-nowrap ${depth >= 2 ? 'text-xs' : 'text-sm'} text-slate-700 dark:text-slate-200 ${
                column.field === 'actions' ? 'text-right' : 'text-left'
              } ${hideBelowClass(column)}`}
              style={
                colIdx === 0 && !hasAnyGroup && depth > 0
                  ? { paddingLeft: `${depth * 24 + 24}px` }
                  : undefined
              }
              onClick={(e) => column.field === 'actions' && e.stopPropagation()}
            >
              {column.field === 'actions'
                ? renderActionsCell(row, rowIndex, column)
                : (column.renderCell ? column.renderCell(row, depth) : row[column.field])}
            </td>
          ))}
        </tr>

        {/* Lignes enfants dépliées (Desktop) */}
        {isGroup && expanded && (
          renderExpandedRow ? (
            <tr className="bg-slate-50/40 dark:bg-slate-900/40">
              <td colSpan={columns.length + (hasAnyGroup ? 1 : 0)} className="px-6 py-3">
                {renderExpandedRow(row, true, depth)}
              </td>
            </tr>
          ) : (
            subRows?.map((child, cIdx) => renderTreeRow(child, cIdx, depth + 1, rowKey))
          )
        )}
      </FragmentWrapper>
    )
  }

  return (
    <div data-testid={`table-desktop-${tableId}`} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {/* Colonne d'expansion réservée si lignes de groupe présentes */}
              {hasAnyGroup && (
                <th className="w-10 px-3 py-3 text-center" aria-label="Expansion" />
              )}
              {columns.map((column) => (
                <th
                  key={column.field}
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider ${column.sortable ? 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800' : ''} ${hideBelowClass(column)}`}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  onClick={() => column.sortable && handleSort(column.field)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column.headerName}</span>
                    {/* Indicateur de tri à 3 états */}
                    {column.sortable && activeSortConfig.field === column.field && activeSortConfig.direction === 'asc' && (
                      <svg className="w-4 h-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    {column.sortable && activeSortConfig.field === column.field && activeSortConfig.direction === 'desc' && (
                      <svg className="w-4 h-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                    {column.sortable && (activeSortConfig.field !== column.field || !activeSortConfig.direction) && (
                      <svg className="w-4 h-4 shrink-0 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5 5 5M7 13l5 5 5-5" />
                      </svg>
                    )}
                    {/* Bouton de filtre */}
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
            {processedData.map((row, rowIndex) => renderTreeRow(row, rowIndex, 0))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Lignes par page:</span>
          <select
            value={internalPerPage}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
            className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {totalCount > 0 ? ((safePage - 1) * internalPerPage) + 1 : 0}–
            {Math.min(safePage * internalPerPage, totalCount)} sur {totalCount}
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
              ({safePage} / {totalPages})
            </span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage <= 1}
              aria-label="Page précédente"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              aria-label="Page suivante"
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
        const row = data.find((r, idx) => computeRowKey(r, idx) === actionsMenu.rowKey)
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
                  a.onClick?.(row)
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

// Fragment wrapper to support key in fragment
function FragmentWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export default ResponsiveDataTable
