'use client'

import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { iconMap } from '@/components/icons/Icons'
import { Z_SIDEBAR_FLYOUT } from '@/lib/zIndex'

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
      { id: 'stock-main', label: 'Stock / Lots', path: '/stock', roles: ['super_admin', 'admin', 'manager', 'operateur'] },
      { id: 'stock-mouvements', label: 'Mouvements de stock', path: '/stock/mouvements', roles: ['super_admin', 'admin', 'manager', 'operateur'] },
    ],
  },
  {
    id: 'ventes',
    label: 'Ventes',
    icon: 'ventes',
    roles: ['super_admin', 'admin', 'manager'],
    children: [
      { id: 'ventes-main', label: 'Ventes', path: '/ventes', roles: ['super_admin', 'admin', 'manager'] },
      { id: 'ventes-pos', label: 'Point de vente / Caisse', path: '/pos', roles: ['super_admin', 'admin', 'manager'] },
      { id: 'ventes-commandes', label: 'Commandes', path: '/commandes', roles: ['super_admin', 'admin', 'manager'] },
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
      { id: 'finance-transactions', label: 'Transactions', path: '/finance/transactions', roles: ['super_admin', 'admin', 'manager'] },
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
      { id: 'configuration-main', label: 'Configuration générale', path: '/settings', roles: ['super_admin'] },
      { id: 'configuration-points', label: 'Points de vente', path: '/settings/points', roles: ['super_admin'] },
      { id: 'configuration-unites', label: 'Unités', path: '/settings/unites', roles: ['super_admin'] },
      { id: 'configuration-produits', label: 'Produits catalogue', path: '/settings/produits', roles: ['super_admin'] },
      { id: 'configuration-security', label: 'RBAC & utilisateurs', path: '/settings/security', roles: ['super_admin'] },
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

interface TooltipState {
  id: string
  label: string
  top: number
  left: number
}

interface FlyoutState {
  id: string
  top: number
  left: number
  children: SidebarItem[]
}

const Sidebar = ({ activeRoute = '/dashboard', isCollapsed = false, onNavigate }: SidebarProps) => {
  const { currentUser } = useAuth()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [flyout, setFlyout] = useState<FlyoutState | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const anchorRefs = useRef<Record<string, HTMLElement | null>>({})
  const role = currentUser?.role

  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.createElement('div')
    el.setAttribute('data-pejaa', 'sidebar-overlays')
    document.body.appendChild(el)
    setPortalRoot(el)
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el)
      setPortalRoot(null)
    }
  }, [])

  const visibleItems = useMemo(() =>
    sidebarItems
      .map((item) => {
        if (item.children && item.children.length > 0) {
          const visibleChildren = item.children.filter((c) => role && c.roles.includes(role))
          if (visibleChildren.length === 0) return null
          return { ...item, children: visibleChildren }
        }
        return role && item.roles.includes(role) ? item : null
      })
      .filter(Boolean) as SidebarItem[],
    [role]
  )

  const isOpen = !isCollapsed

  const handleNavigate = () => {
    setFlyout(null)
    onNavigate?.()
  }

  const positionAnchor = useCallback((id: string) => {
    const el = anchorRefs.current[id]
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { top: rect.top + rect.height / 2, left: rect.right + 8 }
  }, [])

  useLayoutEffect(() => {
    if (!hoveredId || isOpen) {
      setTooltip(null)
      return
    }
    const item = visibleItems.find(i => i.id === hoveredId)
    if (!item || flyout?.id === hoveredId) {
      setTooltip(null)
      return
    }
    const pos = positionAnchor(hoveredId)
    if (!pos) return
    setTooltip({ id: hoveredId, label: item.label, top: pos.top, left: pos.left })
  }, [hoveredId, isOpen, visibleItems, positionAnchor, flyout?.id])

  useLayoutEffect(() => {
    if (!flyout || isOpen) return
    const pos = positionAnchor(flyout.id)
    if (!pos) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlyout(prev => {
      if (!pos) return prev;
      if (prev && prev.top === pos.top && prev.left === pos.left) return prev;
      return prev ? { ...prev, top: pos.top, left: pos.left } : null;
    })
  }, [flyout, isOpen, positionAnchor])

  useEffect(() => {
    if (!flyout) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      const flyoutEl = document.getElementById('sidebar-flyout')
      const anchor = anchorRefs.current[flyout.id]
      if (flyoutEl?.contains(target) || anchor?.contains(target)) return
      setFlyout(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [flyout])

  const handleGroupClick = (item: SidebarItem) => {
    if (isOpen) {
      setOpenGroups(prev => ({ ...prev, [item.id]: !prev[item.id] }))
      return
    }
    const pos = positionAnchor(item.id)
    if (!pos || !item.children) return
    setFlyout(prev =>
      prev?.id === item.id
        ? null
        : { id: item.id, top: pos.top, left: pos.left, children: item.children! }
    )
    setTooltip(null)
  }

  const setAnchorRef = (id: string) => (el: HTMLElement | null) => {
    anchorRefs.current[id] = el
  }

  const hoverHandlers = (id: string) => ({
    onMouseEnter: () => { if (!isOpen) setHoveredId(id) },
    onMouseLeave: () => { if (!isOpen) setHoveredId(prev => prev === id ? null : prev) },
  })

  return (
    <aside
      className={`${isOpen ? 'w-64' : 'w-20'} relative z-[9998] bg-gradient-to-b from-navy-dark to-navy min-h-screen transition-[width] duration-200 ease-in-out flex flex-col overflow-visible`}
    >
      {currentUser && (
        <div className="p-4 border-b border-navy-soft/30 flex-shrink-0">
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
      )}

      <nav className="flex-1 py-6 px-3 overflow-y-auto overflow-x-visible">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon ? iconMap[item.icon] : undefined

            if (item.children && item.children.length > 0) {
              const isGroupOpen = openGroups[item.id] ?? false
              const isGroupActive = item.children.some((c) => activeRoute === c.path)
              const isFlyoutOpen = flyout?.id === item.id
              return (
                <li key={item.id}>
                  <div
                    className={`relative flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all
                      ${isGroupActive || isFlyoutOpen
                        ? 'text-white bg-navy border-l-4 border-primary'
                        : 'text-slate-300 hover:bg-navy-soft/30 hover:text-white'
                      }`}
                    onClick={() => handleGroupClick(item)}
                    ref={setAnchorRef(item.id)}
                    {...hoverHandlers(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                      {isOpen && <span>{item.label}</span>}
                    </div>
                    {isOpen && (
                      <span className="text-xs">{isGroupOpen ? '−' : '+'}</span>
                    )}
                  </div>
                  {isGroupOpen && isOpen && (
                    <ul className="mt-1 space-y-1">
                      {item.children.map((child) => {
                        const isActive = activeRoute === child.path
                        return (
                          <li key={child.id}>
                            <Link
                              href={child.path!}
                              onClick={handleNavigate}
                              className={`flex items-center gap-3 px-6 py-2 rounded-lg text-sm transition-all
                                ${isActive
                                  ? 'bg-navy text-white border-l-4 border-primary'
                                  : 'text-slate-300 hover:bg-navy-soft/30 hover:text-white'
                                }`}
                            >
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
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all
                    ${isActive
                      ? 'bg-navy text-white border-l-4 border-primary'
                      : 'text-slate-300 hover:bg-navy-soft/30 hover:text-white'
                    }`}
                  ref={setAnchorRef(item.id)}
                  {...hoverHandlers(item.id)}
                >
                  {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                  {isOpen && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {portalRoot && tooltip && createPortal(
        <span
          className="pointer-events-none fixed px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs whitespace-nowrap shadow-lg border border-slate-700"
          style={{ top: tooltip.top, left: tooltip.left, transform: 'translateY(-50%)', zIndex: Z_SIDEBAR_FLYOUT }}
        >
          {tooltip.label}
        </span>,
        portalRoot
      )}

      {portalRoot && flyout && !isOpen && createPortal(
        <div
          id="sidebar-flyout"
          className="fixed min-w-[200px] rounded-lg bg-slate-900 border border-slate-700 shadow-xl py-1"
          style={{ top: flyout.top, left: flyout.left, transform: 'translateY(-50%)', zIndex: Z_SIDEBAR_FLYOUT }}
        >
          {flyout.children.map((child) => {
            const isActive = activeRoute === child.path
            return (
              <Link
                key={child.id}
                href={child.path!}
                onClick={handleNavigate}
                className={`block px-4 py-2.5 text-sm transition-colors
                  ${isActive
                    ? 'text-white bg-navy border-l-2 border-primary'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                {child.label}
              </Link>
            )
          })}
        </div>,
        portalRoot
      )}
    </aside>
  )
}

export default Sidebar
