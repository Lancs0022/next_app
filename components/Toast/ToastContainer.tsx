'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import Toast from './Toast'
import type { ToastType } from './Toast'

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => number
  dismissToast: (id: number) => void
  updateToast: (id: number, updates: { message?: string; type?: ToastType; progress?: number }) => void
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => 0,
  dismissToast: () => {},
  updateToast: () => {},
})

export const useToast = () => useContext(ToastContext)

interface ToastItem {
  id: number
  message: string
  type: ToastType
  progress?: number
  exiting?: boolean
}

const AUTO_DISMISS_MS: Partial<Record<ToastType, number>> = {
  success: 4000,
  info: 4000,
  warning: 6000,
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const hoveredRef = useRef<Set<number>>(new Set())

  const dismissToast = useCallback((id: number) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      const timer = timersRef.current.get(id)
      if (timer) {
        clearTimeout(timer)
        timersRef.current.delete(id)
      }
      hoveredRef.current.delete(id)
    }, 250)
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number): number => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev.slice(-4), { id, message, type }])

      const autoMs = duration ?? AUTO_DISMISS_MS[type]
      if (autoMs) {
        const timer = setTimeout(() => {
          // Only dismiss if not hovered
          if (!hoveredRef.current.has(id)) {
            dismissToast(id)
          }
        }, autoMs)
        timersRef.current.set(id, timer)
      }

      return id
    },
    [dismissToast]
  )

  const updateToast = useCallback(
    (id: number, updates: { message?: string; type?: ToastType; progress?: number }) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
    },
    []
  )

  // Freeze on hover — clear the dismiss timer; resume on mouse leave
  const handleMouseEnter = useCallback((id: number) => {
    hoveredRef.current.add(id)
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const handleMouseLeave = useCallback((id: number) => {
    hoveredRef.current.delete(id)
    // Restart auto-dismiss with remaining time (simplified: use full duration)
    const toast = toasts.find((t) => t.id === id)
    if (toast && toast.type !== 'loading' && toast.type !== 'error') {
      const autoMs = AUTO_DISMISS_MS[toast.type] ?? 4000
      const timer = setTimeout(() => dismissToast(id), autoMs)
      timersRef.current.set(id, timer)
    }
  }, [toasts, dismissToast])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, updateToast }}>
      {children}
      {/* Positioned top-right, below topbar — matches Pejaa_Front */}
      <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onMouseEnter={() => handleMouseEnter(toast.id)}
            onMouseLeave={() => handleMouseLeave(toast.id)}
          >
            <Toast
              id={toast.id}
              message={toast.message}
              type={toast.type}
              progress={toast.progress}
              exiting={toast.exiting}
              onDismiss={dismissToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
