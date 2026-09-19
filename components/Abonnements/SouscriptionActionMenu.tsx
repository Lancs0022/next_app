'use client'

import { useRef, useEffect } from 'react'
import {
  CreditCard,
  Plus,
  DollarSign,
  Pause,
  Play,
  XCircle,
  AlertOctagon,
} from 'lucide-react'

export type SouscriptionActionId =
  | 'paiement'
  | 'echeance'
  | 'tarif'
  | 'suspendre'
  | 'reactiver'
  | 'resilier'
  | 'annuler'

interface ActionItemDef {
  id: SouscriptionActionId
  label: string
  icon: React.ElementType
  color: string
  note: string
  visible: boolean
}

interface SouscriptionActionMenuProps {
  canPay: boolean
  isActive: boolean
  isSuspendue: boolean
  isTerminee: boolean
  isAnnulee: boolean
  onAction: (actionId: SouscriptionActionId) => void
  onClose: () => void
}

export default function SouscriptionActionMenu({
  canPay,
  isActive,
  isSuspendue,
  isTerminee,
  isAnnulee,
  onAction,
  onClose,
}: SouscriptionActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const actions: ActionItemDef[] = [
    {
      id: 'paiement',
      label: 'Enregistrer un paiement',
      icon: CreditCard,
      color: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
      note: 'Régler une ou plusieurs échéances en attente.',
      visible: canPay,
    },
    {
      id: 'echeance',
      label: 'Nouvelle échéance',
      icon: Plus,
      color: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10',
      note: 'Générer une échéance ponctuelle manuelle.',
      visible: isActive || isSuspendue,
    },
    {
      id: 'tarif',
      label: 'Changer le tarif',
      icon: DollarSign,
      color: 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10',
      note: 'Modifier le tarif applicable aux futures échéances.',
      visible: isActive || isSuspendue,
    },
    {
      id: 'suspendre',
      label: 'Suspendre la souscription',
      icon: Pause,
      color: 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10',
      note: 'Met en pause sans résilier le contrat.',
      visible: isActive,
    },
    {
      id: 'reactiver',
      label: 'Réactiver la souscription',
      icon: Play,
      color: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
      note: 'Reprendre la souscription active.',
      visible: isSuspendue || isTerminee,
    },
    {
      id: 'resilier',
      label: 'Résilier le contrat',
      icon: XCircle,
      color: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50',
      note: 'Fixe la date de fin à aujourd’hui et stoppe le renouvellement.',
      visible: isActive || isSuspendue,
    },
    {
      id: 'annuler',
      label: 'Annuler la souscription',
      icon: AlertOctagon,
      color: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10',
      note: 'Annule définitivement le contrat et ses échéances non soldées.',
      visible: !isAnnulee,
    },
  ]

  const visibleActions = actions.filter((a) => a.visible)

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-900/40">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Actions souscription
        </p>
      </div>

      <div className="py-1 max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/40">
        {visibleActions.map(({ id, label, icon: Icon, color, note }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              onAction(id)
              onClose()
            }}
            className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors group ${color}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-inherit">
                {label}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                {note}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
