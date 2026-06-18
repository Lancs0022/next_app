'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface UserOverlayProps {
  isOpen: boolean
  onClose: () => void
}

const UserOverlay = ({ isOpen, onClose }: UserOverlayProps) => {
  const { currentUser, logout } = useAuth()
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleLogout = () => {
    logout()
    router.push('/login')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      
      {/* User panel — matches Pejaa_Front spacing */}
      <div
        ref={overlayRef}
        className="absolute top-4 right-4 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Header with avatar */}
        <div className="p-5 bg-gradient-to-r from-primary to-primary-strong">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
              {currentUser?.prenom?.[0]}{currentUser?.nom?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">
                {currentUser?.prenom} {currentUser?.nom}
              </p>
              <p className="text-white/80 text-sm truncate">{currentUser?.role}</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Email</span>
              <span className="text-slate-900 dark:text-white font-medium truncate ml-3 max-w-[180px]">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Rôle</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {currentUser?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3">
          <button
            onClick={() => {
              console.log('Mon profil')
              onClose()
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-3"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mon profil
          </button>
          
          <button
            onClick={() => {
              console.log('Changer mot de passe')
              onClose()
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-3"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Changer mot de passe
          </button>

          <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-3"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserOverlay
