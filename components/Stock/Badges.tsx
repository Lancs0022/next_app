'use client'

import { Package, CircleDot, Building2, Tag, TrendingUp, Boxes, CalendarDays, Hash, ReceiptText, ShoppingCart, Sliders, ArrowLeftRight, DollarSign, Settings, ChevronDown, X } from "lucide-react";

// Category badge component
export function CategoryBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    "Textile": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Parfumerie": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Maroquinerie": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Cosmétique": "bg-pink-500/10 text-pink-400 border-pink-500/20",
    "Décoration": "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "Alimentaire": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "Bijouterie": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${colors[cat] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {cat}
    </span>
  );
}

// Collaborator badge component
export function CollabBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold tracking-wide">
      <CircleDot size={9} className="opacity-80" />
      {name}
    </span>
  );
}

// PDV (Point of Sale) badge component
export function PDVBadge({ name, city }: { name: string; city?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Building2 size={12} className="text-slate-500 shrink-0" />
      <span className="text-[12px] text-slate-200">{name}</span>
      {city && <span className="text-[10px] text-slate-500">({city})</span>}
    </div>
  );
}

// Stock ratio badge component
export function StockRatioBadge({
  current,
  initial,
  large
}: {
  current: number;
  initial: number;
  large?: boolean;
}) {
  const pct = initial > 0 ? (current / initial) * 100 : 0;
  const color =
    pct >= 70
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
      : pct >= 30
      ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
      : "bg-red-500/10 text-red-400 border-red-500/25";
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono border rounded px-2 py-0.5 ${color} ${large ? "text-sm font-semibold" : "text-[11px]"}`}
    >
      {current} / {initial}
    </span>
  );
}