'use client'

/**
 * DetailPanel — composant générique de présentation structurée de données.
 *
 * Usage :
 *   <DetailPanel sections={[
 *     {
 *       title: 'Produit',
 *       color: 'emerald',
 *       fields: [
 *         { label: 'Nom', value: 'Huile vrac', span: 2 },
 *         { label: 'Unité', value: <UniteBadge code="L" />, type: 'node' },
 *         { label: 'Catégorie', value: 'Alimentaire' },
 *       ]
 *     }
 *   ]} />
 */

import React from 'react'

export type SectionColor = 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'slate' | 'purple'

export interface DetailField {
  label: string
  value: React.ReactNode
  /** span 2 = full row in a 2-col grid */
  span?: 1 | 2
  /** 'mono' rend la valeur en police monospace */
  mono?: boolean
  /** 'muted' rend la valeur en couleur atténuée */
  muted?: boolean
}

export interface DetailSection {
  title: string
  color?: SectionColor
  fields: DetailField[]
}

interface DetailPanelProps {
  sections: DetailSection[]
  className?: string
}

const COLOR_DOT: Record<SectionColor, string> = {
  emerald: 'bg-emerald-500',
  blue:    'bg-blue-500',
  indigo:  'bg-indigo-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  slate:   'bg-slate-400',
  purple:  'bg-purple-500',
}

export function DetailPanel({ sections, className = '' }: DetailPanelProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {sections.map((section, si) => (
        <section
          key={si}
          className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          {/* Section header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <span className={`h-2.5 w-2.5 rounded-sm shrink-0 ${COLOR_DOT[section.color ?? 'slate']}`} />
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
              {section.title}
            </h3>
          </div>

          {/* Fields grid */}
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900/40">
            {section.fields.map((field, fi) => (
              <div
                key={fi}
                className={field.span === 2 ? 'col-span-2' : 'col-span-1'}
              >
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                  {field.label}
                </p>
                <div
                  className={[
                    'text-sm leading-snug',
                    field.mono ? 'font-mono' : 'font-normal',
                    field.muted
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-900 dark:text-slate-100',
                  ].join(' ')}
                >
                  {field.value ?? <span className="text-slate-400 dark:text-slate-600">—</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ─── Helpers réutilisables dans les panels ───────────────────────────────────

/** Badge coloré pour l'unité de mesure */
export function UniteBadge({
  code,
  label,
  estDecimal = false,
}: {
  code: string
  label?: string
  estDecimal?: boolean
}) {
  const tooltip = label ? `Unité : ${label}${estDecimal ? ' (décimal)' : ''}` : undefined
  const colorClass = estDecimal
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${colorClass}`}
      title={tooltip}
    >
      {code}
      {estDecimal && (
        <span className="text-[9px] opacity-70 font-sans font-normal">dec</span>
      )}
    </span>
  )
}

/** Badge statut lot / vente */
export function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; className: string }> = {
    en_stock:              { label: 'En stock',       className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    epuise:                { label: 'Épuisé',          className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    archive:               { label: 'Archivé',         className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
    payee:                 { label: 'Payée',            className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    en_attente_paiement:   { label: 'En attente',      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    annulee:               { label: 'Annulée',          className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    retournee:             { label: 'Retournée',        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    actif:                 { label: 'Actif',            className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    inactif:               { label: 'Inactif',          className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  }
  const entry = map[statut]
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${entry?.className ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
      {entry?.label ?? statut}
    </span>
  )
}

/** Mouvement de stock type badge */
export function MouvementTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    entree:           'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    sortie:           'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    annulation_vente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    transfert:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    ajustement:       'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[type] ?? 'bg-slate-100 text-slate-700'}`}>
      {type}
    </span>
  )
}

/** Formate un montant en Ar */
export function fmtAr(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  return `${Number(value).toLocaleString('fr-FR')} Ar`
}

/** Formate une date courte */
export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    ...(withTime ? { timeStyle: 'short' } : {}),
  })
}
