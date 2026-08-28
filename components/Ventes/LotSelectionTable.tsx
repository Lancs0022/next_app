'use client'

import type { LotRow, LotSortField, SelectedLine } from '@/hooks/useVenteEntrySession'
import { formatAr } from '@/lib/dynamicEntry/metrics'

interface LotSelectionTableProps {
  lots: LotRow[]
  loading?: boolean
  selected: Record<number, SelectedLine>
  sortField: LotSortField
  sortDir: 'asc' | 'desc'
  onToggleSort: (field: LotSortField) => void
  onToggleLot: (lot: LotRow) => void
}

/** Formate une quantité selon la précision de l'unité et affiche l'unité */
function fmtQty(qty: number | undefined, lot: LotRow): string {
  const val = qty ?? 0
  const precision = lot.precision ?? 0
  const formatted = precision > 0 ? val.toFixed(precision).replace(/\.?0+$/, '') : String(Math.round(val))
  const unit = lot.unite_code || ''
  return unit ? `${formatted} ${unit}` : formatted
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <svg className={`w-3 h-3 inline ml-1 ${active ? 'text-indigo-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {active && dir === 'desc'
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      }
    </svg>
  )
}

function SortableHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
  className = '',
}: {
  label: string
  field: LotSortField
  sortField: LotSortField
  sortDir: 'asc' | 'desc'
  onSort: (f: LotSortField) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`text-left font-medium text-slate-300 hover:text-white transition-colors ${className}`}
    >
      {label}
      <SortIcon active={sortField === field} dir={sortDir} />
    </button>
  )
}

export default function LotSelectionTable({
  lots,
  loading,
  selected,
  sortField,
  sortDir,
  onToggleSort,
  onToggleLot,
}: LotSelectionTableProps) {
  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-400 h-full">Chargement des lots...</div>
  }

  if (lots.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 h-full">
        Aucun lot disponible pour ce point de vente.
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Mobile cards */}
      <div className="md:hidden flex-1 overflow-auto min-h-0 space-y-2 p-3">
        {lots.map(lot => {
          const isChecked = !!selected[lot.id_lot]
          return (
            <label
              key={lot.id_lot}
              className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                isChecked ? 'border-indigo-500 bg-indigo-950/30' : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleLot(lot)}
                className="mt-1 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-medium text-slate-100 truncate">{lot.libelle_produit || `Lot #${lot.id_lot}`}</p>
                <p className="text-xs text-slate-400">{lot.collaborateur_nom || '-'}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span>{formatAr(Number(lot.prix_initial || 0))} Ar</span>
                  <span>·</span>
                  <span>Qté: {fmtQty(lot.quantite_disponible, lot)}</span>
                </div>
              </div>
            </label>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-auto flex-col">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-800 border-b border-slate-700 z-10">
            <tr>
              <th className="px-3 py-3 w-10" />
              <th className="px-3 py-3">
                <SortableHeader label="Produit" field="libelle_produit" sortField={sortField} sortDir={sortDir} onSort={onToggleSort} />
              </th>
              <th className="px-3 py-3">
                <SortableHeader label="Collaborateur" field="collaborateur_nom" sortField={sortField} sortDir={sortDir} onSort={onToggleSort} />
              </th>
              <th className="px-3 py-3 text-right">
                <SortableHeader label="Prix" field="prix_initial" sortField={sortField} sortDir={sortDir} onSort={onToggleSort} className="text-right w-full" />
              </th>
              <th className="px-3 py-3 text-right">
                <SortableHeader label="Qté dispo" field="quantite_disponible" sortField={sortField} sortDir={sortDir} onSort={onToggleSort} className="text-right w-full" />
              </th>
            </tr>
          </thead>
          <tbody>
            {lots.map(lot => {
              const isChecked = !!selected[lot.id_lot]
              return (
                <tr
                  key={lot.id_lot}
                  className={`border-b border-slate-800 transition-colors ${isChecked ? 'bg-indigo-950/20' : 'hover:bg-slate-800/40'}`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleLot(lot)}
                      className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-100">{lot.libelle_produit || `Lot #${lot.id_lot}`}</td>
                  <td className="px-3 py-3 text-slate-300">{lot.collaborateur_nom || '-'}</td>
                  <td className="px-3 py-3 text-right text-slate-200">{formatAr(Number(lot.prix_initial || 0))} Ar</td>
                  <td className="px-3 py-3 text-right text-slate-200">{fmtQty(lot.quantite_disponible, lot)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
