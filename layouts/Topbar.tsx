'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import UserOverlay from '@/components/UserOverlay/UserOverlay'
import SettingsDropdown from '@/components/SettingsDropdown/SettingsDropdown'
import NotificationBell from '@/components/Topbar/NotificationBell'

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
  const { currentUser } = useAuth()
  const [isUserOverlayOpen, setIsUserOverlayOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  // Close overflow dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false)
      }
    }
    if (isOverflowOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOverflowOpen])

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-6 transition-colors">
        {/* Left: toggle + logo + title */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 mr-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-navy dark:hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Basculer le menu latéral"
            >
              {isMobileSidebarMode ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg
                  className={`w-5 h-5 transform transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          )}

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-navy-dark font-bold text-lg">
              P
            </div>
            <div className="hidden md:block">
              <h1 className="text-navy-dark dark:text-white font-bold text-lg leading-tight">PEJAA</h1>
              <p className="text-navy-soft text-xs">Admin</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-navy-dark dark:text-white truncate min-w-0">
            {pageTitle}
          </h2>
        </div>

        {/* Right actions — gap-4 matches Pejaa_Front */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {rightActions}

          {/* Desktop: theme toggle
              isDark=null pendant le premier render → placeholder neutre,
              pas de divergence SSR/client, pas de clignotement. */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex p-2 text-slate-600 dark:text-slate-300 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title={isDark === null ? '' : isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark === null ? (
              <span className="w-6 h-6 inline-block" />
            ) : isDark ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Desktop: Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="hidden md:flex p-2 text-slate-600 dark:text-slate-300 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Paramètres"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Desktop: Notifications */}
          <div className="hidden md:flex">
            <NotificationBell />
          </div>

          {/* Mobile: Overflow dropdown (theme + settings + notifications) */}
          <div className="relative md:hidden" ref={overflowRef}>
            <button
              onClick={() => setIsOverflowOpen(prev => !prev)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Plus d'options"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {isOverflowOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                <button
                  onClick={() => { toggleTheme(); setIsOverflowOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {isDark === null ? (
                    <span className="w-5 h-5 inline-block" />
                  ) : isDark ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {isDark === null ? '' : isDark ? 'Mode clair' : 'Mode sombre'}
                </button>
                <button
                  onClick={() => { setIsSettingsOpen(true); setIsOverflowOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Paramètres
                </button>
                <button
                  onClick={() => setIsOverflowOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notifications
                </button>
              </div>
            )}
          </div>

          {/* User avatar */}
          <button
            onClick={() => setIsUserOverlayOpen(true)}
            className="w-9 h-9 bg-gradient-to-br from-primary to-primary-strong rounded-full flex items-center justify-center text-white text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
          >
            {currentUser?.prenom?.[0]}{currentUser?.nom?.[0]}
          </button>
        </div>
      </header>

      {/* User overlay */}
      <UserOverlay
        isOpen={isUserOverlayOpen}
        onClose={() => setIsUserOverlayOpen(false)}
      />

      {/* Settings dropdown */}
      <SettingsDropdown
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  )
}

export default Topbar

