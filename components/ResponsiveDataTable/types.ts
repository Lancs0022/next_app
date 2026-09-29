import type { FilterState, FilterKind } from './ColumnFilterDropdown'

export interface Column<T = any> {
  field: string
  headerName: string
  sortable?: boolean
  filterable?: boolean
  filterKind?: FilterKind // defaults to 'text' if absent
  filterOptions?: string[] // required when filterKind === 'select'
  hideBelow?: 'md' | 'lg' // hides column below this breakpoint
  width?: string
  minWidth?: string
  renderCell?: (row: T, depth?: number) => React.ReactNode
  renderMobilePrimary?: (row: T, depth?: number) => React.ReactNode // main card content on mobile
  renderMobileSecondary?: (row: T, depth?: number) => React.ReactNode // secondary line on mobile card
  getActions?: (
    row: T,
    depth?: number
  ) => Array<{ label: string; onClick?: (row?: T) => void; variant?: string; disabled?: boolean }>
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
  isHeaderRow?: (row: T, depth?: number) => boolean
  canExpandRow?: (row: T, depth?: number) => boolean
}
