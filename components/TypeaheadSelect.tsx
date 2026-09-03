'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PlusIcon } from '@/components/icons/Icons'
import { Z_DROPDOWN } from '@/lib/zIndex'

const DropdownPortal = ({
  children,
  containerRef,
}: {
  children: React.ReactNode
  containerRef: React.RefObject<HTMLDivElement | null>
}) => {
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    setMounted(true)

    const updateCoords = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCoords({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
    }

    updateCoords()
    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords, true) // capture scroll events on any parent

    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [containerRef])

  if (!mounted) return null

  return createPortal(
    <div
      data-typeahead-portal
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: Z_DROPDOWN,
      }}
    >
      {children}
    </div>,
    document.body
  )
}

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
  allowCustomInput?: boolean
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
  allowCustomInput = false,
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
      const target = e.target as HTMLElement
      if (containerRef.current && containerRef.current.contains(target)) return
      if (target.closest('[data-typeahead-portal]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (opt: Option) => {
    onChange?.(String(opt.value))
    setQuery(allowCustomInput ? String(opt.value) : '')
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
      setQuery(allowCustomInput ? String(value ?? '') : '')
    }
  }

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center h-[42px] px-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors">
            {selectedOption && !open && !allowCustomInput ? (
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
                value={allowCustomInput && !open ? String(value ?? '') : query}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setQuery(nextValue)
                  setOpen(true)
                  if (allowCustomInput) {
                    onChange?.(nextValue)
                  }
                }}
                onFocus={handleFocus}
                placeholder={!allowCustomInput && selectedOption ? selectedOption.label : placeholder}
                disabled={disabled}
                className="w-full bg-transparent outline-none text-sm placeholder-slate-500 dark:placeholder-slate-400"
              />
            )}
          </div>

          {open && (
            <DropdownPortal containerRef={containerRef}>
              <div className="w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
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
            </DropdownPortal>
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
