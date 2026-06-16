'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface TopbarProps {
  pageTitle?: string
  rightActions?: React.ReactNode
  onToggleSidebar?: () => void
  isMobileSidebarMode?: boolean
  isSidebarCollapsed?: boolean
  isSidebarOverlayOpen?: boolean
}

const Topbar = ({
  pageTitle = 'Dashboard',
  rightActions,
  onToggleSidebar,
  isMobileSidebarMode = false,
  isSidebarCollapsed = false,
}: TopbarProps) => {
  const { isDark, toggleTheme } = useTheme()
  const { currentUser, logout } = useAuth()
  const router = useRouter()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-6 transition-colors">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Basculer le menu latéral"
          >
            <svg
              className={`w-5 h-5 transform transition-transform duration-300 ${isSidebarCollapsed && !isMobileSidebarMode ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMobileSidebarMode ? 'M4 6h16M4 12h16M4 18h16' : 'M15 19l-7-7 7-7'}
              />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">P</div>
          <div>
            <h1 className="text-slate-900 dark:text-white font-bold text-lg leading-none">PEJAA</h1>
            <p className="text-slate-500 text-xs">Admin</p>
          </div>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{pageTitle}</h2>
      </div>
      <div className="flex items-center gap-3">
        {rightActions}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
          {isDark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {currentUser?.prenom?.[0]}{currentUser?.nom?.[0]}
          </button>
          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{currentUser?.prenom} {currentUser?.nom}</p>
                <p className="text-xs text-slate-500">{currentUser?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
