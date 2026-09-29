'use client'

import React, { useEffect } from 'react'
import type { StockEvent, EnrichedStockMouvement } from './journalTypes'
import { formatQuantity, formatShortDateTime, getEventTypeBadge } from './journalUtils'
import { Z_DRAWER } from '@/lib/zIndex'

interface JournalMiniTableModalProps {
  open: boolean
  event: StockEvent | null
  onClose: () => void
}

export default function JournalMiniTableModal({
  open,
  event,
  onClose,
}: JournalMiniTableModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || !event) return null

  const badge = getEventTypeBadge(event.type)

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: Z_DRAWER + 10 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${badge.fullBadge}`}>
              {badge.label}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {event.reference}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {event.movements.length} mouvements atomiques réels composant cet événement
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Fermer la boîte de dialogue"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">ID</th>
                  <th className="px-3 py-2.5">Produit</th>
                  <th className="px-3 py-2.5">Lot</th>
                  <th className="px-3 py-2.5 text-right">Quantité</th>
                  <th className="px-3 py-2.5">Unité</th>
                  <th className="px-3 py-2.5">Sens / Mouvement</th>
                  <th className="px-3 py-2.5">Lieu</th>
                  <th className="px-3 py-2.5 text-right">Avant → Après</th>
                  <th className="px-3 py-2.5">Date / Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
                {event.movements.map((m: EnrichedStockMouvement) => {
                  const isTransfert = m.source_type === 'TRANSFERT' || m.type === 'transfert'
                  const isOut = m.type === 'sortie' || (isTransfert && m.before_qty != null && m.after_qty != null && m.after_qty < m.before_qty)
                  const isIn = m.type === 'entree' || m.type === 'annulation_vente' || (isTransfert && m.before_qty != null && m.after_qty != null && m.after_qty > m.before_qty)

                  return (
                    <tr
                      key={m.id_stock_mouvement}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                        #{m.id_stock_mouvement}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 max-w-[180px] truncate" title={m.libelle_produit || 'Produit'}>
                        {m.libelle_produit || 'Produit sans nom'}
                        {m.sku_produit && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Réf: {m.sku_produit}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">
                        #{m.id_lot}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">
                        {formatQuantity(m.quantite, m.est_decimal)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {m.unite_code || 'U'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {isOut ? (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <span>− Sortie</span>
                          </span>
                        ) : isIn ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span>+ Entrée</span>
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400">
                            {m.type}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[140px] truncate" title={m.nom_pdv || '—'}>
                        {m.nom_pdv || '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                        {m.before_qty != null && m.after_qty != null ? (
                          <span>
                            {formatQuantity(m.before_qty, m.est_decimal)} → {formatQuantity(m.after_qty, m.est_decimal)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                        <div>{formatShortDateTime(m.date_mouvement)}</div>
                        <div className="text-[10px] text-slate-400 truncate">{m.created_by_nom || '—'}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
