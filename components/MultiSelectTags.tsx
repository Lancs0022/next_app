'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

interface Option {
  value: string | number
  label: string
}

interface MultiSelectTagsProps {
  label?: string
  options?: Option[]
  value?: (string | number)[]
  onChange?: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
}

const MultiSelectTags = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Tous',
  disabled = false
}: MultiSelectTagsProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedValues = Array.isArray(value) ? value : []

  const normalizedOptions = useMemo(
    () => options.map(o => ({ ...o, value: String(o.value) })),
    [options]
  )

  const selectedOptions = useMemo(
    () => normalizedOptions.filter(o => selectedValues.map(String).includes(o.value)),
    [normalizedOptions, selectedValues]
  )

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return normalizedOptions
    return normalizedOptions.filter(o => o.label.toLowerCase().includes(q))
  }, [normalizedOptions, query])

  const toggleValue = (raw: string | number) => {
    const v = String(raw)
    let next = selectedValues.map(String)
    if (next.includes(v)) {
      next = next.filter(x => x !== v)
    } else {
      next = [...next, v]
    }
    onChange?.(next)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-full min-w-0" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          {label}
        </label>
      )}
      <div className="relative min-w-0">
        <div className="flex items-center gap-2 min-h-[42px] px-3 pr-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => !disabled && setOpen(true)}
            placeholder={selectedOptions.length > 0 ? `${selectedOptions.length} sélectionné(s)` : placeholder}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-slate-500 dark:placeholder-slate-400"
            style={{ width: 0 }}
          />
          <button
            type="button"
            onClick={() => !disabled && setOpen(prev => !prev)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
            disabled={disabled}
            aria-label="Toggle dropdown"
          >
            <svg
              className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {open && !disabled && (
          <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg text-sm">
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs">
                Aucune option
              </div>
            )}
            {filteredOptions.map(opt => {
              const checked = selectedValues.map(String).includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleValue(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 ${checked ? 'bg-primary/5 text-primary' : 'text-slate-800 dark:text-slate-100'}`}
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{checked ? '✓' : ''}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MultiSelectTags
