'use client'

import { useEffect } from 'react'

import { Z_DRAWER } from '@/lib/zIndex'

const Drawer = ({ open, title, children, onClose, footer, wide = false, fullScreen = false }: {
  open: boolean
  title?: React.ReactNode
  children?: React.ReactNode
  onClose?: () => void
  footer?: React.ReactNode
  wide?: boolean
  fullScreen?: boolean
}) => {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0" style={{ zIndex: Z_DRAWER }}>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => onClose?.()}
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div className={`w-screen ${fullScreen ? 'max-w-full' : wide ? 'max-w-5xl' : 'max-w-lg'} bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-slide-in-right`}>
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {children}
          </div>

          {footer && (
            <div className="px-4 md:px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Drawer
