'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { iconMap } from '@/components/icons/Icons'

// Ported from Pejaa_Front sidebarConfig.js — full menu structure with role-based access
interface SidebarItem {
  id: string
  label: string
  path?: string
  icon?: string
  roles: string[]
  children?: SidebarItem[]
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    roles: ['super_admin', 'admin', 'manager', 'operateur', 'collaborateur'],
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: 'stock',
    roles: ['super_admin', 'admin', 'manager', 'operateur'],
    children: [
      {
        id: 'stock-main',
        label: 'Stock / Lots',
        path: '/stock',
        roles: ['super_admin', 'admin', 'manager', 'operateur'],
      },
      {
        id: 'stock-mouvements',
        label: 'Mouvements de stock',
        path: '/stock/mouvements',
        roles: ['super_admin', 'admin', 'manager', 'operateur'],
      },
    ],
  },
  {
    id: 'ventes',
    label: 'Ventes',
    icon: 'ventes',
    roles: ['super_admin', 'admin', 'manager'],
    children: [
      {
        id: 'ventes-main',
        label: 'Ventes',
        path: '/ventes',
        roles: ['super_admin', 'admin', 'manager'],
      },
      {
        id: 'ventes-pos',
        label: 'Point de vente / Caisse',
        path: '/pos',
        roles: ['super_admin', 'admin', 'manager'],
      },
      {
        id: 'ventes-commandes',
        label: 'Commandes',
        path: '/commandes',
        roles: ['super_admin', 'admin', 'manager'],
      },
    ],
  },
  {
    id: 'collaborateurs',
    label: 'Collaborateurs',
    path: '/collaborateurs',
    icon: 'collaborateurs',
    roles: ['super_admin', 'admin'],
  },
  {
    id: 'clients',
    label: 'Clients',
    path: '/clients',
    icon: 'collaborateurs',
    roles: ['super_admin', 'admin', 'manager'],
  },
  {
    id: 'abonnements',
    label: 'Abonnements',
    path: '/abonnements',
    icon: 'abonnements',
    roles: ['super_admin', 'admin'],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'abonnements',
    roles: ['super_admin', 'admin', 'manager'],
    children: [
      {
        id: 'finance-transactions',
        label: 'Transactions',
        path: '/finance/transactions',
        roles: ['super_admin', 'admin', 'manager'],
      },
    ],
  },
  {
    id: 'rapports',
    label: 'Rapports',
    icon: 'parametres',
    roles: ['super_admin', 'admin', 'manager'],
    path: '/reports',
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: 'parametres',
    roles: ['super_admin'],
    children: [
      {
        id: 'configuration-main',
        label: 'Configuration générale',
        path: '/settings',
        roles: ['super_admin'],
      },
      {
        id: 'configuration-points',
        label: 'Points de vente',
        path: '/settings/points',
        roles: ['super_admin'],
      },
      {
        id: 'configuration-unites',
        label: 'Unités',
        path: '/settings/unites',
        roles: ['super_admin'],
      },
      {
        id: 'configuration-produits',
        label: 'Produits catalogue',
        path: '/settings/produits',
        roles: ['super_admin'],
      },
      {
        id: 'configuration-security',
        label: 'RBAC & utilisateurs',
        path: '/settings/security',
        roles: ['super_admin'],
      },
    ],
  },
  {
    id: 'admin-tools',
    label: 'Outils Super-Admin',
    path: '/admin-tools',
    icon: 'parametres',
    roles: ['super_admin'],
  },
]

interface SidebarProps {
  activeRoute?: string
  isCollapsed?: boolean
  onNavigate?: () => void
}

