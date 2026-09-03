'use client'

import { ReactNode } from 'react'

/** Uniform form field wrapper — adapts to light/dark theme. */
export function FormField({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

/** Input class utilisé dans les saisies globales (livraison / vente).
 *  Compatible light ET dark — ne plus utiliser de classes bg/text hardcodées sombres. */
export const formInputClass =
  'w-full h-[42px] px-3 border border-slate-300 dark:border-slate-600 rounded-lg ' +
  'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-sm ' +
  'placeholder-slate-400 dark:placeholder-slate-500 ' +
  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ' +
  'transition-colors'
