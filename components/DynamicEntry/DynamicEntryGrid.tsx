'use client'

import { useEffect, useMemo } from 'react'
import SelectWithTags from '@/components/SelectWithTags'
import { PlusIcon } from '@/components/icons/Icons'
import type { ColumnDef, EntryRow, ProductOption, DynamicEntryModule } from '@/lib/dynamicEntry/types'
import { computeRowTotal, formatAr } from '@/lib/dynamicEntry/metrics'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import ResizablePanel from '@/components/ResizablePanel'

interface DynamicEntryGridProps {
  rows: EntryRow[]
  columns: ColumnDef[]
  module: DynamicEntryModule
  productOptions: ProductOption[]
  onAddRow: () => void
  onRemoveRow: (rowId: string) => void
  onUpdateRow: (rowId: string, field: keyof EntryRow, value: string) => void
  onQuickAddProduct?: () => void
  disabled?: boolean
}

const COLUMN_DEFAULTS: Record<string, number> = {
  product: 220,
  prix_initial: 120,
  marge: 110,
  quantite: 88,
  reduction: 100,
  total: 110,
  action: 52,
}

const numericOnly = (value: string) => value.replace(/[^0-9]/g, '')

const alignClass = (align: ColumnDef['align']) => {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

const inputClass = (align: ColumnDef['align']) =>
  `w-full px-2 py-2 bg-transparent border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs ${alignClass(align)}`

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50"
    />
  )
}

export default function DynamicEntryGrid({
  rows,
  columns,
  module,
  productOptions,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onQuickAddProduct,
  disabled = false,
}: DynamicEntryGridProps) {
  const { getWidth, startResize } = useResizableColumns('pejaa.livraison.grid.cols', COLUMN_DEFAULTS)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        onAddRow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onAddRow])

  const displayColumns = useMemo(
    () => columns.filter(c => c.type !== 'action' || c.key === 'action'),
    [columns]
  )

  const colKeyForResize = (col: ColumnDef) => {
    if (col.type === 'product') return 'product'
    if (col.type === 'computed') return 'total'
    if (col.type === 'action') return 'action'
    return String(col.key)
  }

  const renderField = (row: EntryRow, col: ColumnDef) => {
    if (col.type === 'product') {
      return (
        <SelectWithTags
          compact
          options={productOptions}
          value={row.id_produit}
          onChange={val => onUpdateRow(row.id, 'id_produit', val)}
          showAddButton={!!onQuickAddProduct}
          onAddClick={onQuickAddProduct}
          addAriaLabel="Ajouter un produit catalogue"
          disabled={disabled}
          placeholder="Sélectionner un produit..."
        />
      )
    }
    if (col.type === 'computed') {
      return (
        <span className="text-slate-200 font-medium text-sm">
          {formatAr(computeRowTotal(row, module))} Ar
        </span>
      )
    }
    if (col.type === 'action') {
      return (
        <button
          type="button"
          onClick={() => onRemoveRow(row.id)}
          disabled={disabled}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
          title="Supprimer la ligne"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )
    }
    const fieldKey = col.key as keyof EntryRow
    return (
      <input
        type="text"
        inputMode="numeric"
        value={row[fieldKey] || ''}
        onChange={e => {
          const val = col.numeric ? numericOnly(e.target.value) : e.target.value
          onUpdateRow(row.id, fieldKey, val)
        }}
        placeholder="0"
        disabled={disabled || col.readOnly}
        className={inputClass(col.align)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 min-h-0">
      <ResizablePanel storageKey="pejaa.livraison.grid.height" defaultHeight={380} minHeight={240} maxHeight={640} className="flex-1 min-h-0">
        {/* Mobile: card layout */}
        <div className="flex-1 overflow-auto min-h-0 md:hidden p-3 space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Ligne {index + 1}</span>
              <button
                type="button"
                onClick={() => onRemoveRow(row.id)}
                disabled={disabled}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Supprimer
              </button>
            </div>
            {displayColumns.map(col => (
              <div key={`${row.id}-m-${String(col.key)}`}>
                <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">{col.header}</label>
                {renderField(row, col)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: resizable table */}
      <div className="hidden md:block flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-slate-800 border-b border-slate-700 z-10">
            <tr>
              <th className="relative px-2 py-3 text-left text-slate-300" style={{ width: 32 }}>#</th>
              {displayColumns.map((col, idx) => {
                const key = colKeyForResize(col)
                return (
                  <th
                    key={`${col.key}-${col.header}-${idx}`}
                    className={`relative px-3 py-3 text-slate-300 ${alignClass(col.align)}`}
                    style={{ width: getWidth(key) }}
                  >
                    {col.header}
                    <ResizeHandle onMouseDown={(e) => startResize(key, e.clientX)} />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <td className="px-2 py-3 text-slate-400 text-center">{index + 1}</td>
                {displayColumns.map((col, colIdx) => (
                  <td key={`${row.id}-${String(col.key)}-${colIdx}`} className="px-3 py-3 align-top">
                    {renderField(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </ResizablePanel>

      <div className="p-3 md:p-4 border-t border-slate-700 bg-slate-800 shrink-0">
        <button
          type="button"
          onClick={onAddRow}
          disabled={disabled}
          className="w-full md:w-auto px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition-colors flex items-center justify-center gap-2 border border-slate-600 disabled:opacity-50"
        >
          <PlusIcon className="w-4 h-4" />
          Ajouter une ligne (F2)
        </button>
      </div>
    </div>
  )
}
