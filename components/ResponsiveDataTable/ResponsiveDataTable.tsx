'use client'

import { useId } from 'react'
import { ColumnFilterDropdown, defaultFilterState } from './ColumnFilterDropdown'
import { useDataTablePipeline } from './useDataTablePipeline'
import { useDataTableInteraction } from './useDataTableInteraction'
import { DataTableDesktopView } from './DataTableDesktopView'
import { DataTableMobileView } from './DataTableMobileView'
import type { ResponsiveDataTableProps, Column, Pagination, SortConfig } from './types'

// Re-exports pour compatibilité ascendante totale
export type { Column, Pagination, SortConfig, ResponsiveDataTableProps }

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
  isHeaderRow,
  canExpandRow,
}: ResponsiveDataTableProps<T>) => {
  const generatedId = useId()
  const tableId = instanceId || generatedId

  // ─── Pipeline de données, tri, pagination et arborescence ───────────────────
  const pipeline = useDataTablePipeline({
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
    defaultExpandedAll,
    canExpandRow,
  })

  // ─── Interactions (survol, mobile, menus d'actions) ─────────────────────────
  const interaction = useDataTableInteraction({
    columns,
    computeRowKey: pipeline.computeRowKey,
    onRowContextMenu,
  })

  // ─── État de chargement ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        data-testid={`table-loading-${tableId}`}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
      >
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-primary animate-progress-indeterminate" />
        </div>
        <div className="p-8 text-center text-slate-600 dark:text-slate-400">
          Chargement...
        </div>
      </div>
    )
  }

  // ─── État vide ──────────────────────────────────────────────────────────────
  if (!data || data.length === 0 || pipeline.totalCount === 0) {
    return (
      <div
        data-testid={`table-empty-${tableId}`}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center"
      >
        <p className="text-slate-600 dark:text-slate-400">Aucune donnée disponible</p>
      </div>
    )
  }

  // ─── Rendu Mobile vs Desktop ────────────────────────────────────────────────
  return (
    <>
      {interaction.isMobile ? (
        <DataTableMobileView
          tableId={tableId}
          columns={columns}
          processedData={pipeline.processedData}
          computeRowKey={pipeline.computeRowKey}
          extractSubRows={pipeline.extractSubRows}
          isRowExpanded={pipeline.isRowExpanded}
          toggleRowExpansion={pipeline.toggleRowExpansion}
          renderExpandedRow={renderExpandedRow}
          rowClassName={rowClassName}
          expandOnRowClick={expandOnRowClick}
          isHeaderRow={isHeaderRow}
          canExpandRow={canExpandRow}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          onRowContextMenu={onRowContextMenu}
          handleRowTouchStart={interaction.handleRowTouchStart}
          handleRowTouchEnd={interaction.handleRowTouchEnd}
          hoveredRow={interaction.hoveredRow}
          setHoveredRow={interaction.setHoveredRow}
          actionsMenu={interaction.actionsMenu}
          setActionsMenu={interaction.setActionsMenu}
          actionsMenuRef={interaction.actionsMenuRef}
          internalPerPage={pipeline.internalPerPage}
          rowsPerPageOptions={pipeline.rowsPerPageOptions}
          onPageSizeChange={pipeline.handlePageSizeChange}
          safePage={pipeline.safePage}
          totalPages={pipeline.totalPages}
          onPageChange={pipeline.handlePageChange}
        />
      ) : (
        <DataTableDesktopView
          tableId={tableId}
          columns={columns}
          processedData={pipeline.processedData}
          hasAnyGroup={pipeline.hasAnyGroup}
          activeSortConfig={pipeline.activeSortConfig}
          filterStates={pipeline.filterStates}
          onSort={pipeline.handleSort}
          onOpenFilter={pipeline.openFilter}
          computeRowKey={pipeline.computeRowKey}
          extractSubRows={pipeline.extractSubRows}
          isRowExpanded={pipeline.isRowExpanded}
          toggleRowExpansion={pipeline.toggleRowExpansion}
          renderExpandedRow={renderExpandedRow}
          rowClassName={rowClassName}
          expandOnRowClick={expandOnRowClick}
          isHeaderRow={isHeaderRow}
          canExpandRow={canExpandRow}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          handleRowContextMenu={interaction.handleRowContextMenu}
          hoveredRow={interaction.hoveredRow}
          setHoveredRow={interaction.setHoveredRow}
          actionsMenu={interaction.actionsMenu}
          setActionsMenu={interaction.setActionsMenu}
          actionsMenuRef={interaction.actionsMenuRef}
          internalPerPage={pipeline.internalPerPage}
          rowsPerPageOptions={pipeline.rowsPerPageOptions}
          onPageSizeChange={pipeline.handlePageSizeChange}
          safePage={pipeline.safePage}
          totalPages={pipeline.totalPages}
          totalCount={pipeline.totalCount}
          onPageChange={pipeline.handlePageChange}
          rawData={data}
        />
      )}

      {/* Popover filtre de colonne (unique et partagé) */}
      {pipeline.filterOpen && pipeline.filterPos && (() => {
        const col = columns.find((c) => c.field === pipeline.filterOpen)
        if (!col) return null
        return (
          <ColumnFilterDropdown
            col={col}
            pos={pipeline.filterPos}
            state={pipeline.filterStates[pipeline.filterOpen] || defaultFilterState()}
            onChange={(s) =>
              pipeline.setFilterStates((prev) => ({
                ...prev,
                [pipeline.filterOpen!]: s,
              }))
            }
            onApply={pipeline.applyFilter}
            onClear={() => pipeline.clearFilter(pipeline.filterOpen!)}
            onClose={() => {
              pipeline.setFilterOpen(null)
              pipeline.setFilterPos(null)
            }}
          />
        )
      })()}
    </>
  )
}

export default ResponsiveDataTable
