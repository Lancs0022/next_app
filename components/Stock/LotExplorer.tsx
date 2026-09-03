'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Package, Building2, CalendarDays, Boxes,
  TrendingUp, DollarSign, ChevronRight, LayoutGrid, List, SlidersHorizontal,
} from 'lucide-react'
import { LotDetailModal } from './LotDetailModal'
import { StockRatioBadge } from './Badges'
import { fmt, fmtXOF } from './formatters'
import type { ProduitCatalogue, PointDeVente, Collaborateur, LotActif } from './types'
import type { ActionMenuId } from './ActionMenu'
import DateRangeFilter from '@/components/DateRangeFilter'

// ─── Menu contextuel flottant ─────────────────────────────────────────────────

function LotContextMenu({
  x, y, lot, onAction, onClose,
}: {
  x: number; y: number
  lot: LotActif
  onAction: (actionId: ActionMenuId, lot: LotActif) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const menuItems: { id: ActionMenuId; label: string; color?: string }[] = [
    { id: 'vendre',   label: '🛒 Vendre expressément ce lot' },
    { id: 'ajuster',  label: '⚖️ Ajuster la quantité' },
    { id: 'transfert',label: '↔️ Transférer vers un autre PV' },
    { id: 'prix',     label: '💰 Ajuster le prix et la marge' },
    { id: 'annuler',  label: '🔴 Annuler des ventes sur ce lot', color: 'text-red-600 dark:text-red-400' },
  ]

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}
      className="w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl py-1 overflow-hidden"
    >
      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Lot #{lot.id}
        </p>
      </div>
      {menuItems.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => { onAction(item.id, lot); onClose() }}
          className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${item.color ?? 'text-slate-700 dark:text-slate-200'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ─── Types filtres ────────────────────────────────────────────────────────────

interface LotFilters {
  showDispo: boolean
  showEpuise: boolean
  livraisonId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dateFilter: Record<string, any> | null
}

const DEFAULT_FILTERS: LotFilters = {
  showDispo: true,
  showEpuise: false,
  livraisonId: '',
  dateFilter: null,
}

// ─── Mini composant Switch ────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
  colorOn = 'bg-emerald-500',
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  colorOn?: string
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? colorOn : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </div>
      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{label}</span>
    </label>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function LotExplorer({
  produit,
  onClose,
  collaborateurs,
  pointsDeVente,
  lots,
  onLotAction,
}: {
  produit: ProduitCatalogue
  onClose: () => void
  collaborateurs: Record<string, Collaborateur>
  pointsDeVente: Record<string, PointDeVente>
  lots: LotActif[]
  onLotAction?: (actionId: ActionMenuId, lot: LotActif) => void
}) {
  const [selectedLot, setSelectedLot] = useState<LotActif | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')
  const [filters, setFilters] = useState<LotFilters>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lot: LotActif } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, lot: LotActif) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, lot })
  }, [])

  // ── Livraisons uniques pour le filtre ───────────────────────────────────────
  const livraisonOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: { value: string; label: string }[] = []
    for (const lot of lots) {
      if (!seen.has(lot.livraisonId)) {
        seen.add(lot.livraisonId)
        options.push({
          value: lot.livraisonId,
          label: `Livraison #${lot.livraisonId}`,
        })
      }
    }
    return options
  }, [lots])

  // ── Filtrage ────────────────────────────────────────────────────────────────
  const filteredLots = useMemo(() => {
    const { dateMin, dateMax, target } = (() => {
      const df = filters.dateFilter
      if (!df) return { dateMin: null, dateMax: null, target: 'date_livraison' }
      return {
        dateMin: df.dateMin ? new Date(df.dateMin).getTime() : null,
        dateMax: df.dateMax ? new Date(df.dateMax + 'T23:59:59').getTime() : null,
        target: df.target || 'date_livraison',
      }
    })()

    return lots.filter(lot => {
      const isEpuise = lot.quantiteActuelle <= 0
      const isDispo = !isEpuise

      if (isDispo && !filters.showDispo) return false
      if (isEpuise && !filters.showEpuise) return false
      if (filters.livraisonId && lot.livraisonId !== filters.livraisonId) return false

      if (dateMin !== null || dateMax !== null) {
        // Choisir le champ date selon la cible
        const dateStr =
          target === 'date_creation' ? lot.createdAt :
          target === 'date_vente'    ? lot.createdAt  // pas de champ direct, à améliorer plus tard
          : lot.dateArrivee

        if (!dateStr) return false
        const ts = new Date(dateStr).getTime()
        if (dateMin !== null && ts < dateMin) return false
        if (dateMax !== null && ts > dateMax) return false
      }

      return true
    })
  }, [lots, filters])

  // ── Métriques TOUJOURS sur tous les lots (pas seulement filtrés) ───────────
  const totalBenefice = lots.reduce((s, l) => s + (l.benefice ?? l.quantiteVendue * l.marge), 0)
  const totalStock = filteredLots.reduce((s, l) => s + l.quantiteActuelle, 0)
  const countDispo = lots.filter(l => l.quantiteActuelle > 0).length
  const countEpuise = lots.filter(l => l.quantiteActuelle <= 0).length

  // "Filtres avancés" actifs = uniquement livraison ou date (PAS les switches)
  const hasAdvancedFilters =
    filters.livraisonId !== '' ||
    filters.dateFilter !== null

  // Le bouton filtres avancés ne prend en compte que les filtres avancés
  const hasActiveFilters = hasAdvancedFilters

  const resetFilters = () => setFilters(DEFAULT_FILTERS)
  const resetAdvancedFilters = () => setFilters(f => ({ ...f, livraisonId: '', dateFilter: null }))
  const displayMode = filteredLots.length === 1 ? 'list' : viewMode

  // Unité du produit (commune à tous les lots du même produit)
  const uniteCode = lots[0]?.unite_code ?? null
  const estDecimal = lots[0]?.est_decimal ?? false
  const uniteSuffix = uniteCode ? ` ${uniteCode}` : ''

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-10 bg-white dark:bg-slate-950">

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{produit.nom}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {filteredLots.length} lot{filteredLots.length > 1 ? 's' : ''} affiché{filteredLots.length > 1 ? 's' : ''}
                {lots.length !== filteredLots.length && ` sur ${lots.length}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Métriques rapides */}
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
            <Boxes className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Dispo</span>
            <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{countDispo}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
            <Package className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Stock</span>
            <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">{fmt(totalStock)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-red-300/50 bg-red-50/50 px-3 py-1.5 dark:border-red-500/25 dark:bg-red-500/5">
            <DollarSign className="h-3 w-3 text-red-500 dark:text-red-400" />
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Épuisés</span>
            <span className="font-mono text-xs font-semibold text-red-600 dark:text-red-400">{countEpuise}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-50/50 px-3 py-1.5 dark:border-emerald-500/25 dark:bg-emerald-500/5">
            <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Bénéfice</span>
            <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">{fmtXOF(totalBenefice)}</span>
          </div>

          {/* Switches visibles en permanence — hors panneau filtres avancés */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
            <Toggle
              label="Dispo"
              checked={filters.showDispo}
              onChange={v => setFilters(f => ({ ...f, showDispo: v }))}
              colorOn="bg-emerald-500"
            />
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-2" />
            <Toggle
              label="Épuisés"
              checked={filters.showEpuise}
              onChange={v => setFilters(f => ({ ...f, showEpuise: v }))}
              colorOn="bg-red-500"
            />
          </div>

          {/* Bouton filtres avancés — couleur active seulement sur livraison/date */}
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all shadow-sm ${
              showFilters || hasActiveFilters
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-900/40'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400 dark:hover:border-indigo-500'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 bg-white/25 dark:bg-white/20 text-white rounded-full text-[10px] font-bold leading-none">
                ●
              </span>
            )}
          </button>

          {/* Toggle vue */}
          <div className="inline-flex rounded-full border border-slate-300 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <List className="h-3.5 w-3.5" /> Liste
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Carte
            </button>
          </div>
        </div>
      </div>

      {/* ── Barre de filtres ─────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-4">
          {/* Livraison + DateRangeFilter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Livraison</label>
              <select
                value={filters.livraisonId}
                onChange={e => setFilters(f => ({ ...f, livraisonId: e.target.value }))}
                className="w-full h-[42px] px-3 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Toutes les livraisons</option>
                {livraisonOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <DateRangeFilter
                label="Filtre par date"
                value={filters.dateFilter}
                onChange={df => setFilters(f => ({ ...f, dateFilter: df }))}
                defaultTarget="date_livraison"
              />
            </div>
          </div>

          {/* Réinitialiser les filtres avancés seulement */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={resetAdvancedFilters}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Résultats ────────────────────────────────────────────────────────── */}
      {filteredLots.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <div>
            <Package className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              {hasActiveFilters ? 'Aucun lot ne correspond aux filtres' : 'Aucun lot disponible'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Réinitialiser les filtres
              </button>
            )}
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
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredLots.map((lot) => {
                const pdv = pointsDeVente[lot.pdvId]
                const isEpuise = lot.quantiteActuelle <= 0
                return (
                  <tr
                    key={lot.id}
                    onClick={() => setSelectedLot(lot)}
                    onContextMenu={e => handleContextMenu(e, lot)}
                    className={`cursor-pointer border-t border-slate-200 transition dark:border-slate-700 ${
                      isEpuise
                        ? 'bg-slate-50 opacity-60 hover:opacity-80 dark:bg-slate-900'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900'
                    }`}
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Lot #{lot.id}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Liv #{lot.livraisonId}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{lot.pdvNom || pdv?.nom || `PV #${lot.pdvId}`}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{lot.pdvVille || pdv?.ville}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-slate-900 dark:text-slate-100">
                        {fmt(lot.quantiteActuelle)}{uniteSuffix} / {fmt(lot.quantiteInitiale)}{uniteSuffix}
                      </div>
                      <StockRatioBadge current={lot.quantiteActuelle} initial={lot.quantiteInitiale} />
                      {uniteCode && (
                        <span className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                          estDecimal
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                        }`}>
                          {uniteCode}
                          {estDecimal && <span className="text-[8px] opacity-60 ml-0.5">dec</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-slate-900 dark:text-slate-100">{fmtXOF(lot.prixInitial + lot.marge)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Prix: {fmtXOF(lot.prixInitial)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Marge: {fmtXOF(lot.marge)}</div>
                    </td>
                    <td className="px-4 py-4 align-top font-semibold text-blue-700 dark:text-blue-300">
                      {fmt(lot.quantiteVendue)}{uniteSuffix}
                    </td>
                    <td className="px-4 py-4 align-top text-slate-500 dark:text-slate-400">
                      {new Date(lot.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {isEpuise ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Épuisé</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">En stock</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLots.map((lot) => {
            const pdv = pointsDeVente[lot.pdvId]
            const pct = lot.quantiteInitiale > 0 ? (lot.quantiteActuelle / lot.quantiteInitiale) * 100 : 0
            const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500'
            const isEpuise = lot.quantiteActuelle <= 0

            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => setSelectedLot(lot)}
                onContextMenu={e => handleContextMenu(e, lot)}
                className={`group flex flex-col gap-3 rounded-lg border p-4 text-left shadow-sm transition-all ${
                  isEpuise
                    ? 'border-slate-200 bg-slate-50 opacity-70 hover:opacity-90 dark:border-slate-700 dark:bg-slate-800/40'
                    : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-400/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {lot.pdvNom || pdv?.nom || `PV #${lot.pdvId}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{lot.pdvVille || pdv?.ville}</p>
                  </div>
                  {isEpuise ? (
                    <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Épuisé
                    </span>
                  ) : (
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">Liv #{lot.livraisonId}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-slate-700 dark:bg-slate-700/50 dark:text-slate-300">Lot #{lot.id}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">
                    {new Date(lot.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </span>
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
                  <p className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300">
                    {fmt(lot.quantiteVendue)}{uniteSuffix}
                  </p>
                </div>
                {!isEpuise && (
                  <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium">Détails</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            )
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

      {contextMenu && (
        <LotContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          lot={contextMenu.lot}
          onAction={(actionId, lot) => {
            onLotAction?.(actionId, lot)
            setContextMenu(null)
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
