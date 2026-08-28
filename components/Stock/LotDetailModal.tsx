'use client'

import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { iconMap } from '@/components/icons/Icons'
import { Z_SIDEBAR_FLYOUT } from '@/lib/zIndex'
import { ActionMenu, ActionMenuId } from "./ActionMenu"
import { CategoryBadge, CollabBadge, PDVBadge, StockRatioBadge } from "./Badges"
import { fmt } from "./formatters"
import { ProduitCatalogue, PointDeVente, Collaborateur, LotActif } from "./types"
import api from "@/services/api"
import { useToast } from '@/components/Toast/ToastContainer'
import { X } from "lucide-react"

export function LotDetailModal({
  lot,
  produit,
  onClose,
  collaborateurs,
  pointsDeVente,
  onAction
}: {
  lot: LotActif;
  produit: ProduitCatalogue;
  onClose: () => void;
  collaborateurs: Record<string, Collaborateur>;
  pointsDeVente: Record<string, PointDeVente>;
  onAction?: (actionId: ActionMenuId, lot: LotActif) => void;
}) {
  const { showToast } = useToast()
  const [actionsOpen, setActionsOpen] = useState(false)
  const [movements, setMovements] = useState<Array<any>>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const collab = collaborateurs[produit.id_collaborateur];
  const pdv = pointsDeVente[lot.pdvId];

  const handleAction = (actionId: ActionMenuId) => {
    if (onAction) {
      onAction(actionId, lot);
      return;
    }
    // Handle different actions
    switch (actionId) {
      case "vendre":
        alert("Action: Vendre ce lot\n\nRedirige vers la saisie globale des ventes avec ce produit pré-sélectionné.");
        break;
      case "ajuster":
        alert("Action: Ajuster la quantité\n\nAjoute une entrée dans stock_mouvement (type: ajustement) et stock_ajustement. Motif obligatoire.");
        break;
      case "transfert":
        alert("Action: Transférer vers un autre Point de Vente\n\nEnregistre dans stock_transfert + double écriture dans stock_mouvement (sortie source + entrée destination).");
        break;
      case "prix":
        alert("Action: Ajuster le prix et la marge\n\nMet à jour livraison_item sans modifier l'historique des ventes fermées.");
        break;
    }
  };

  // Fetch stock movements for this lot
  useEffect(() => {
    const fetchMovements = async () => {
      setMovementsLoading(true)
      try {
        const params = new URLSearchParams()
        if (lot.pdvId) params.append('id_pdv', lot.pdvId.toString())
        const res = await api.get(`/stock/lots/${lot.id}/mouvements?${params.toString()}`)
        setMovements(res.data?.data || [])
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } }; message?: string }
        console.error('Failed to fetch stock movements:', e)
        showToast(e?.response?.data?.error || e?.message || 'Erreur lors du chargement des mouvements de stock', 'info')
        setMovements([])
      } finally {
        setMovementsLoading(false)
      }
    }
    if (lot.id) fetchMovements()
  }, [lot.id, lot.pdvId, showToast])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-slate-700 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-300 bg-white/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-0.5">
              Détail Lot · {lot.id}
            </p>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
              {produit.nom}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Gear / Actions Button */}
            <div className="relative">
              <button
                onClick={() => setActionsOpen((v) => !v)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-700 hover:text-slate-900 hover:border-slate-400 text-xs sm:text-sm font-medium transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:hover:border-slate-500"
              >
                <svg className="min-w-[13px] min-h-[13px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span className="hidden sm:inline">Paramètres</span>
                <svg className="min-w-[11px] min-h-[11px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              {actionsOpen && <ActionMenu onAction={handleAction} onClose={() => setActionsOpen(false)} />}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
              title="Fermer"
            >
              <X size={16} className="min-w-[16px] min-h-[16px]" />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-4 text-slate-900 dark:text-slate-100">
          {/* ── Section 1: Catalogue & Propriétaire ── */}
          <section className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="h-3 w-3 bg-emerald-500 rounded"></div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Informations Catalogue & Propriétaire
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900/50">
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Produit</p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{produit.nom}</span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">#{produit.id_produit}</span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Collaborateur</p>
                <span className="text-sm text-slate-700 dark:text-slate-300">{collab?.nom || collab?.prenom || 'Collaborateur -'}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Catégorie</p>
                <span className="text-slate-400 dark:text-slate-500">{produit.categorie || 'N/A'}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Créé par</p>
                <span className="text-sm text-slate-700 dark:text-slate-300">{produit.createur_nom || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-700 flex gap-4">
                <span className="text-xs text-slate-600 dark:text-slate-400">Créé le <span className="text-slate-700 dark:text-slate-300 font-semibold">{produit.created_at ? new Date(produit.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span></span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Utilisateur <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{produit.createur_par || 'N/A'}</span></span>
              </div>
            </div>
          </section>

          {/* ── Section 2: Livraison & Logistique ── */}
          <section className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="h-3 w-3 bg-blue-500 rounded"></div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Informations Livraison & Logistique
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900/50">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Livraison ID</p>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{lot.livraison_id}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Item ID</p>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{lot.livraison_item_id}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Date d'arrivée</p>
                <span className="text-sm text-slate-700 dark:text-slate-300">{lot.date_arrivee ? new Date(lot.date_arrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Point de Vente</p>
                <span className="text-sm font-medium">{pdv?.nom || `PV #${lot.pdv_id}`} {pdv?.ville && `(${pdv.ville})`}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">PDV ID</p>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{lot.pdv_id}</span>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-700 flex gap-4">
                <span className="text-xs text-slate-600 dark:text-slate-400">Créé le <span className="text-slate-700 dark:text-slate-300 font-semibold">{lot.created_at ? new Date(lot.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span></span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Par <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{lot.created_by || 'N/A'}</span></span>
              </div>
            </div>
          </section>

          {/* ── Section 3: Finances & Stocks ── */}
          <section className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="h-3 w-3 bg-emerald-500 rounded"></div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Performances Financières & Stocks
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900/50">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Prix de vente unitaire</p>
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {((lot.prixInitial || 0) + (lot.marge || 0)).toLocaleString('fr-FR')} Ar
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">dont marge : {(lot.marge || 0).toLocaleString('fr-FR')} Ar</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Prix fournisseur</p>
                <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                  {(lot.prixInitial || 0).toLocaleString('fr-FR')} Ar
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Stock restant</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{fmt(lot.quantiteActuelle)}</span>
                  <span className="text-slate-400 text-xs">/ {fmt(lot.quantiteInitiale)}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Déjà vendu</p>
                <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-semibold">
                  {fmt(lot.quantiteVendue)}
                </span>
              </div>

              {/* Bénéfice dégagé */}
              <div className="sm:col-span-2 mt-1 rounded-lg border border-emerald-300/50 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/5 px-4 py-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400/80 uppercase tracking-widest font-semibold mb-1">
                  Bénéfice dégagé jusqu&apos;ici
                </p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 tracking-tight">
                  {(lot.quantiteVendue * lot.marge).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ar
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {fmt(lot.quantiteVendue)} vendu{lot.quantiteVendue > 1 ? 's' : ''} × {lot.marge.toLocaleString('fr-FR')} Ar de marge
                </p>
              </div>

              {/* Gain potentiel restant */}
              <div className="sm:col-span-2 rounded-lg border border-blue-300/50 bg-blue-50/50 dark:border-blue-500/25 dark:bg-blue-500/5 px-4 py-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-widest font-semibold mb-1">
                  Gain potentiel si tout le reste est vendu
                </p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300 tracking-tight">
                  {(lot.quantiteActuelle * lot.marge).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ar
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {fmt(lot.quantiteActuelle)} restant{lot.quantiteActuelle > 1 ? 's' : ''} × {lot.marge.toLocaleString('fr-FR')} Ar de marge
                </p>
              </div>
            </div>
          </section>

          {/* ── Section 4: Mouvements de stock (NEW) ── */}
          <section className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="h-3 w-3 bg-indigo-500 rounded"></div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Mouvements de stock
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {movementsLoading ? (
                <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                  Chargement des mouvements...
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                  Aucun mouvement enregistré pour ce lot.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Type</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-300">Quantité</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Source</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Utilisateur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {movements.map((m, index) => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                            {m.date_mouvement ? new Date(m.date_mouvement).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded 
                              ${m.type === 'entree' ? 'bg-green-100 text-green-800' :
                                m.type === 'sortie' ? 'bg-red-100 text-red-800' :
                                m.type === 'annulation_vente' ? 'bg-yellow-100 text-yellow-800' :
                                m.type === 'transfert' ? 'bg-blue-100 text-blue-800' :
                                m.type === 'ajustement' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'}`}>
                              {m.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">
                            {m.quantite >= 0 ? `+${fmt(m.quantite)}` : `-${fmt(Math.abs(m.quantite))}`} unités
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                            {m.source_type === 'VENTE' ? `Vente #${m.source_id}` :
                              m.source_type === 'LIVRAISON' ? `Livraison #${m.source_id}` :
                              m.source_type === 'AJUSTEMENT' ? `Ajustement #${m.source_id}` :
                              m.source_type === 'TRANSFERT' ? `Transfert #${m.source_id}` :
                              m.source_id ? `#${m.source_id}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                            {m.createdBy || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}