const Sidebar = ({ activeRoute = '/dashboard', isCollapsed = false, onNavigate }: SidebarProps) => {
  const { currentUser } = useAuth()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const tooltipAnchorsRef = useRef<Record<string, HTMLElement | null>>({})
  const role = currentUser?.role

  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.createElement('div')
    el.setAttribute('data-pejaa', 'sidebar-tooltips')
    el.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647'
    document.body.appendChild(el)
    setPortalRoot(el)
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el)
      setPortalRoot(null)
    }
  }, [])

  // Filter items and sub-items based on user role (ported from Pejaa_Front logic)
  const visibleItems = sidebarItems
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const visibleChildren = item.children.filter((c) => role && c.roles.includes(role))
        if (visibleChildren.length === 0) return null
        return { ...item, children: visibleChildren }
      }
      return role && item.roles.includes(role) ? item : null
    })
    .filter(Boolean) as SidebarItem[]

  const isOpen = !isCollapsed

  const handleNavigate = () => {
    if (typeof onNavigate === 'function') {
      onNavigate()
    }
  }

  const renderTooltip = (label: string, anchorEl: HTMLElement | null) => {
    if (isOpen || !portalRoot || !anchorEl) return null
    const rect = anchorEl.getBoundingClientRect()
    return createPortal(
      <span
        className="pointer-events-none fixed px-2 py-1 rounded bg-slate-900 text-white text-xs whitespace-nowrap shadow-lg z-[9999]"
        style={{ top: `${rect.top + rect.height / 2}px`, left: `${rect.right + 8}px`, transform: 'translateY(-50%)' }}
      >
        {label}
      </span>,
      portalRoot
    )
  }

  return (
    <aside
      className={`${isOpen ? 'w-64' : 'w-20'} relative z-[9998] bg-gradient-to-b from-navy-dark to-navy min-h-screen transition-all duration-300 ease-in-out flex flex-col overflow-visible`}
    >
      {/* Header - Badge utilisateur en haut */}
      {currentUser && (
        <div className="p-4 border-b border-navy-soft/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-strong rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {currentUser.prenom?.[0]}{currentUser.nom?.[0]}
              </div>
              {isOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {currentUser.prenom} {currentUser.nom}
                  </p>
                  <p className="text-navy-soft text-xs truncate">{currentUser.role}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation — spacing matches Pejaa_Front: py-6 px-3, space-y-2, px-4 py-3 */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto overflow-x-visible">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon ? iconMap[item.icon] : undefined

            if (item.children && item.children.length > 0) {
              const isGroupOpen = openGroups[item.id] ?? false
              const isGroupActive = item.children.some((c) => activeRoute === c.path)
              return (
                <li key={item.id}>
                  <div
                    className={`relative group flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all
                      ${isGroupActive
                        ? 'text-white bg-navy border-l-4 border-primary'
                        : 'text-slate-300 hover:bg-navy-soft/30 hover:text-white'
                      }
                    `}
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [item.id]: !isGroupOpen }))}
                  >
                    <div className="relative flex items-center gap-3" ref={(el) => { tooltipAnchorsRef.current[item.id] = el }}>
                      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                      {isOpen && <span>{item.label}</span>}
                      {!isOpen && renderTooltip(item.label, tooltipAnchorsRef.current[item.id])}
                    </div>
                    {isOpen && (
                      <span className="text-xs">
                        {isGroupOpen ? '−' : '+'}
                      </span>
                    )}
                  </div>
                  {isGroupOpen && isOpen && (
                    <ul className="mt-1 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon ? iconMap[child.icon] : (item.icon ? iconMap[item.icon] : undefined)
                        const isActive = activeRoute === child.path
                        return (
                          <li key={child.id}>
                            <Link
                              href={child.path!}
                              onClick={handleNavigate}
                              className={`relative group flex items-center gap-3 px-6 py-2 rounded-lg text-sm transition-all
                                ${isActive 
                                  ? 'bg-navy text-white border-l-4 border-primary' 
                                  : 'text-slate-300 hover:bg-navy-soft/30 hover:text-white'
                                }
                              `}
                            >
                              {ChildIcon && <ChildIcon className="w-4 h-4 flex-shrink-0" />}
                              <span>{child.label}</span>
                            </Link>
                          </li>
                        )
                      })}
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
                  onClick={handleNavigate}
                  className={`relative group flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all
                    ${isActive 
                      ? 'bg-navy text-white border-l-4 border-primary' 
                      : 'text-slate-300 hover:bg-navy-soft/30 hover:text-white'
                    }
                  `}
                  ref={(el) => { tooltipAnchorsRef.current[item.id] = el }}
                >
                  {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                  {isOpen && <span>{item.label}</span>}
                  {!isOpen && renderTooltip(item.label, tooltipAnchorsRef.current[item.id])}
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
