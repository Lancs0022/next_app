'use client'

import { useEffect } from 'react'

const Modal = ({ open, title, children, onClose, footer, zIndex = 'z-50', preventBackdropClose = false }: {
  open: boolean
  title?: React.ReactNode
  children?: React.ReactNode
  onClose?: () => void
  footer?: React.ReactNode
  zIndex?: string
  preventBackdropClose?: boolean
}) => {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventBackdropClose) {
        onClose?.()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, preventBackdropClose])

  if (!open) return null

  return (
    <div className={`fixed inset-0 ${zIndex}`}>
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !preventBackdropClose && onClose?.()}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700">
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

          <div className="px-4 md:px-6 py-4">
            {children}
          </div>

          {footer && (
            <div className="px-4 md:px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Modal
