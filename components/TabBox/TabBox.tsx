'use client'

import { useState } from 'react'

interface Tab {
  id?: string
  label: string
  badge?: string | number
  content: React.ReactNode
}

const TabBox = ({ 
  tabs = [], 
  defaultTab = 0, 
  className = '',
  padding = 'p-6',
  border = true,
  shadow = true,
  actions
}: {
  tabs?: Tab[]
  defaultTab?: number
  className?: string
  padding?: string
  border?: boolean
  shadow?: boolean
  actions?: React.ReactNode
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab)

  if (!tabs || tabs.length === 0) {
    return null
  }

  const baseClasses = `
    bg-white dark:bg-slate-800
    ${border ? 'border border-slate-200 dark:border-slate-700' : ''}
    ${shadow ? 'shadow-sm' : ''}
    rounded-lg
    ${className}
  `

  return (
    <div className={baseClasses}>
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-4 md:px-6 pt-4 md:pt-6 pb-0">
          {/* Tabs */}
          <div className="flex flex-1 min-w-0 overflow-x-auto">
            <div className="flex space-x-6 md:space-x-8">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id || index}
                  onClick={() => setActiveTab(index)}
                  className={`
                    py-3 md:py-4 px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0 whitespace-nowrap
                    ${activeTab === index
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 pb-4 lg:pb-0 lg:pl-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`${padding} overflow-x-auto`}>
        <div className="min-w-0">
          {tabs[activeTab]?.content}
        </div>
      </div>
    </div>
  )
}

export default TabBox
