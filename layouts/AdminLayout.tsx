'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface AdminLayoutProps {
  children: React.ReactNode
  pageTitle?: string
  rightActions?: React.ReactNode
  activeRoute?: string
}

const AdminLayout = ({
  children,
  pageTitle = 'Dashboard',
  rightActions,
  activeRoute = '/dashboard',
}: AdminLayoutProps) => {
  const [isMobileSidebarMode, setIsMobileSidebarMode] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSidebarOverlayOpen, setIsSidebarOverlayOpen] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const updateLayout = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (typeof window === 'undefined') return
        const width = window.innerWidth
        if (width < 540) {
          // Full mobile: sidebar as overlay
          setIsMobileSidebarMode(true)
          setIsSidebarOverlayOpen(false)
          setIsSidebarCollapsed(false)
        } else if (width < 768) {
          // Intermediate: sidebar visible but auto-collapsed to w-20
          setIsMobileSidebarMode(false)
          setIsSidebarCollapsed(true)
          setIsSidebarOverlayOpen(false)
        } else {
          // Desktop: sidebar normal (user can toggle collapse)
          setIsMobileSidebarMode(false)
          setIsSidebarOverlayOpen(false)
        }
      }, 100)
    }
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => {
      window.removeEventListener('resize', updateLayout)
      clearTimeout(timeout)
    }
  }, [])

  const handleToggleSidebar = useCallback(() => {
    if (isMobileSidebarMode) {
      setIsSidebarOverlayOpen((prev) => !prev)
    } else {
      setIsSidebarCollapsed((prev) => !prev)
    }
  }, [isMobileSidebarMode])

  const handleCloseOverlay = useCallback(() => setIsSidebarOverlayOpen(false), [])

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 relative">
      {!isMobileSidebarMode && (
        <Sidebar activeRoute={activeRoute} isCollapsed={isSidebarCollapsed} />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          pageTitle={pageTitle}
          rightActions={rightActions}
          onToggleSidebar={handleToggleSidebar}
          isMobileSidebarMode={isMobileSidebarMode}
          isSidebarCollapsed={isSidebarCollapsed}
          isSidebarOverlayOpen={isSidebarOverlayOpen}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="p-4 md:p-6 lg:p-10">{children}</div>
        </main>
      </div>
      {isMobileSidebarMode && isSidebarOverlayOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={handleCloseOverlay}
          />
          <div className="fixed inset-y-0 left-0 z-50">
            <Sidebar activeRoute={activeRoute} isCollapsed={false} onNavigate={handleCloseOverlay} />
          </div>
        </>
      )}
    </div>
  )
}

export default AdminLayout

