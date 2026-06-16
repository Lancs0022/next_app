'use client'

import { useState, useRef, useEffect } from 'react'
import { PlusIcon } from '@/components/icons/Icons'

interface Option {
  value: string | number
  label: string
}

interface TypeaheadSelectProps {
  label?: string
  options?: Option[]
  value?: string | number
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  showAddButton?: boolean
  onAddClick?: () => void
  addAriaLabel?: string
}

const TypeaheadSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Rechercher…',
  disabled = false,
  showAddButton = false,
  onAddClick,
  addAriaLabel = 'Ajouter'
}: TypeaheadSelectProps) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(o => String(o.value) === String(value)) || null

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (opt: Option) => {
    onChange?.(String(opt.value))
    setQuery('')
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
    setQuery('')
    inputRef.current?.focus()
  }

  const handleFocus = () => {
    if (!disabled) {
      setOpen(true)
      setQuery('')
    }
  }

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center h-[42px] px-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
            {selectedOption && !open ? (
              <div className="flex items-center justify-between w-full min-w-0">
                <span className="text-sm truncate">{selectedOption.label}</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="ml-2 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Effacer la sélection"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
                onFocus={handleFocus}
                placeholder={selectedOption ? selectedOption.label : placeholder}
                disabled={disabled}
                className="w-full bg-transparent outline-none text-sm placeholder-slate-500 dark:placeholder-slate-400"
              />
            )}
          </div>

          {open && (
            <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-30">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                  Aucun résultat
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      String(opt.value) === String(value)
                        ? 'bg-slate-100 dark:bg-slate-700 font-medium text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {showAddButton && (
          <button
            type="button"
            onClick={onAddClick}
            disabled={disabled}
            aria-label={addAriaLabel}
            className="inline-flex items-center justify-center h-[42px] w-[42px] rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default TypeaheadSelect
