'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, WarningIcon, InfoIcon, SpinnerIcon, CloseIcon } from '@/components/icons/Icons'

export type ToastType = 'success' | 'error' | 'warning' | 'loading' | 'info'

interface ToastProps {
  id: number
  message: string
  type: ToastType
  progress?: number
  onDismiss: (id: number) => void
  exiting?: boolean
}

const STYLES: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', border: 'border-l-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  error: { bg: 'bg-red-500/10 dark:bg-red-500/15', border: 'border-l-red-500', text: 'text-red-700 dark:text-red-300' },
  warning: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', border: 'border-l-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  loading: { bg: 'bg-blue-500/10 dark:bg-blue-500/15', border: 'border-l-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  info: { bg: 'bg-white/80 dark:bg-slate-800/80', border: 'border-l-slate-400 dark:border-l-slate-500', text: 'text-slate-700 dark:text-slate-300' },
}

const ICONS: Record<ToastType, React.FC<{ className?: string }>> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: WarningIcon,
  loading: SpinnerIcon,
  info: InfoIcon,
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  loading: 'text-blue-500',
  info: 'text-slate-400',
}

const Toast = ({ id, message, type, progress, onDismiss, exiting }: ToastProps) => {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (type !== 'loading') return
    const interval = setInterval(() => {
      setDots((prev) => (prev === '...' ? '.' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [type])

  const style = STYLES[type]
  const Icon = ICONS[type]

  return (
    <div
      className={`pointer-events-auto min-w-[320px] max-w-md p-4 rounded-lg border-l-4 backdrop-blur-md shadow-lg ${style.bg} ${style.border} ${exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`w-5 h-5 ${ICON_COLORS[type]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${style.text}`}>
            {message}
            {type === 'loading' && <span className="ml-1">{dots}</span>}
          </p>
          {progress !== undefined && (
            <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        {type !== 'loading' && (
          <button
            onClick={() => onDismiss(id)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  )
}

export default Toast
