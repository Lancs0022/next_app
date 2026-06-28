'use client'

import { ReactNode } from 'react'

/** Uniform form field wrapper for dark entry forms (livraison / vente). */
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
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

export const formInputClass =
  'w-full h-[42px] px-3 border border-slate-600 rounded-lg bg-slate-900 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
