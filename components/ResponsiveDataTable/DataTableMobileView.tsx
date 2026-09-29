import React from 'react'
import { ChevronIcon } from './ChevronIcon'
import { PaginationMobile } from './DataTablePagination'
import { checkIsHeaderRow } from './clientPipeline'
import type { Column } from './types'

interface DataTableMobileViewProps<T extends Record<string, any>> {
  tableId: string
  columns: Column<T>[]
  processedData: T[]
  computeRowKey: (row: T, rowIndex: number, depth?: number) => string | number
  extractSubRows: (row: T, depth?: number) => T[] | undefined
  isRowExpanded: (key: string | number) => boolean
  toggleRowExpansion: (key: string | number, e?: React.MouseEvent) => void
  renderExpandedRow?: (row: T, isExpanded: boolean, depth?: number) => React.ReactNode
  rowClassName?: (row: T, depth: number) => string
  expandOnRowClick?: boolean
  isHeaderRow?: (row: T, depth?: number) => boolean
  canExpandRow?: (row: T, depth?: number) => boolean
  onRowClick?: (row: T) => void
  onRowDoubleClick?: (row: T) => void
  onRowContextMenu?: (row: T, e: React.MouseEvent) => void
  handleRowTouchStart: (e: React.TouchEvent, row: T, rowIndex: number) => void
  handleRowTouchEnd: () => void
  hoveredRow: string | number | null
  setHoveredRow: (key: string | number | null) => void
  actionsMenu: { open: boolean; rowKey: any; x: number; y: number }
  setActionsMenu: React.Dispatch<
    React.SetStateAction<{ open: boolean; rowKey: any; x: number; y: number }>
  >
  actionsMenuRef: React.RefObject<HTMLDivElement | null>
  internalPerPage: number
  rowsPerPageOptions: number[]
  onPageSizeChange: (size: number) => void
  safePage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function DataTableMobileView<T extends Record<string, any>>({
  tableId,
  columns,
  processedData,
  computeRowKey,
  extractSubRows,
  isRowExpanded,
  toggleRowExpansion,
  renderExpandedRow,
  rowClassName,
  expandOnRowClick = false,
  isHeaderRow,
  canExpandRow,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  handleRowTouchStart,
  handleRowTouchEnd,
  hoveredRow,
  setHoveredRow,
  actionsMenu,
  setActionsMenu,
  actionsMenuRef,
  internalPerPage,
  rowsPerPageOptions,
  onPageSizeChange,
  safePage,
  totalPages,
  onPageChange,
}: DataTableMobileViewProps<T>) {
  const renderActionsCell = (row: T, rowIndex: number, column: Column<T>) => {
    if (typeof column.renderCell === 'function') {
      return column.renderCell(row)
    }
    const actions =
      typeof column.getActions === 'function' ? column.getActions(row) || [] : []
    if (!actions.length) return null

    const rowKey = computeRowKey(row, rowIndex)
    const isOpen = actionsMenu.open && actionsMenu.rowKey === rowKey

    return (
      <div className="relative" ref={isOpen ? (actionsMenuRef as any) : null}>
        <button
          type="button"
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          title="Actions"
          onClick={(e) => {
            e.stopPropagation()
            setActionsMenu((prev) => ({
              open: !(prev.open && prev.rowKey === rowKey),
              rowKey,
              x: 0,
              y: 0,
            }))
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

  const renderMobileTreeRow = (
    row: T,
    rowIndex: number,
    depth: number = 0,
    parentKey?: string | number
  ): React.ReactNode => {
    if (checkIsHeaderRow(row, depth, isHeaderRow)) {
      return null
    }

    const rowKey = computeRowKey(row, rowIndex, depth)
    const subRows = extractSubRows(row, depth)
    const canExpand = typeof canExpandRow === 'function'
      ? canExpandRow(row, depth)
      : (subRows && subRows.length > 0) || Boolean(renderExpandedRow)
    const isGroup = canExpand
    const expanded = isRowExpanded(rowKey)
    const customClass = rowClassName ? rowClassName(row, depth) : ''

    const primaryCol = columns.find((c) => c.renderMobilePrimary)
    const secondaryCol = columns.find((c) => c.renderMobileSecondary)
    const detailCols = columns.filter(
      (col) =>
        col.field !== 'actions' &&
        !col.renderMobilePrimary &&
        !col.renderMobileSecondary
    )

    return (
      <div
        key={`mobile-row-${tableId}-${parentKey ? `${parentKey}-` : ''}${rowKey}-${rowIndex}`}
        className={`p-4 transition-colors ${
          depth > 0
            ? 'mt-2 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs'
            : isGroup
            ? 'bg-slate-50/50 dark:bg-slate-800/60'
            : ''
        } ${
          onRowClick || onRowDoubleClick
            ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/5'
            : ''
        } ${hoveredRow === rowKey ? 'bg-slate-50 dark:bg-slate-700/50' : ''} ${customClass}`}
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
                {primaryCol ? (
                  primaryCol.renderMobilePrimary!(row, depth)
                ) : (
                  <span className="font-medium text-slate-900 dark:text-white truncate block">
                    {row[columns[0]?.field]}
                  </span>
                )}
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
              {detailCols.map((column) => (
                <div key={column.field} className="flex flex-col">
                  <span className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    {column.headerName}
                  </span>
                  <div className="text-slate-900 dark:text-white">
                    {column.renderCell ? column.renderCell(row, depth) : row[column.field]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {columns.find((col) => col.field === 'actions') && (
            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
              {renderActionsCell(
                row,
                rowIndex,
                columns.find((col) => col.field === 'actions')!
              )}
            </div>
          )}

          {/* Section Enfants dépliée (Mobile) */}
          {isGroup && expanded && (
            <div
              className={`mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 ${
                depth === 0
                  ? 'pl-3 border-l-2 border-primary/40'
                  : 'pl-2 border-l border-slate-300 dark:border-slate-600'
              } space-y-3`}
            >
              {renderExpandedRow
                ? renderExpandedRow(row, true, depth)
                : subRows?.map((child, cIdx) =>
                    renderMobileTreeRow(child, cIdx, depth + 1, rowKey)
                  )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid={`table-mobile-${tableId}`}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <div className="divide-y divide-border-subtle dark:divide-slate-700">
        {processedData.map((row, rowIndex) => renderMobileTreeRow(row, rowIndex, 0))}
      </div>

      <PaginationMobile
        internalPerPage={internalPerPage}
        rowsPerPageOptions={rowsPerPageOptions}
        onPageSizeChange={onPageSizeChange}
        safePage={safePage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}
