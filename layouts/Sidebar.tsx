'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarItem {
  id: string
  label: string
  path?: string
  icon?: string
  roles: string[]
  children?: SidebarItem[]
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', roles: ['admin', 'super_admin', 'employe'] },
  { id: 'stock', label: 'Stock', path: '/stock', roles: ['admin', 'super_admin', 'employe'] },
  { id: 'ventes', label: 'Ventes', path: '/ventes', roles: ['admin', 'super_admin', 'employe'] },
  { id: 'collaborateurs', label: 'Collaborateurs', path: '/collaborateurs', roles: ['admin', 'super_admin'] },
  {
    id: 'finance',
    label: 'Finance',
    roles: ['admin', 'super_admin'],
    children: [
      { id: 'finance-transactions', label: 'Transactions', path: '/finance/transactions', roles: ['admin', 'super_admin'] },
    ],
  },
  { id: 'config', label: 'Paramètres', path: '/config', roles: ['admin', 'super_admin'] },
]

interface SidebarProps {
  activeRoute?: string
  isCollapsed?: boolean
  onNavigate?: () => void
}

const Sidebar = ({ activeRoute = '/dashboard', isCollapsed = false, onNavigate }: SidebarProps) => {
  const { currentUser } = useAuth()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const role = currentUser?.role

  const visibleItems = sidebarItems
    .map((item) => {
      if (item.children) {
        const visibleChildren = item.children.filter((c) => role && c.roles.includes(role))
        if (visibleChildren.length === 0) return null
        return { ...item, children: visibleChildren }
      }
      return role && item.roles.includes(role) ? item : null
    })
    .filter(Boolean) as SidebarItem[]

  const isOpen = !isCollapsed

  return (
    <aside
      className={`${isOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 to-slate-800 min-h-screen transition-all duration-300 ease-in-out flex flex-col`}
    >
      {currentUser && (
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {currentUser.prenom?.[0]}{currentUser.nom?.[0]}
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {currentUser.prenom} {currentUser.nom}
                </p>
                <p className="text-slate-400 text-xs truncate">{currentUser.role}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <nav className="flex-1 py-6 px-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            if (item.children) {
              const isGroupOpen = openGroups[item.id] ?? false
              const isGroupActive = item.children.some((c) => activeRoute === c.path)
              return (
                <li key={item.id}>
                  <button
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isGroupActive ? 'text-white bg-slate-700' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [item.id]: !isGroupOpen }))}
                  >
                    <span>{isOpen ? item.label : item.label[0]}</span>
                    {isOpen && <span>{isGroupOpen ? '−' : '+'}</span>}
                  </button>
                  {isGroupOpen && isOpen && (
                    <ul className="mt-1 space-y-1 pl-4">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={child.path!}
                            onClick={onNavigate}
                            className={`block px-4 py-2 rounded-lg text-sm transition-all ${
                              activeRoute === child.path
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            }
            const isActive = activeRoute === item.path
            return (
              <li key={item.id}>
                <Link
                  href={item.path!}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <span>{isOpen ? item.label : item.label[0]}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
