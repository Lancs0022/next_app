'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import DateRangeFilter from '@/components/DateRangeFilter'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterKind = 'date' | 'numeric' | 'select' | 'text'

export interface FilterState {
  date: {
    preset: 'today' | 'week' | 'month' | 'custom' | ''
    from: string
    to: string
  }
  numeric: {
    min: string
    max: string
  }
  select: string[]
  text: string
}

export function defaultFilterState(): FilterState {
  return {
    date: { preset: '', from: '', to: '' },
    numeric: { min: '', max: '' },
    select: [],
    text: '',
  }
}

export function isFilterActive(state: FilterState, kind: FilterKind): boolean {
  if (kind === 'date') return !!(state.date.preset || state.date.from || state.date.to)
  if (kind === 'numeric') return !!(state.numeric.min || state.numeric.max)
  if (kind === 'select') return state.select.length > 0
  if (kind === 'text') return state.text.trim().length > 0
  return false
}

// ─── Column interface (re-exported for use in ResponsiveDataTable) ────────────

export interface ColumnFilterDef {
  field: string
  headerName: string
  filterKind?: FilterKind
  filterOptions?: string[]
}

// ─── FilterIcon ───────────────────────────────────────────────────────────────

export function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      className={`transition-colors ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
    >
      <path d="M1 2h9M3 5.5h5M5 9h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// ─── Sub-filters ──────────────────────────────────────────────────────────────

function DateFilter({
  state,
  onChange,
}: {
  state: FilterState
  onChange: (s: FilterState) => void
}) {
  const presets: Array<{ value: FilterState['date']['preset']; label: string }> = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'custom', label: 'Personnalisé' },
  ]

  const setDate = (patch: Partial<FilterState['date']>) =>
    onChange({ ...state, date: { ...state.date, ...patch } })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setDate({ preset: p.value, from: '', to: '' })}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              state.date.preset === p.value
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {state.date.preset === 'custom' && (
        <div className="space-y-1.5">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Du</label>
            <input
              type="date"
              value={state.date.from}
              onChange={(e) => setDate({ from: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Au</label>
            <input
              type="date"
              value={state.date.to}
              onChange={(e) => setDate({ to: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function NumericFilter({
  state,
  onChange,
}: {
  state: FilterState
  onChange: (s: FilterState) => void
}) {
  const setNum = (patch: Partial<FilterState['numeric']>) =>
    onChange({ ...state, numeric: { ...state.numeric, ...patch } })

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1">
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Min</label>
        <input
          type="number"
          value={state.numeric.min}
          onChange={(e) => setNum({ min: e.target.value })}
          placeholder="0"
          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
        />
      </div>
      <span className="text-slate-400 mt-4">–</span>
      <div className="flex-1">
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Max</label>
        <input
          type="number"
          value={state.numeric.max}
          onChange={(e) => setNum({ max: e.target.value })}
          placeholder="∞"
          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
        />
      </div>
    </div>
  )
}

function SelectFilter({
  state,
  options,
  onChange,
}: {
  state: FilterState
  options: string[]
  onChange: (s: FilterState) => void
}) {
  const toggle = (opt: string) => {
    const next = state.select.includes(opt)
      ? state.select.filter((v) => v !== opt)
      : [...state.select, opt]
    onChange({ ...state, select: next })
  }

  return (
    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={state.select.includes(opt)}
            onChange={() => toggle(opt)}
            className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
          />
          <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white truncate">
            {opt}
          </span>
        </label>
      ))}
      {options.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Aucune option disponible</p>
      )}
    </div>
  )
}

function TextFilter({
  state,
  onChange,
}: {
  state: FilterState
  onChange: (s: FilterState) => void
}) {
  return (
    <input
      type="text"
      value={state.text}
      onChange={(e) => onChange({ ...state, text: e.target.value })}
      placeholder="Rechercher…"
      className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
    />
  )
}

// ─── Main dropdown ────────────────────────────────────────────────────────────

interface ColumnFilterDropdownProps {
  col: ColumnFilterDef
  pos: { top: number; left: number }
  state: FilterState
  onChange: (s: FilterState) => void
  onApply: () => void
  onClear: () => void
  onClose: () => void
}

export function ColumnFilterDropdown({
  col,
  pos,
  state,
  onChange,
  onApply,
  onClear,
  onClose,
}: ColumnFilterDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const kind: FilterKind = col.filterKind || 'text'
  const active = isFilterActive(state, kind)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const content = (
    <div
      ref={ref}
      className="fixed z-[1200] w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-3 px-3 space-y-3"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
          {col.headerName}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Fermer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filter body */}
      {kind === 'date' && (
        <DateRangeFilter
          value={state.date as any}
          onChange={(v) => {
            onChange({ ...state, date: (v || { preset: '', from: '', to: '' }) as any })
            if (v) onApply()
          }}
          open={true}
          onOpenChange={(v) => { if (!v) onClose() }}
          hideTrigger
          hideTargetSelect
          defaultTarget={col.field}
        />
      )}
      {kind === 'numeric' && <NumericFilter state={state} onChange={onChange} />}
      {kind === 'select' && (
        <SelectFilter state={state} options={col.filterOptions || []} onChange={onChange} />
      )}
      {kind === 'text' && <TextFilter state={state} onChange={onChange} />}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="flex-1 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Effacer
          </button>
        )}
        <button
          type="button"
          onClick={onApply}
          className="flex-1 px-2 py-1 text-xs font-medium rounded bg-primary hover:bg-primary-strong text-white transition-colors"
        >
          Appliquer
        </button>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
