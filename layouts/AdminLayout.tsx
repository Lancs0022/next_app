'use client'

import { useEffect, useState } from 'react'
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
    const updateLayout = () => {
      if (typeof window === 'undefined') return
      const width = window.innerWidth
      if (width < 1024) {
        setIsMobileSidebarMode(true)
        setIsSidebarOverlayOpen(false)
        setIsSidebarCollapsed(false)
      } else {
        setIsMobileSidebarMode(false)
        setIsSidebarOverlayOpen(false)
      }
    }
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [])

  const handleToggleSidebar = () => {
    if (isMobileSidebarMode) {
      setIsSidebarOverlayOpen((prev) => !prev)
    } else {
      setIsSidebarCollapsed((prev) => !prev)
    }
  }

  const handleCloseOverlay = () => setIsSidebarOverlayOpen(false)

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
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
      {isMobileSidebarMode && isSidebarOverlayOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={handleCloseOverlay} />
          <div className="fixed inset-y-0 left-0 z-50">
            <Sidebar activeRoute={activeRoute} isCollapsed={false} onNavigate={handleCloseOverlay} />
          </div>
        </>
      )}
    </div>
  )
}

export default AdminLayout
