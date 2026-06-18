'use client'

import { useState } from 'react'

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

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  pagination = { page: 1, perPage: 25, total: 0 },
  onPageChange = () => {},
  onPageSizeChange = () => {},
  onSort = () => {},
  sortConfig = { field: '', direction: 'asc' },
  onRowClick
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
}) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const handleSort = (field: string) => {
    if (!field) return
    const newDirection = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    onSort({ field, direction: newDirection })
  }

  const rowsPerPageOptions = [10, 25, 50, 100]
  const currentPage = pagination.page || 1
  const totalPages = Math.ceil((pagination.total || 0) / (pagination.perPage || 25))

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {loading && (
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-primary animate-progress-indeterminate"></div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800' : ''
                  }`}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  onClick={() => column.sortable && handleSort(column.field)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.headerName}</span>
                    {column.sortable && sortConfig.field === column.field && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sortConfig.direction === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle dark:divide-slate-700">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/5' : ''
                } ${hoveredRow === rowIndex ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
                onMouseEnter={() => setHoveredRow(rowIndex)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {columns.map((column) => (
                  <td
                    key={column.field}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${
                      column.field === 'actions' ? 'text-right' : 'text-left'
                    }`}
                    onClick={(e) => column.field === 'actions' && e.stopPropagation()}
                  >
                    {column.renderCell ? column.renderCell(row) : row[column.field]}
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
              <option key={option} value={option}>
                {option}
              </option>
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
    </div>
  )
}

export default DataTable
