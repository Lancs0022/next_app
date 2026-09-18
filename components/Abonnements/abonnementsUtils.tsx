import React, { useState, useEffect, useRef } from 'react'
import { AlertCircle, Clock, MoreVertical } from 'lucide-react'
import {
  AbonnementStatut,
  SouscriptionStatut,
  Souscription,
  PaySt,
  FiltresSouscription,
} from './abonnementsTypes'

export const PERIODICITE_LABELS: Record<string, string> = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel',
  ponctuel: 'Ponctuel',
}

export const PERIODICITE_DUREE: Record<string, string> = {
  mensuel: '1 mois',
  trimestriel: '3 mois',
  annuel: '1 an',
  ponctuel: 'Unique',
}

export const FILTRES: { id: FiltresSouscription; label: string }[] = [
  { id: 'TOUTES',    label: 'Toutes' },
  { id: 'ACTIVE',    label: 'Actives' },
  { id: 'IMPAYEES',  label: 'Impayées' },
  { id: 'TERMINEE',  label: 'Terminées' },
  { id: 'ANNULEE',   label: 'Annulées' },
]

export function badgeOffre(statut: AbonnementStatut) {
  const map: Record<AbonnementStatut, string> = {
    ACTIVE:   'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    INACTIVE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    ARCHIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }
  const labels: Record<AbonnementStatut, string> = {
    ACTIVE: 'Active', INACTIVE: 'Inactive', ARCHIVED: 'Archivée',
  }
  return { cls: map[statut] ?? map.INACTIVE, label: labels[statut] ?? statut }
}

export function badgeSouscription(statut: SouscriptionStatut) {
  const map: Record<SouscriptionStatut, string> = {
    ACTIVE:    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    SUSPENDUE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    TERMINEE:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    ANNULEE:   'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  const labels: Record<SouscriptionStatut, string> = {
    ACTIVE: 'Active', SUSPENDUE: 'Suspendue', TERMINEE: 'Terminée', ANNULEE: 'Annulée',
  }
  return { cls: map[statut] ?? map.TERMINEE, label: labels[statut] ?? statut }
}

export function badgeEcheance(statut: string) {
  const map: Record<string, string> = {
    en_attente:          'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    partiellement_payee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    payee:               'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    annulee:             'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    a_venir:             'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    impayee:             'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    partiellement_payee: 'Partielle',
    payee: 'Payée',
    annulee: 'Annulée',
    a_venir: 'À venir',
    impayee: 'Impayée',
  }
  return { cls: map[statut] ?? 'bg-slate-100 text-slate-600', label: labels[statut] ?? statut }
}

export function formatMontant(n: number) {
  return new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(n) + ' Ar'
}

export function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
  const col = palette[(name?.charCodeAt(0) || 0) % palette.length]
  const init = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: col,
        color: '#fff',
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {init}
    </div>
  )
}

export function RenewBadge({ auto }: { auto: boolean }) {
  return auto ? (
    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded whitespace-nowrap">
      Auto
    </span>
  ) : (
    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 dark:bg-slate-700/50 dark:text-slate-400 px-1.5 py-0.5 rounded whitespace-nowrap">
      Manuel
    </span>
  )
}

export function SitBadge({ statut }: { statut: string }) {
  const map: Record<string, { l: string; cls: string }> = {
    ACTIVE: { l: 'Active', cls: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300' },
    SUSPENDUE: { l: 'Suspendue', cls: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300' },
    TERMINEE: { l: 'Terminée', cls: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
    ANNULEE: { l: 'Annulée', cls: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300' },
  }
  const item = map[statut] ?? { l: statut, cls: 'text-slate-600 bg-slate-100' }
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${item.cls}`}>
      {item.l}
    </span>
  )
}

export function EchBadge({ statut }: { statut: string }) {
  const map: Record<string, { l: string; cls: string }> = {
    payee: { l: 'Payée', cls: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300' },
    impayee: { l: 'Impayée', cls: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300' },
    en_attente: { l: 'En attente', cls: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300' },
    partiellement_payee: { l: 'Partielle', cls: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300' },
    a_venir: { l: 'À venir', cls: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
  }
  const item = map[statut] ?? { l: statut, cls: 'text-slate-600 bg-slate-100' }
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${item.cls}`}>
      {item.l}
    </span>
  )
}

export function PayLabel({ statut }: { statut: PaySt }) {
  if (statut === 'a_jour') {
    return (
      <span className="text-xs font-medium text-green-600 dark:text-green-400 inline-flex items-center gap-1">
        <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 6l1.7 1.7L8.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        À jour
      </span>
    )
  }
  if (statut === 'impayee') {
    return (
      <span className="text-xs font-medium text-red-600 dark:text-red-400 inline-flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />
        Impayée
      </span>
    )
  }
  return (
    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
      <Clock className="w-3.5 h-3.5" />
      En attente
    </span>
  )
}

export function getSousPaiementStatut(s: Souscription): PaySt {
  if (!s.prochaine_echeance) return 'a_jour'
  if (s.prochaine_echeance.statut === 'impayee') return 'impayee'
  if (s.prochaine_echeance.statut === 'en_attente' || s.prochaine_echeance.statut === 'partiellement_payee') {
    return s.prochaine_echeance.reste > 0 ? 'impayee' : 'en_attente'
  }
  return 'a_jour'
}

export function collabGlobalPay(subs: Souscription[]): PaySt {
  if (subs.some(s => getSousPaiementStatut(s) === 'impayee')) return 'impayee'
  if (subs.some(s => getSousPaiementStatut(s) === 'en_attente' || getSousPaiementStatut(s) === 'partielle')) return 'en_attente'
  return 'a_jour'
}

export interface ActionItem {
  label: string
  onClick: () => void
  variant?: string
}

export function InlineActionsMenu({ actions }: { actions: ActionItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!actions.length) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev) }}
        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        title="Actions"
        aria-label="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-30 overflow-hidden">
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); a.onClick() }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                a.variant === 'danger'
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 text-slate-400">{icon}</div>
      <p className="text-base font-medium text-slate-900 dark:text-white mb-1">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
