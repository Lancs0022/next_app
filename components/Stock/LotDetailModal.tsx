'use client'

import { useState } from "react";
import { Tag, TrendingUp, ReceiptText, Settings, ChevronDown, X, DollarSign } from "lucide-react";
import { ActionMenu, ActionMenuId } from "./ActionMenu";
import { CategoryBadge, CollabBadge, PDVBadge, StockRatioBadge } from "./Badges";
import { fmt, fmtXOF } from "./formatters";
import { ProduitCatalogue, PointDeVente, Collaborateur, LotActif } from "./types";

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
  const [actionsOpen, setActionsOpen] = useState(false);
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
                <Settings size={13} className="min-w-[13px] min-h-[13px]" />
                <span className="hidden sm:inline">Paramètres</span>
                <ChevronDown size={11} className="min-w-[11px] min-h-[11px]" />
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
              <Tag size={13} className="text-emerald-600 dark:text-emerald-400 min-w-[13px] min-h-[13px]" />
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
                <CollabBadge name={lot.collaborateurNom || collab?.nom || 'Collaborateur -'} />
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Catégorie</p>
                {lot.produitCategorie || produit.categorie ? <CategoryBadge cat={lot.produitCategorie || produit.categorie || ''} /> : <span className="text-slate-400 dark:text-slate-500">N/A</span>}
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Créé par</p>
                <span className="text-sm text-slate-700 dark:text-slate-300">{lot.produitCreateurNom || lot.produitCreatedBy || produit.created_by?.toString() || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{lot.produitDescription || produit.description || '-'}</p>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-700 flex gap-4">
                <span className="text-xs text-slate-600 dark:text-slate-400">Créé le <span className="text-slate-700 dark:text-slate-300 font-semibold">{lot.produitCreatedAt || produit.created_at ? new Date(lot.produitCreatedAt || produit.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span></span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Utilisateur <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{lot.produitCreatedBy || produit.created_by?.toString() || 'N/A'}</span></span>
              </div>
            </div>
          </section>

          {/* ── Section 2: Livraison & Logistique ── */}
          <section className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <ReceiptText size={13} className="text-blue-600 dark:text-blue-400 min-w-[13px] min-h-[13px]" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Informations Livraison & Logistique
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900/50">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Livraison ID</p>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{lot.livraisonId}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Item ID</p>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{lot.livraisonItemId}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Date d'arrivée</p>
                <span className="text-sm text-slate-700 dark:text-slate-300">{lot.dateArrivee ? new Date(lot.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Point de Vente</p>
                <PDVBadge name={lot.pdvNom || pdv?.nom || `PV #${lot.pdvId}`} city={lot.pdvVille || pdv?.ville || undefined} />
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">PDV ID</p>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{lot.pdvId}</span>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-300 dark:border-slate-700 flex gap-4">
                <span className="text-xs text-slate-600 dark:text-slate-400">Créé le <span className="text-slate-700 dark:text-slate-300 font-semibold">{lot.createdAt ? new Date(lot.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span></span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Par <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{lot.createdBy || 'N/A'}</span></span>
              </div>
            </div>
          </section>

          {/* ── Section 3: Finances & Stocks ── */}
          <section className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400 min-w-[13px] min-h-[13px]" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Performances Financières & Stocks
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900/50">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Prix unitaire initial</p>
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{fmtXOF(lot.prixInitial)}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Marge PEJAA</p>
                <span className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-300">{fmtXOF(lot.marge)}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Prix de vente</p>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{fmtXOF(lot.prixInitial + lot.marge)}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Stock actuel / initial</p>
                <StockRatioBadge current={lot.quantiteActuelle} initial={lot.quantiteInitiale} large />
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Ventes fermées</p>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{fmt(lot.ventesFermees)} unités</span>
              </div>
              {/* NEW: Quantity sold */}
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1 font-semibold">Quantité vendue</p>
                <span className="font-mono text-sm text-blue-700 dark:text-blue-300">{fmt(lot.quantiteVendue)} unités</span>
              </div>
              {/* Highlight: Argent généré */}
              <div className="sm:col-span-2 mt-1 rounded-lg border border-emerald-300/50 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/5 px-4 py-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400/80 uppercase tracking-widest font-semibold mb-1">
                  Argent généré par ce lot
                </p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 tracking-tight">
                  {fmtXOF(lot.chiffreAffaires ?? lot.quantiteVendue * (lot.prixInitial + lot.marge))}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {lot.chiffreAffaires != null
                    ? `${fmt(lot.quantiteVendue)} unités vendues · ${fmtXOF(lot.prixInitial + lot.marge)} / unité`
                    : `${fmt(lot.quantiteVendue)} unités vendues · ${fmtXOF(lot.prixInitial + lot.marge)} / unité`}
                </p>
              </div>
              <div className="sm:col-span-2 rounded-lg border border-emerald-300/50 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/5 px-4 py-3">
                <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-300">
                  <DollarSign size={14} className="min-w-[14px] min-h-[14px]" />
                  <p className="text-xs uppercase tracking-widest font-semibold">Bénéfice net</p>
                </div>
                <p className="font-mono text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 tracking-tight">
                  {fmtXOF(lot.benefice ?? lot.quantiteVendue * lot.marge)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {`${fmt(lot.quantiteVendue)} unités vendues · ${fmtXOF(lot.marge)} de marge / unité`}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
