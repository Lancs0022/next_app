'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PlusIcon } from '@/components/icons/Icons'
import { formInputClass } from '@/components/FormField'
import { Z_MODAL_NESTED } from '@/lib/zIndex'

export interface SelectOption {
  value: string | number
  label: string
}

interface SelectWithTagsProps {
  label?: string
  options: SelectOption[]
  value?: string | number
  onChange?: (value: string) => void
  showAddButton?: boolean
  onAddClick?: () => void
  addAriaLabel?: string
  compact?: boolean
  disabled?: boolean
  placeholder?: string
  /** When true, shows a single empty option using placeholder text (filters duplicate empty options). */
  allowEmpty?: boolean
  className?: string
}

const SelectWithTags = ({
  label,
  options,
  value,
  onChange,
  showAddButton = false,
  onAddClick,
  addAriaLabel = 'Ajouter',
  compact = false,
  disabled = false,
  placeholder = 'Sélectionner',
  allowEmpty = false,
  className = '',
}: SelectWithTagsProps) => {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement | null>(null)

  const normalizedOptions = options
    .filter(o => o.value !== '' && o.value != null)
    .map(o => ({ value: String(o.value), label: o.label }))

  const selectedOption = normalizedOptions.find(o => o.value === String(value ?? '')) || null

  const displayLabel = selectedOption
    ? selectedOption.label
    : (allowEmpty && (value === '' || value == null) ? placeholder : placeholder)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.createElement('div')
    portalRef.current = el
    document.body.appendChild(el)
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el)
      portalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const updatePos = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (portalRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const triggerClass = compact
    ? 'flex-1 min-w-0 flex items-center justify-between gap-2 h-8 px-2 text-xs ' +
      'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded ' +
      'text-slate-800 dark:text-slate-100 ' +
      'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors'
    : `${formInputClass} flex items-center justify-between gap-2 text-left disabled:opacity-50`

  const addBtnClass = compact
    ? 'inline-flex items-center justify-center h-8 w-8 rounded ' +
      'border border-slate-200 dark:border-slate-700 ' +
      'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 ' +
      'text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors shrink-0'
    : 'inline-flex items-center justify-center h-[42px] w-[42px] rounded-lg ' +
      'border border-slate-300 dark:border-slate-600 ' +
      'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 ' +
      'text-slate-500 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors shrink-0'

  const handleSelect = (nextValue: string) => {
    onChange?.(nextValue)
    setOpen(false)
  }

  const dropdown = open && portalRef.current && createPortal(
    <div
      className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl max-h-56 overflow-y-auto"
      style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: Z_MODAL_NESTED }}
    >
      {allowEmpty && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect('')}
          className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
            !value ? 'bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {placeholder}
        </button>
      )}
      {normalizedOptions.map(opt => (
        <button
          key={opt.value}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect(opt.value)}
          className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
            opt.value === String(value ?? '')
              ? 'bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-white font-medium'
              : 'text-slate-800 dark:text-slate-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>,
    portalRef.current
  )

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(prev => !prev)}
          className={triggerClass}
        >
          <span className={`truncate flex-1 ${!selectedOption && !allowEmpty ? 'text-slate-500' : ''}`}>
            {selectedOption ? selectedOption.label : displayLabel}
          </span>
          <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAddButton && (
          <button
            type="button"
            onClick={onAddClick}
            disabled={disabled}
            aria-label={addAriaLabel}
            className={addBtnClass}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {dropdown}
    </div>
  )
}

export default SelectWithTags
