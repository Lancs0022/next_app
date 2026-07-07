'use client'

import { useState, useMemo } from "react";
import { Package, ChevronRight, ChevronDown, ChevronUp, Search, Filter, ArrowLeft } from "lucide-react";
import { LotExplorer } from "./LotExplorer";
import { CategoryBadge, CollabBadge } from "./Badges";
import { fmt, fmtXOF } from "./formatters";
import { ProduitCatalogue, PointDeVente, Collaborateur, LivraisonItem, mapToLotActif } from "./types";

interface StockCatalogViewProps {
  produits: ProduitCatalogue[];
  collaborateurs: Record<string, Collaborateur>;
  pointsDeVente: Record<string, PointDeVente>;
  lots: LivraisonItem[];
  onProductClick: (produit: ProduitCatalogue) => void;
}

type SortKey = "nom" | "categorie" | "collaborateur" | "lotsActifs" | "stockTotal" | "chiffreAffaires";
type SortDir = "asc" | "desc";

export function StockCatalogView({
  produits,
  collaborateurs,
  pointsDeVente,
  lots,
  onProductClick
}: StockCatalogViewProps) {
  const [selectedProduit, setSelectedProduit] = useState<ProduitCatalogue | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const categories = useMemo(() => 
    Array.from(new Set(produits.map((p) => p.categorie).filter((c): c is string => Boolean(c)))).sort(), 
    [produits]
  );

  const filtered = useMemo(() => 
    produits.filter((p) => {
      const collab = collaborateurs[p.id_collaborateur];
      const searchMatch =
        search === "" ||
        p.nom.toLowerCase().includes(search.toLowerCase()) ||
        p.id_produit.toString().toLowerCase().includes(search.toLowerCase()) ||
        collab?.nom.toLowerCase().includes(search.toLowerCase());
      const catMatch = catFilter === "all" || p.categorie === catFilter;
      return searchMatch && catMatch;
    }).sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "collaborateur") {
        av = collaborateurs[a.id_collaborateur]?.nom ?? "";
        bv = collaborateurs[b.id_collaborateur]?.nom ?? "";
      } else {
        av = a[sortKey as keyof ProduitCatalogue] as string | number;
        bv = b[sortKey as keyof ProduitCatalogue] as string | number;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    }),
    [produits, collaborateurs, search, catFilter, sortKey, sortDir]
  );

  const totalStock = produits.reduce((s, p) => s + (p.stockTotal ?? 0), 0);
  const totalCA = produits.reduce((s, p) => s + (p.chiffreAffaires ?? 0), 0);
  const totalLots = produits.reduce((s, p) => s + (p.lotsActifs ?? 0), 0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown size={11} className="text-slate-600" />;
    return sortDir === "asc"
      ? <ChevronUp size={11} className="text-emerald-400" />
      : <ChevronDown size={11} className="text-emerald-400" />;
  }

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Package size={14} className="text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-slate-100">PEJAA</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <span className="text-[12px] text-slate-500 font-medium">ERP · Gestion des Consignations</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-px h-7 rounded-full bg-slate-700 flex items-center justify-center">
            <span className="text-[11px] font-bold text-slate-300">AD</span>
          </div>
        </div>
      </header>

      {/* ── KPI Bar ── */}
      <div className="flex items-stretch border-b border-slate-800 bg-slate-900/50">
        {[
          { label: "Produits catalogue", value: fmt(produits.length), icon: Package, color: "text-slate-300" },
          { label: "Lots actifs en circulation", value: fmt(totalLots), icon: Package, color: "text-blue-400" },
          { label: "Volume stock total", value: fmt(totalStock), icon: Package, color: "text-amber-400" },
          { label: "Chiffre d'affaires généré", value: fmtXOF(totalCA), icon: Package, color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <div key={i} className="flex-1 flex items-center gap-3 px-6 py-3 border-r border-slate-800 last:border-r-0">
            <Icon size={16} className={color} />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{label}</p>
              <p className={`font-mono text-[15px] font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-800 bg-slate-900/30">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher produit, ID, collaborateur…"
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-slate-500" />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-[12px] text-slate-300 focus:outline-none focus:border-emerald-500/60 transition-colors"
          >
            <option value="all">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-[11px] text-slate-600 font-mono">
          {filtered.length} / {produits.length} produits
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              {(
                [
                  { key: "nom", label: "Produit" },
                  { key: "categorie", label: "Catégorie" },
                  { key: "collaborateur", label: "Collaborateur" },
                  { key: "lotsActifs", label: "Lots actifs" },
                  { key: "stockTotal", label: "Stock total" },
                  { key: "chiffreAffaires", label: "CA généré" },
                ] as { key: SortKey; label: string }[]
              ).map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {label}
                    <SortIcon col={key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <ChevronRight size={11} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((produit, i) => {
              const collab = collaborateurs[produit.id_collaborateur];
              return (
                <tr
                  key={produit.id_produit.toString()}
                  onClick={() => onProductClick(produit)}
                  className={`border-b border-slate-800/60 cursor-pointer transition-colors hover:bg-slate-800/50 group ${i % 2 === 0 ? "bg-slate-900/20" : ""}`}
                >
                  {/* Produit */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-emerald-500/30 transition-colors">
                        <Package size={13} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-100">{produit.nom}</p>
                        <p className="font-mono text-[10px] text-slate-600">{produit.id_produit}</p>
                      </div>
                    </div>
                  </td>
                  {/* Catégorie */}
                  <td className="px-4 py-3">
                    <CategoryBadge cat={produit.categorie ?? ''} />
                  </td>
                  {/* Collaborateur */}
                  <td className="px-4 py-3">
                    {collab && <CollabBadge name={collab.nom} />}
                  </td>
                  {/* Lots actifs */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] text-slate-200">{produit.lotsActifs ?? 0}</span>
                  </td>
                  {/* Stock total */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] text-slate-200">{fmt(produit.stockTotal ?? 0)}</span>
                  </td>
                  {/* CA */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] font-semibold text-emerald-400">{fmtXOF(produit.chiffreAffaires ?? 0)}</span>
                  </td>
                  {/* Arrow */}
                  <td className="px-4 py-3 text-right">
                    <ChevronRight
                      size={14}
                      className="text-slate-700 group-hover:text-emerald-400 transition-colors ml-auto"
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[12px] text-slate-600">
                  Aucun produit ne correspond à vos critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Drawer ── */}
      {selectedProduit && (
        <LotExplorer
          produit={selectedProduit}
          onClose={() => setSelectedProduit(null)}
          collaborateurs={collaborateurs}
          pointsDeVente={pointsDeVente}
          lots={lots
            .filter(l => l.id_produit === selectedProduit.id_produit)
            .map(l => mapToLotActif(l, selectedProduit))}
        />
      )}
    </div>
  );
}
