'use client'

import { useEffect } from 'react'
import { Z_MODAL, Z_MODAL_NESTED } from '@/lib/zIndex'

const Modal = ({ open, title, children, onClose, footer, zIndex = Z_MODAL, preventBackdropClose = false, size = 'default' }: {
  open: boolean
  title?: React.ReactNode
  children?: React.ReactNode
  onClose?: () => void
  footer?: React.ReactNode
  zIndex?: number
  preventBackdropClose?: boolean
  size?: 'default' | 'large'
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

  const maxWidth = size === 'large' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => !preventBackdropClose && onClose?.()}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className={`pointer-events-auto w-full ${maxWidth} max-h-[min(90vh,720px)] flex flex-col rounded-xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in`}>
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
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

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 min-h-0">
            {children}
          </div>

          {footer && (
            <div className="px-4 md:px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { Z_MODAL_NESTED }
export default Modal
