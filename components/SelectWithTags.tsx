import { ReactNode } from 'react'
import { PlusIcon } from '@/components/icons/Icons'

interface Option {
  value: string | number
  label: string
}

interface SelectWithTagsProps {
  label?: string
  options: Option[]
  value?: string | number
  onChange?: (value: string) => void
  renderTags?: (option: Option) => ReactNode
  showAddButton?: boolean
  onAddClick?: () => void
  addAriaLabel?: string
}

const SelectWithTags = ({
  label,
  options,
  value,
  onChange,
  renderTags,
  showAddButton = false,
  onAddClick,
  addAriaLabel = 'Ajouter'
}: SelectWithTagsProps) => {
  const selectedOption = options.find(o => String(o.value) === String(value)) || null

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <select
          value={value || ''}
          onChange={e => onChange?.(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
        >
          <option value="">Sélectionner</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {showAddButton && (
          <button
            type="button"
            onClick={onAddClick}
            aria-label={addAriaLabel}
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {selectedOption && (
        <div className="mt-2 flex flex-wrap gap-1">
          {renderTags
            ? renderTags(selectedOption)
            : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {selectedOption.label}
              </span>
            )}
        </div>
      )}
    </div>
  )
}

export default SelectWithTags
