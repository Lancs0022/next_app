import React from 'react'
import { ChevronIcon } from './ChevronIcon'
import { FilterIcon, isFilterActive } from './ColumnFilterDropdown'
import { PaginationDesktop } from './DataTablePagination'
import { hideBelowClass, checkIsHeaderRow } from './clientPipeline'
import type { Column, SortConfig } from './types'
import type { FilterState } from './ColumnFilterDropdown'

interface DataTableDesktopViewProps<T extends Record<string, any>> {
  tableId: string
  columns: Column<T>[]
  processedData: T[]
  hasAnyGroup: boolean
  activeSortConfig: SortConfig
  filterStates: Record<string, FilterState>
  onSort: (field: string) => void
  onOpenFilter: (col: Column<T>, e: React.MouseEvent<HTMLButtonElement>) => void
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
  handleRowContextMenu: (e: React.MouseEvent, row: T, rowIndex: number) => void
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
  totalCount: number
  onPageChange: (page: number) => void
  rawData: T[]
}

export function DataTableDesktopView<T extends Record<string, any>>({
  tableId,
  columns,
  processedData,
  hasAnyGroup,
  activeSortConfig,
  filterStates,
  onSort,
  onOpenFilter,
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
  handleRowContextMenu,
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
  totalCount,
  onPageChange,
  rawData,
}: DataTableDesktopViewProps<T>) {
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

  const renderTreeRow = (
    row: T,
    rowIndex: number,
    depth: number = 0,
    parentKey?: string | number
  ): React.ReactNode => {
    const isHeader = checkIsHeaderRow(row, depth, isHeaderRow)
    const rowKey = computeRowKey(row, rowIndex, depth)
    const subRows = extractSubRows(row, depth)
    const canExpand = typeof canExpandRow === 'function'
      ? canExpandRow(row, depth)
      : (subRows && subRows.length > 0) || Boolean(renderExpandedRow)
    const isGroup = !isHeader && canExpand
    const expanded = isRowExpanded(rowKey)
    const customClass = rowClassName ? rowClassName(row, depth) : ''

    if (isHeader) {
      return (
        <tr
          key={`row-header-${tableId}-${parentKey ? `${parentKey}-` : ''}${rowKey}-${rowIndex}`}
          className={
            customClass ||
            'bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700 select-none text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'
          }
        >
          {hasAnyGroup && (
            <td className="w-10 px-3 py-1.5 text-center whitespace-nowrap" />
          )}
          {columns.map((column, colIdx) => (
            <td
              key={column.field}
              className={`px-6 py-1.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 ${
                column.field === 'actions' ? 'text-right' : 'text-left'
              } ${hideBelowClass(column)}`}
              style={
                colIdx === 0 && !hasAnyGroup && depth > 0
                  ? { paddingLeft: `${depth * 24 + 24}px` }
                  : undefined
              }
            >
              {column.renderCell ? column.renderCell(row, depth) : row[column.field]}
            </td>
          ))}
        </tr>
      )
    }

    const defaultClass =
      depth === 0
        ? isGroup
          ? 'bg-slate-50/75 dark:bg-slate-800/75 font-medium border-l-2 border-l-slate-300 dark:border-l-slate-600'
          : ''
        : depth === 1
        ? isGroup
          ? 'bg-slate-50/50 dark:bg-slate-800/50 font-medium'
          : 'bg-slate-50/30 dark:bg-slate-900/30'
        : 'bg-slate-100/25 dark:bg-slate-900/40 text-xs'

    return (
      <React.Fragment
        key={`row-wrap-${tableId}-${parentKey ? `${parentKey}-` : ''}${rowKey}-${rowIndex}`}
      >
        <tr
          className={`transition-colors ${customClass || defaultClass} ${
            onRowClick || onRowDoubleClick
              ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/5'
              : ''
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
              className={`px-6 py-3 whitespace-nowrap ${
                depth >= 2 ? 'text-xs' : 'text-sm'
              } text-slate-700 dark:text-slate-200 ${
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
                : column.renderCell
                ? column.renderCell(row, depth)
                : row[column.field]}
            </td>
          ))}
        </tr>

        {/* Lignes enfants dépliées */}
        {isGroup &&
          expanded &&
          (renderExpandedRow ? (
            <tr className="bg-slate-50/40 dark:bg-slate-900/40">
              <td colSpan={columns.length + (hasAnyGroup ? 1 : 0)} className="px-6 py-3">
                {renderExpandedRow(row, true, depth)}
              </td>
            </tr>
          ) : (
            subRows?.map((child, cIdx) => renderTreeRow(child, cIdx, depth + 1, rowKey))
          ))}
      </React.Fragment>
    )
  }

  return (
    <div
      data-testid={`table-desktop-${tableId}`}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {hasAnyGroup && (
                <th className="w-10 px-3 py-3 text-center" aria-label="Expansion" />
              )}
              {columns.map((column) => (
                <th
                  key={column.field}
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider ${
                    column.sortable
                      ? 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800'
                      : ''
                  } ${hideBelowClass(column)}`}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  onClick={() => column.sortable && onSort(column.field)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column.headerName}</span>
                    {column.sortable &&
                      activeSortConfig.field === column.field &&
                      activeSortConfig.direction === 'asc' && (
                        <svg
                          className="w-4 h-4 shrink-0 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    {column.sortable &&
                      activeSortConfig.field === column.field &&
                      activeSortConfig.direction === 'desc' && (
                        <svg
                          className="w-4 h-4 shrink-0 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      )}
                    {column.sortable &&
                      (activeSortConfig.field !== column.field ||
                        !activeSortConfig.direction) && (
                        <svg
                          className="w-4 h-4 shrink-0 opacity-25"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 11l5-5 5 5M7 13l5 5 5-5"
                          />
                        </svg>
                      )}
                    {column.filterable && (
                      <button
                        type="button"
                        onClick={(e) => onOpenFilter(column, e)}
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title={`Filtrer par ${column.headerName}`}
                        aria-label={`Filtrer par ${column.headerName}`}
                      >
                        <FilterIcon
                          active={
                            !!filterStates[column.field] &&
                            isFilterActive(
                              filterStates[column.field],
                              column.filterKind || 'text'
                            )
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

      <PaginationDesktop
        internalPerPage={internalPerPage}
        rowsPerPageOptions={rowsPerPageOptions}
        onPageSizeChange={onPageSizeChange}
        safePage={safePage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />

      {/* Context menu overlay */}
      {actionsMenu.open &&
        actionsMenu.x > 0 &&
        (() => {
          const row = rawData.find(
            (r, idx) => computeRowKey(r, idx) === actionsMenu.rowKey
          )
          if (!row) return null
          const actionsColumn = columns.find((col) => col.field === 'actions')
          if (!actionsColumn) return null
          const actions =
            typeof actionsColumn.getActions === 'function'
              ? actionsColumn.getActions(row) || []
              : []
          if (!actions.length) return null

          return (
            <div
              ref={actionsMenuRef as any}
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
    </div>
  )
}
