'use client'

import React, { useState } from 'react'
import Drawer from '@/components/Drawer/Drawer'
import api from '@/services/api'
import type { StockEvent, EnrichedStockMouvement } from './journalTypes'
import {
  formatDateTime,
  formatQuantity,
  getEventTypeBadge,
} from './journalUtils'

interface JournalDrawerDetailProps {
  open: boolean
  event: StockEvent | null
  onClose: () => void
  onOpenMiniTable: (event: StockEvent) => void
  onRefreshAfterAction?: () => void
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void
}

export default function JournalDrawerDetail({
  open,
  event,
  onClose,
  onOpenMiniTable,
  onRefreshAfterAction,
  showToast,
}: JournalDrawerDetailProps) {
  const [cancellingSale, setCancellingSale] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  if (!event) return null

  const badge = getEventTypeBadge(event.type)
  const firstM = event.movements[0]
  const isTransfert = event.type === 'TRANSFERT'

  // Identifier source et destination pour les transferts
  const sourceMvt = isTransfert
    ? event.movements.find(
        (m) =>
          m.before_qty != null &&
          m.after_qty != null &&
          m.after_qty < m.before_qty
      ) || firstM
    : null

  const destMvt = isTransfert
    ? event.movements.find(
        (m) =>
          m.before_qty != null &&
          m.after_qty != null &&
          m.after_qty > m.before_qty
      ) || event.movements[1] || null
    : null

  // Vérifier si la vente est annulable
  const isCancellableSale =
    event.sourceType === 'VENTE' &&
    event.sourceId != null &&
    event.type !== 'ANNULATION' &&
    event.status !== 'Annulé'

  const handleConfirmCancelSale = async () => {
    if (!cancelReason.trim()) {
      showToast('Veuillez indiquer un motif d’annulation', 'error')
      return
    }

    setCancellingSale(true)
    try {
      await api.post(`/ventes/${event.sourceId}/annuler`, {
        raison: cancelReason.trim(),
      })
      showToast(`Vente #${event.sourceId} annulée avec succès`, 'success')
      setCancelModalOpen(false)
      setCancelReason('')
      onClose()
      onRefreshAfterAction?.()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string }
      showToast(e?.response?.data?.error || e?.message || 'Erreur lors de l’annulation de la vente', 'error')
    } finally {
      setCancellingSale(false)
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${badge.fullBadge}`}>
              {badge.label}
            </span>
            <span className="font-bold text-slate-900 dark:text-white truncate">
              {event.reference}
            </span>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          {/* ── SECTION 1 : INFORMATIONS GÉNÉRALES ── */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className={`h-2.5 w-2.5 rounded-xs ${badge.dotColor}`} />
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Informations Générales
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Type d'événement
                </p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {badge.label}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Référence
                </p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {event.reference}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Statut métier
                </p>
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {event.status}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Source métier
                </p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {event.sourceType} {event.sourceId ? `#${event.sourceId}` : ''}
                </p>
              </div>
            </div>
          </section>

          {/* ── SECTION 2 : DATES (Événement vs Enregistrement distincts) ── */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className="h-2.5 w-2.5 rounded-xs bg-indigo-500" />
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Traçabilité & Horodatage
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Date de l'événement
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDateTime(event.eventDate)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  Date d'enregistrement
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDateTime(event.createdAt)}
                </p>
              </div>
            </div>
          </section>

          {/* ── SECTION 3 : OPÉRATEUR ── */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Opérateur
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40">
              <div className="col-span-2 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {event.operator.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {event.operator}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enregistré dans le journal le {formatDateTime(event.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 4 : ARTICLE / MARCHANDISE (Unités non fusionnées) ── */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                  Marchandise concernée ({event.merchandiseList.length})
                </h3>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-slate-800">
              {event.merchandiseList.map((item, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {item.nom}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.sku && <span>Réf: {item.sku}</span>}
                      <span>· Lot #{item.id_lot}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatQuantity(item.quantite, item.est_decimal)} {item.unite}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── SECTION 5 : IMPACT STOCK (Deux blocs Source / Destination pour Transfert) ── */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className="h-2.5 w-2.5 rounded-xs bg-blue-500" />
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                Impact sur le Stock
              </h3>
            </div>

            {isTransfert ? (
              <div className="p-4 bg-white dark:bg-slate-900/40 space-y-4">
                {/* Bloc Source */}
                <div className="p-3.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                      SOURCE — {firstM?.pdv_source_nom || 'Point de vente source'}
                    </span>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Sortie de stock
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Stock avant</p>
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {sourceMvt?.before_qty != null ? `${formatQuantity(sourceMvt.before_qty, sourceMvt.est_decimal)} ${sourceMvt.unite_code || 'U'}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Variation</p>
                      <p className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {sourceMvt ? `−${formatQuantity(sourceMvt.quantite, sourceMvt.est_decimal)} ${sourceMvt.unite_code || 'U'}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Stock après</p>
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {sourceMvt?.after_qty != null ? `${formatQuantity(sourceMvt.after_qty, sourceMvt.est_decimal)} ${sourceMvt.unite_code || 'U'}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bloc Destination */}
                <div className="p-3.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      DESTINATION — {firstM?.pdv_dest_nom || 'Point de vente destination'}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Entrée de stock
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Stock avant</p>
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {destMvt?.before_qty != null ? `${formatQuantity(destMvt.before_qty, destMvt.est_decimal)} ${destMvt.unite_code || 'U'}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Variation</p>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {destMvt ? `+${formatQuantity(destMvt.quantite, destMvt.est_decimal)} ${destMvt.unite_code || 'U'}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Stock après</p>
                      <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {destMvt?.after_qty != null ? `${formatQuantity(destMvt.after_qty, destMvt.est_decimal)} ${destMvt.unite_code || 'U'}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white dark:bg-slate-900/40 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-0.5">Lieu</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {firstM?.nom_pdv || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-0.5">Stock avant</p>
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {firstM?.before_qty != null ? `${formatQuantity(firstM.before_qty, firstM.est_decimal)} ${firstM.unite_code || 'U'}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-0.5">Variation</p>
                  <p className={`font-mono font-bold ${firstM?.type === 'sortie' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {firstM?.type === 'sortie' ? '−' : '+'}{firstM ? `${formatQuantity(firstM.quantite, firstM.est_decimal)} ${firstM.unite_code || 'U'}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-0.5">Stock après</p>
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {firstM?.after_qty != null ? `${formatQuantity(firstM.after_qty, firstM.est_decimal)} ${firstM.unite_code || 'U'}` : '—'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ── SECTION 6 : MOUVEMENTS ASSOCIÉS ── */}
          <section className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-cyan-500" />
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                  Mouvements Atomiques ({event.movements.length})
                </h3>
              </div>
              {event.movements.length > 1 && (
                <button
                  type="button"
                  onClick={() => onOpenMiniTable(event)}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Ouvrir en tableau</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
            <div className="p-4 bg-white dark:bg-slate-900/40 text-xs">
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                Cet événement est constitué de {event.movements.length} enregistrement(s) dans le ledger <code className="font-mono text-slate-800 dark:text-slate-200">stock_mouvement</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                {event.movements.map((m: EnrichedStockMouvement) => (
                  <span
                    key={m.id_stock_mouvement}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs"
                  >
                    Mouvement #{m.id_stock_mouvement}
                    <span className="text-slate-400">({m.type})</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── SECTION 7 : SOURCE MÉTIER & ACTIONS ── */}
          {isCancellableSale && (
            <section className="rounded-lg border border-red-200 dark:border-red-900/50 overflow-hidden bg-red-50/30 dark:bg-red-950/20">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100/60 dark:bg-red-900/40 border-b border-red-200 dark:border-red-800">
                <span className="h-2.5 w-2.5 rounded-xs bg-red-600" />
                <h3 className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-widest">
                  Action Métier — Vente #{event.sourceId}
                </h3>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    Cette vente est actuellement enregistrée et valide.
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    L'annulation générera les mouvements compensatoires nécessaires sans altérer l'historique initial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs whitespace-nowrap transition-colors shadow-xs"
                >
                  Annuler la vente…
                </button>
              </div>
            </section>
          )}
        </div>
      </Drawer>

      {/* ── Modal de confirmation d'annulation de vente ── */}
      {cancelModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setCancelModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Annuler la vente #{event.sourceId}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Les stocks vendus seront automatiquement restitués via des mouvements compensatoires.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Motif de l'annulation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Erreur de saisie, retour client..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancellingSale}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSale}
                disabled={cancellingSale}
                className="px-3.5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {cancellingSale ? 'Annulation en cours…' : 'Confirmer l’annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
