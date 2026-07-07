'use client'

import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Sliders, ArrowLeftRight, DollarSign, Settings, ChevronDown } from "lucide-react";

export type ActionMenuId = "vendre" | "ajuster" | "transfert" | "prix" | null;

const ACTIONS = [
  {
    id: "vendre" as ActionMenuId,
    label: "Vendre expressément ce lot",
    icon: ShoppingCart,
    color: "text-emerald-400 hover:bg-emerald-500/10",
    note: "Redirige vers la saisie globale des ventes avec ce produit pré-sélectionné.",
  },
  {
    id: "ajuster" as ActionMenuId,
    label: "Ajuster la quantité (Inventaire/Casse)",
    icon: Sliders,
    color: "text-amber-400 hover:bg-amber-500/10",
    note: "Ajoute une entrée dans stock_mouvement (type: ajustement) et stock_ajustement. Motif obligatoire.",
  },
  {
    id: "transfert" as ActionMenuId,
    label: "Transférer vers un autre Point de Vente",
    icon: ArrowLeftRight,
    color: "text-blue-400 hover:bg-blue-500/10",
    note: "Enregistre dans stock_transfert + double écriture dans stock_mouvement (sortie source + entrée destination).",
  },
  {
    id: "prix" as ActionMenuId,
    label: "Ajuster le prix et la marge du lot",
    icon: DollarSign,
    color: "text-violet-400 hover:bg-violet-500/10",
    note: "Met à jour livraison_item sans modifier l'historique des ventes fermées.",
  },
];

export function ActionMenu({
  onAction,
  onClose
}: {
  onAction: (actionId: ActionMenuId) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-slate-600 bg-slate-800 shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-slate-700">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          Actions ERP
        </p>
      </div>
      {ACTIONS.map(({ id, label, icon: Icon, color, note }) => (
        <button
          key={id}
          onClick={() => {
            onAction(id);
            onClose();
          }}
          className={`w-full flex items-start gap-3 px-3 py-2.5 transition-colors group ${color}`}
        >
          <Icon size={15} className="mt-0.5 shrink-0" />
          <div className="text-left">
            <p className="text-[13px] font-medium text-slate-200 group-hover:text-white">
              {label}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{note}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export function ActionMenuTrigger({
  onAction
}: {
  onAction: (actionId: ActionMenuId) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-600 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 text-[12px] font-medium transition-colors"
      >
        <Settings size={13} />
        Paramètres
        <ChevronDown size={11} />
      </button>
      {open && <ActionMenu onAction={onAction} onClose={() => setOpen(false)} />}
    </div>
  );
}