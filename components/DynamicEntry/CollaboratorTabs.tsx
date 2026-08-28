'use client'

import type { CollaboratorTab } from '@/lib/dynamicEntry/types'
import { PlusIcon } from '@/components/icons/Icons'

interface CollaboratorTabsProps {
  tabs: CollaboratorTab[]
  activeId: string
  onSelect: (id: string) => void
  onAddTab: () => void
  onRemoveTab: (id: string) => void
  canAddMore: boolean
}

export default function CollaboratorTabs({
  tabs,
  activeId,
  onSelect,
  onAddTab,
  onRemoveTab,
  canAddMore,
}: CollaboratorTabsProps) {
  const canRemove = tabs.length > 0

  return (
    <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 md:px-4 flex items-center gap-1 overflow-x-auto shrink-0 py-1">
      {tabs.map(tab => {
        const isActive = tab.id === activeId
        const rowCount = tab.rows.filter(r => r.id_produit || r.quantite).length
        return (
          <div
            key={tab.id}
            className={`flex items-center rounded-t transition-colors ${
              isActive
                ? 'bg-white dark:bg-slate-900 border-t-2 border-indigo-500'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(tab.id)}
              className={`px-3 py-2 text-xs flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.nom}
              {rowCount > 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full min-w-[18px] text-center">
                  {rowCount}
                </span>
              )}
            </button>
            {canRemove && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemoveTab(tab.id) }}
                className="px-1.5 py-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                aria-label={`Retirer ${tab.nom}`}
                title={`Retirer ${tab.nom}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )
      })}
      {canAddMore && (
        <button
          type="button"
          onClick={onAddTab}
          className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <PlusIcon className="w-3 h-3" />
          Ajouter un collaborateur
        </button>
      )}
    </div>
  )
}
