'use client'

import type { EntryRow, DynamicEntryModule } from '@/lib/dynamicEntry/types'
import { computeMetrics, formatAr } from '@/lib/dynamicEntry/metrics'

interface DynamicEntryMetricsBarProps {
  rows: EntryRow[]
  module: DynamicEntryModule
}

export default function DynamicEntryMetricsBar({ rows, module }: DynamicEntryMetricsBarProps) {
  const { totalArticles, totalCost, totalProfit } = computeMetrics(rows, module)

  const costLabel = module === 'livraison' ? 'Coût initial total' : 'Montant total'
  const profitLabel = module === 'livraison' ? 'Profit potentiel estimé' : 'Marge estimée'

  return (
    <div className="bg-slate-800 border-t border-slate-700 px-4 py-2.5 flex flex-wrap items-center gap-6 shrink-0">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span className="text-xs text-slate-400">Total articles:</span>
        <span className="text-xs text-slate-100 font-medium">{formatAr(totalArticles)}</span>
      </div>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs text-slate-400">{costLabel}:</span>
        <span className="text-xs text-slate-100 font-medium">{formatAr(totalCost)} Ar</span>
      </div>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-xs text-slate-400">{profitLabel}:</span>
        <span className="text-xs text-emerald-400 font-medium">{formatAr(totalProfit)} Ar</span>
      </div>
    </div>
  )
}
