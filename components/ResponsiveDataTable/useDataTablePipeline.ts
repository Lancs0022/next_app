import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FilterState } from './ColumnFilterDropdown'
import { defaultFilterState } from './ColumnFilterDropdown'
import { applyClientFilters, applyClientSort } from './clientPipeline'
import type { Column, Pagination, SortConfig } from './types'

export interface UseDataTablePipelineParams<T extends Record<string, any>> {
  data: T[]
  columns: Column<T>[]
  pagination?: Pagination
  serverSide?: boolean
  sortConfig?: SortConfig
  onSort?: (config: SortConfig) => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  onFiltersChange?: (filters: Record<string, FilterState>) => void
  getRowId?: (row: T, index: number, depth?: number) => string | number
  getSubRows?: (row: T, depth?: number) => T[] | undefined
  childrenField?: string
  renderExpandedRow?: (row: T, isExpanded: boolean, depth?: number) => React.ReactNode
  expandedRowKeys?: (string | number)[]
  onExpandedChange?: (keys: (string | number)[]) => void
  defaultExpandedAll?: boolean
  canExpandRow?: (row: T, depth?: number) => boolean
}

export function useDataTablePipeline<T extends Record<string, any>>({
  data,
  columns,
  pagination,
  serverSide,
  sortConfig,
  onSort,
  onPageChange,
  onPageSizeChange,
  onFiltersChange,
  getRowId,
  getSubRows,
  childrenField,
  renderExpandedRow,
  expandedRowKeys,
  onExpandedChange,
  defaultExpandedAll = false,
  canExpandRow,
}: UseDataTablePipelineParams<T>) {
  // ─── Auto-detection serverSide vs clientSide ────────────────────────────────
  const isServerSide =
    serverSide ??
    (pagination?.total != null && data.length > 0 && pagination.total > data.length)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.page])

  useEffect(() => {
    if (pagination?.perPage != null && pagination.perPage !== internalPerPage) {
      setInternalPerPage(pagination.perPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.perPage])

  // ─── Filtres de colonne ─────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState<string | null>(null)
  const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null)
  const [filterStates, setFilterStates] = useState<Record<string, FilterState>>({})

  // ─── Clé unique de ligne ───────────────────────────────────────────────────
  const computeRowKey = useCallback(
    (row: T, rowIndex: number, depth: number = 0): string | number => {
      if (typeof getRowId === 'function') return getRowId(row, rowIndex, depth)
      return (
        row?.id ??
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
      )
    },
    [getRowId]
  )

  // ─── Extraction des sous-lignes ─────────────────────────────────────────────
  const extractSubRows = useCallback(
    (row: T, depth: number = 0): T[] | undefined => {
      if (typeof getSubRows === 'function') return getSubRows(row, depth)
      if (childrenField && Array.isArray(row[childrenField])) return row[childrenField]
      if (Array.isArray(row.subRows)) return row.subRows
      if (Array.isArray(row.children)) return row.children
      return undefined
    },
    [getSubRows, childrenField]
  )

  // ─── Expansion des lignes ───────────────────────────────────────────────────
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<string | number>>(
    () => new Set()
  )

  useEffect(() => {
    if (defaultExpandedAll && data.length > 0 && expandedRowKeys === undefined) {
      const allKeys = new Set<string | number>()
      const collectKeys = (rows: T[], depth: number = 0) => {
        rows.forEach((row, idx) => {
          const key = computeRowKey(row, idx, depth)
          const sub = extractSubRows(row, depth)
          const canExpand = typeof canExpandRow === 'function'
            ? canExpandRow(row, depth)
            : (sub && sub.length > 0) || Boolean(renderExpandedRow)
          const isGroup = canExpand
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
  }, [defaultExpandedAll, data, computeRowKey, extractSubRows, renderExpandedRow, expandedRowKeys, canExpandRow])

  const isRowExpanded = useCallback(
    (key: string | number): boolean => {
      if (expandedRowKeys !== undefined) {
        return expandedRowKeys.includes(key)
      }
      return internalExpandedKeys.has(key)
    },
    [expandedRowKeys, internalExpandedKeys]
  )

  const toggleRowExpansion = useCallback(
    (key: string | number, e?: React.MouseEvent) => {
      if (e) e.stopPropagation()
      if (expandedRowKeys !== undefined) {
        const next = expandedRowKeys.includes(key)
          ? expandedRowKeys.filter((k) => k !== key)
          : [...expandedRowKeys, key]
        onExpandedChange?.(next)
      } else {
        setInternalExpandedKeys((prev) => {
          const next = new Set(prev)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
      }
    },
    [expandedRowKeys, onExpandedChange]
  )

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
  }, [
    isServerSide,
    data,
    filterStates,
    columns,
    activeSortConfig,
    pagination?.total,
    pagination?.perPage,
    pagination?.page,
    internalPerPage,
    internalPage,
  ])

  // ─── Détection de groupes dans l'ensemble de l'arbre ────────────────────────
  const hasAnyGroup = useMemo(() => {
    const checkGroup = (rows: T[], depth: number = 0): boolean => {
      return rows.some((r) => {
        const sub = extractSubRows(r, depth)
        const canExpand = typeof canExpandRow === 'function'
          ? canExpandRow(r, depth)
          : (sub && sub.length > 0) || Boolean(renderExpandedRow)
        if (canExpand) return true
        if (sub && sub.length > 0) return checkGroup(sub, depth + 1)
        return false
      })
    }
    return checkGroup(processedData, 0)
  }, [processedData, extractSubRows, renderExpandedRow, canExpandRow])

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

  // ─── Gestionnaires de pagination ────────────────────────────────────────────
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

  // ─── Gestionnaires de filtres ───────────────────────────────────────────────
  const openFilter = (col: Column<T>, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (filterOpen === col.field) {
      setFilterOpen(null)
      setFilterPos(null)
      return
    }
    if (!filterStates[col.field]) {
      setFilterStates((prev) => ({ ...prev, [col.field]: defaultFilterState() }))
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

  const rowsPerPageOptions = [10, 20, 25, 50, 100]

  return {
    isServerSide,
    activeSortConfig,
    handleSort,
    internalPerPage,
    rowsPerPageOptions,
    safePage,
    totalPages,
    totalCount,
    handlePageChange,
    handlePageSizeChange,
    processedData,
    hasAnyGroup,
    computeRowKey,
    extractSubRows,
    isRowExpanded,
    toggleRowExpansion,
    filterOpen,
    filterPos,
    filterStates,
    setFilterStates,
    setFilterOpen,
    setFilterPos,
    openFilter,
    applyFilter,
    clearFilter,
  }
}
