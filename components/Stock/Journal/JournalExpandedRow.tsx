'use client'

import React from 'react'
import type { StockEvent, EnrichedStockMouvement } from './journalTypes'
import { formatQuantity } from './journalUtils'

interface JournalExpandedRowProps {
  event: StockEvent
  onOpenMiniTable?: (event: StockEvent) => void
}

export default function JournalExpandedRow({
  event,
  onOpenMiniTable,
}: JournalExpandedRowProps) {
  return (
    <div className="py-2.5 px-3 md:px-4 bg-slate-50/80 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Mouvements atomiques ({event.movements.length})
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Composants de {event.reference}
          </span>
        </div>

        {onOpenMiniTable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenMiniTable(event)
            }}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <span>Voir en tableau</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {event.movements.map((m: EnrichedStockMouvement) => {
          const isTransfert = m.source_type === 'TRANSFERT' || m.type === 'transfert'
          const isOut = m.type === 'sortie' || (isTransfert && m.before_qty != null && m.after_qty != null && m.after_qty < m.before_qty)
          const isIn = m.type === 'entree' || m.type === 'annulation_vente' || (isTransfert && m.before_qty != null && m.after_qty != null && m.after_qty > m.before_qty)

          const qtyFormatted = `${formatQuantity(m.quantite, m.est_decimal)} ${m.unite_code || 'U'}`
          const deltaSign = isOut ? `−${qtyFormatted}` : isIn ? `+${qtyFormatted}` : `${qtyFormatted}`
          const deltaClass = isOut
            ? 'text-rose-600 dark:text-rose-400 font-semibold'
            : isIn
            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
            : 'text-slate-700 dark:text-slate-200 font-semibold'

          let destinationText = ''
          if (isTransfert) {
            destinationText = isOut
              ? `Source: ${m.pdv_source_nom || m.nom_pdv || 'Dépôt'}`
              : `Dest: ${m.pdv_dest_nom || m.nom_pdv || 'Boutique'}`
          } else if (m.client_nom) {
            destinationText = isOut ? `→ ${m.client_nom}` : `← ${m.client_nom}`
          } else if (m.nom_pdv) {
            destinationText = m.nom_pdv
          }

          return (
            <div
              key={m.id_stock_mouvement}
              className="p-2.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between text-xs gap-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                  Mouvement #{m.id_stock_mouvement}
                </span>
                <span className={deltaClass}>{deltaSign}</span>
              </div>

              <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={m.libelle_produit || 'Produit'}>
                {m.libelle_produit || 'Article'}
                <span className="text-slate-400 font-normal ml-1">· Lot #{m.id_lot}</span>
              </div>

              {destinationText && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {destinationText}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
