'use client'

import { useState } from "react";
import { ArrowLeft, Package, Building2, CalendarDays, Boxes, TrendingUp, DollarSign, ChevronRight, LayoutGrid, List } from "lucide-react";
import { LotDetailModal } from "./LotDetailModal";
import { StockRatioBadge } from "./Badges";
import { fmt, fmtXOF } from "./formatters";
import { ProduitCatalogue, PointDeVente, Collaborateur, LotActif } from "./types";

export function LotExplorer({
  produit,
  onClose,
  collaborateurs,
  pointsDeVente,
  lots,
  onLotAction,
}: {
  produit: ProduitCatalogue;
  onClose: () => void;
  collaborateurs: Record<string, Collaborateur>;
  pointsDeVente: Record<string, PointDeVente>;
  lots: LotActif[];
  onLotAction?: (actionId: import("./ActionMenu").ActionMenuId, lot: LotActif) => void;
}) {
  const [selectedLot, setSelectedLot] = useState<LotActif | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  const totalStock = lots.reduce((sum, lot) => sum + lot.quantiteActuelle, 0);
  const totalCA = lots.reduce((sum, lot) => sum + (lot.chiffreAffaires ?? lot.quantiteVendue * (lot.prixInitial + lot.marge)), 0);
  const totalBenefice = lots.reduce((sum, lot) => sum + (lot.benefice ?? lot.quantiteVendue * lot.marge), 0);
  const displayMode = lots.length === 1 ? 'list' : viewMode;

  const handleLotSelect = (lot: LotActif) => {
    setSelectedLot(lot);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-10 bg-white dark:bg-slate-950">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors text-sm font-medium"
            title="Retour"
          >
            <ArrowLeft className="h-4 w-4 min-w-[16px] min-h-[16px]" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 min-w-[16px] min-h-[16px] text-emerald-600 dark:text-emerald-400" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{produit.nom}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">Exploration des lots</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full sm:w-auto">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              <Boxes className="h-3 w-3 min-w-[12px] min-h-[12px] text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Lots</span>
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{lots.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
              <Package className="h-3 w-3 min-w-[12px] min-h-[12px] text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Stock</span>
              <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">{fmt(totalStock)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-50/50 px-3 py-1.5 dark:border-emerald-500/25 dark:bg-emerald-500/5">
              <TrendingUp className="h-3 w-3 min-w-[12px] min-h-[12px] text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">CA</span>
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{fmtXOF(totalCA)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-50/50 px-3 py-1.5 dark:border-emerald-500/25 dark:bg-emerald-500/5">
              <DollarSign className="h-3 w-3 min-w-[12px] min-h-[12px] text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">Bénéfice</span>
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{fmtXOF(totalBenefice)}</span>
            </div>
          </div>

          <div className="inline-flex rounded-full border border-slate-300 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <List className="h-3.5 w-3.5" /> Liste
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Carte
            </button>
          </div>
        </div>
      </div>

      {lots.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <div>
            <Package className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">Aucun lot disponible</p>
          </div>
        </div>
      ) : displayMode === 'list' ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Lot</th>
                <th className="px-4 py-3">PV</th>
                <th className="px-4 py-3">Quantité</th>
                <th className="px-4 py-3">Prix / Marge</th>
                <th className="px-4 py-3">Vendue</th>
                <th className="px-4 py-3">Arrivée</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const pdv = pointsDeVente[lot.pdvId];
                return (
                  <tr
                    key={lot.id}
                    className="cursor-pointer border-t border-slate-200 bg-white transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                    onClick={() => handleLotSelect(lot)}
                  >
                    <td className="px-4 py-4 align-top text-slate-900 dark:text-slate-100">
                      <div className="font-semibold">Lot #{lot.id}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Liv #{lot.livraisonId}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{lot.pdvNom || pdv?.nom || `PV #${lot.pdvId}`}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lot.pdvVille || pdv?.ville}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-slate-900 dark:text-slate-100">{lot.quantiteActuelle} / {lot.quantiteInitiale}</div>
                      <StockRatioBadge current={lot.quantiteActuelle} initial={lot.quantiteInitiale} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-slate-900 dark:text-slate-100">{fmtXOF(lot.prixInitial + lot.marge)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Prix: {fmtXOF(lot.prixInitial)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Marge: {fmtXOF(lot.marge)}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-blue-700 dark:text-blue-300 font-semibold">{fmt(lot.quantiteVendue)}</td>
                    <td className="px-4 py-4 align-top text-slate-500 dark:text-slate-400">{new Date(lot.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {lots.map((lot) => {
            const pdv = pointsDeVente[lot.pdvId];
            const pct = lot.quantiteInitiale > 0 ? (lot.quantiteActuelle / lot.quantiteInitiale) * 100 : 0;
            const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500';

            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => handleLotSelect(lot)}
                className="group flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-400/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 min-w-[14px] min-h-[14px] text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{lot.pdvNom || pdv?.nom || `PV #${lot.pdvId}`}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{lot.pdvVille || pdv?.ville}</p>
                  </div>
                  <CalendarDays className="h-3.5 w-3.5 min-w-[14px] min-h-[14px] text-slate-400 dark:text-slate-500" />
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">Liv #{lot.livraisonId}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">Lot #{lot.id}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">{new Date(lot.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-700/50">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Prix</p>
                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{fmtXOF(lot.prixInitial)}</p>
                  </div>
                  <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-500/10">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Marge</p>
                    <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmtXOF(lot.marge)}</p>
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stock</p>
                    <StockRatioBadge current={lot.quantiteActuelle} initial={lot.quantiteInitiale} />
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 overflow-hidden">
                    <div className={`${barColor} h-full rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                <div className="rounded-md bg-blue-50 p-2 dark:bg-blue-500/10">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Quantité vendue</p>
                  <p className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300">{fmt(lot.quantiteVendue)}</p>
                </div>
                <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium">Détails</span>
                  <ChevronRight className="h-3.5 w-3.5 min-w-[14px] min-h-[14px]" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedLot && (
        <LotDetailModal
          lot={selectedLot}
          produit={produit}
          collaborateurs={collaborateurs}
          pointsDeVente={pointsDeVente}
          onClose={() => setSelectedLot(null)}
          onAction={onLotAction}
        />
      )}
    </div>
  );
}
