'use client'

import { usePathname } from 'next/navigation'
import AdminLayout from '@/layouts/AdminLayout'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/stock': 'Stock',
  '/stock/mouvements': 'Mouvements de stock',
  '/ventes': 'Ventes',
  '/collaborateurs': 'Collaborateurs',
  '/finance/transactions': 'Transactions',
  '/config': 'Paramètres',
}

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? 'PEJAA'
  return (
    <AdminLayout pageTitle={title} activeRoute={pathname}>
      {children}
    </AdminLayout>
  )
}
