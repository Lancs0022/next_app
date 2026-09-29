'use client'

import React from 'react'
import DateRangeFilter from '@/components/DateRangeFilter'
import type { JournalFiltersState, StockEventType } from './journalTypes'

interface JournalFilterBarProps {
  filters: JournalFiltersState
  onSetFilters: React.Dispatch<React.SetStateAction<JournalFiltersState>>
  pointsDeVente: Array<{ id_pdv: number; nom: string }>
  collaborateurs: Array<{ id_utilisateur?: number; id_collaborateur?: number; nom: string; prenom?: string }>
  showAdvanced: boolean
  onToggleAdvanced: () => void
  onReset: () => void
}

export default function JournalFilterBar({
  filters,
  onSetFilters,
  pointsDeVente,
  collaborateurs,
  showAdvanced,
  onToggleAdvanced,
  onReset,
}: JournalFilterBarProps) {
  const hasAdvancedFilters = Boolean(
    filters.source_type ||
    filters.id_pdv ||
    filters.id_utilisateur ||
    filters.statut ||
    filters.date
  )

  const activePdv = pointsDeVente.find((p) => String(p.id_pdv) === String(filters.id_pdv))
  const activeCollab = collaborateurs.find(
    (c) => String(c.id_utilisateur || c.id_collaborateur) === String(filters.id_utilisateur)
  )

  const hasAnyFilter = Boolean(filters.q || filters.type || hasAdvancedFilters)

  return (
    <div className="space-y-3 mb-4">
      {/* ── Ligne principale : Recherche métier + Filtre rapide Type + Bouton Filtres avancés ── */}
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Recherche
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un produit, lot, événement, opérateur..."
              value={filters.q}
              onChange={(e) => onSetFilters((prev) => ({ ...prev, q: e.target.value }))}
              className="w-full h-[42px] pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filtre rapide Type */}
        <div className="w-full md:w-56">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            Type d'événement
          </label>
          <select
            value={filters.type}
            onChange={(e) => onSetFilters((prev) => ({ ...prev, type: e.target.value }))}
            className="w-full h-[42px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tous les types</option>
            <option value="ENTREE">Entrées</option>
            <option value="SORTIE">Sorties</option>
            <option value="TRANSFERT">Transferts</option>
            <option value="RETOUR">Retours</option>
            <option value="RESERVATION">Réservations</option>
            <option value="AJUSTEMENT">Ajustements</option>
            <option value="ANNULATION">Annulations</option>
          </select>
        </div>

        {/* Bouton Filtres avancés */}
        <button
          type="button"
          onClick={onToggleAdvanced}
          className={`inline-flex items-center justify-center gap-2 h-[42px] px-4 py-2 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            hasAdvancedFilters
              ? 'border-primary/50 bg-primary/5 text-primary dark:border-primary/60 dark:bg-primary/10'
              : 'border-slate-300 dark:border-slate-600 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filtres avancés
          {hasAdvancedFilters && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {/* ── Zone de filtres avancés (dépliable) ── */}
      {showAdvanced && (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Source métier */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Source métier
            </label>
            <select
              value={filters.source_type}
              onChange={(e) => onSetFilters((prev) => ({ ...prev, source_type: e.target.value }))}
              className="w-full h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            >
              <option value="">Toutes les sources</option>
              <option value="VENTE">Vente</option>
              <option value="LIVRAISON">Livraison</option>
              <option value="TRANSFERT">Transfert</option>
              <option value="AJUSTEMENT">Ajustement</option>
              <option value="RETOUR">Retour</option>
            </select>
          </div>

          {/* Point de vente / Lieu */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Lieu / Point de vente
            </label>
            <select
              value={filters.id_pdv}
              onChange={(e) => onSetFilters((prev) => ({ ...prev, id_pdv: e.target.value }))}
              className="w-full h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            >
              <option value="">Tous les lieux</option>
              {pointsDeVente.map((pv) => (
                <option key={pv.id_pdv} value={String(pv.id_pdv)}>
                  {pv.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Opérateur */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Opérateur
            </label>
            <select
              value={filters.id_utilisateur}
              onChange={(e) => onSetFilters((prev) => ({ ...prev, id_utilisateur: e.target.value }))}
              className="w-full h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            >
              <option value="">Tous les opérateurs</option>
              {collaborateurs.map((c) => {
                const id = String(c.id_utilisateur || c.id_collaborateur)
                const name = `${c.prenom ? `${c.prenom} ` : ''}${c.nom}`.trim()
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Statut métier */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Statut
            </label>
            <select
              value={filters.statut}
              onChange={(e) => onSetFilters((prev) => ({ ...prev, statut: e.target.value }))}
              className="w-full h-[40px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="payee">Payée</option>
              <option value="valide">Validé</option>
              <option value="annule">Annulé</option>
              <option value="en_attente">En attente</option>
            </select>
          </div>

          {/* Période (DateRangeFilter) */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Période
            </label>
            <DateRangeFilter
              value={filters.date}
              onChange={(val) => onSetFilters((prev) => ({ ...prev, date: val }))}
            />
          </div>

          {/* Bouton Réinitialiser */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={onReset}
              className="w-full h-[40px] px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* ── Badges des filtres actifs ── */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            Filtres actifs :
          </span>

          {filters.q && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary dark:bg-primary/20">
              Recherche : &quot;{filters.q}&quot;
              <button
                type="button"
                onClick={() => onSetFilters((prev) => ({ ...prev, q: '' }))}
                className="hover:opacity-75 font-bold"
                aria-label="Supprimer le filtre recherche"
              >
                ×
              </button>
            </span>
          )}

          {filters.type && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Type : {filters.type}
              <button
                type="button"
                onClick={() => onSetFilters((prev) => ({ ...prev, type: '' }))}
                className="hover:opacity-75 font-bold"
                aria-label="Supprimer le filtre type"
              >
                ×
              </button>
            </span>
          )}

          {filters.source_type && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              Source : {filters.source_type}
              <button
                type="button"
                onClick={() => onSetFilters((prev) => ({ ...prev, source_type: '' }))}
                className="hover:opacity-75 font-bold"
                aria-label="Supprimer le filtre source"
              >
                ×
              </button>
            </span>
          )}

          {activePdv && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              Lieu : {activePdv.nom}
              <button
                type="button"
                onClick={() => onSetFilters((prev) => ({ ...prev, id_pdv: '' }))}
                className="hover:opacity-75 font-bold"
                aria-label="Supprimer le filtre lieu"
              >
                ×
              </button>
            </span>
          )}

          {activeCollab && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Opérateur : {activeCollab.prenom ? `${activeCollab.prenom} ` : ''}{activeCollab.nom}
              <button
                type="button"
                onClick={() => onSetFilters((prev) => ({ ...prev, id_utilisateur: '' }))}
                className="hover:opacity-75 font-bold"
                aria-label="Supprimer le filtre opérateur"
              >
                ×
              </button>
            </span>
          )}

          {filters.statut && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
              Statut : {filters.statut}
              <button
                type="button"
                onClick={() => onSetFilters((prev) => ({ ...prev, statut: '' }))}
                className="hover:opacity-75 font-bold"
                aria-label="Supprimer le filtre statut"
              >
                ×
              </button>
            </span>
          )}

          {filters.date && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
              Période : {filters.date.dateMin} au {filters.date.dateMax}
              <button
                type="button"
                onClick={() => onSetFilters((prev) => ({ ...prev, date: null }))}
                className="hover:opacity-75 font-bold"
                aria-label="Supprimer le filtre période"
              >
                ×
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white underline ml-auto"
          >
            Tout effacer
          </button>
        </div>
      )}
    </div>
  )
}
