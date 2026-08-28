'use client'

import { usePathname } from 'next/navigation'
import AdminLayout from './AdminLayout' // Assuming AdminLayout is in the same directory, or adjust path
// If PAGE_TITLES is also used server-side, it should be in a shared constants file.
// For now, it lives with the client-side logic.
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/stock': 'Stock',
  '/stock/mouvements': 'Mouvements de stock',
  '/ventes': 'Ventes',
  '/collaborateurs': 'Collaborateurs',
  '/finance/transactions': 'Transactions',
  '/settings': 'Paramètres',
  '/settings/unites': 'Unités de mesure',
  '/clients': 'Clients',
  '/abonnements': 'Abonnements',
  '/reports': 'Rapports', // Add reports to titles
  '/pos': 'Point de Vente / Caisse', // Add POS to titles
  '/commandes': 'Commandes', // Add Commandes to titles
  '/admin-tools': 'Outils Super-Admin', // Add Admin Tools to titles
  // ... add any other routes that need specific titles from the Sidebar
}

/** Routes qui ne doivent jamais avoir la sidebar/navbar */
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

export default function AdminLayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Pages d'authentification — rendu nu, sans shell admin
  if (AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return <>{children}</>
  }

  const title = PAGE_TITLES[pathname] ?? 'PEJAA'

  return (
    <AdminLayout pageTitle={title} activeRoute={pathname}>
      {children}
    </AdminLayout>
  )
}
