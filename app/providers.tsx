'use client'

import { Provider as ReduxProvider } from 'react-redux'
import { store } from '@/redux/store'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/components/Toast/ToastContainer'
import { AuthProvider } from '@/contexts/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ReduxProvider store={store}>
            {children}
          </ReduxProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
