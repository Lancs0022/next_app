import type { FilterState } from './ColumnFilterDropdown'
import { isFilterActive } from './ColumnFilterDropdown'
import type { Column, SortConfig } from './types'

// ─── Helpers: visibility class ───────────────────────────────────────────────

export function hideBelowClass(col: Column): string {
  if (col.hideBelow === 'lg') return 'hidden lg:table-cell'
  if (col.hideBelow === 'md') return 'hidden md:table-cell'
  return ''
}

export function checkIsHeaderRow<T>(
  row: T,
  depth: number = 0,
  customChecker?: (row: T, depth?: number) => boolean
): boolean {
  if (customChecker) return customChecker(row, depth)
  if (!row || typeof row !== 'object') return false
  const r = row as Record<string, any>
  return Boolean(
    r._isHeader ||
      r.isHeader ||
      r._type === 'ech_header' ||
      r._type === 'header' ||
      r._type === 'sub_header' ||
      r._type === 'table_header'
  )
}

// ─── Client-side Filter Pipeline ─────────────────────────────────────────────

export function applyClientFilters<T extends Record<string, any>>(
  data: T[],
  filterStates: Record<string, FilterState>,
  columns: Column<T>[]
): T[] {
  const activeFields = Object.keys(filterStates).filter((f) => {
    const col = columns.find((c) => c.field === f)
    return isFilterActive(filterStates[f], col?.filterKind || 'text')
  })
  if (activeFields.length === 0) return data

  return data.filter((row) => {
    return activeFields.every((field) => {
      const state = filterStates[field]
      const col = columns.find((c) => c.field === field)
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

export function applyClientSort<T extends Record<string, any>>(
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
