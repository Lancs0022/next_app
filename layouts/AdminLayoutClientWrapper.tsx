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
  '/clients': 'Clients',
  '/abonnements': 'Abonnements',
  '/reports': 'Rapports', // Add reports to titles
  '/pos': 'Point de Vente / Caisse', // Add POS to titles
  '/commandes': 'Commandes', // Add Commandes to titles
  '/admin-tools': 'Outils Super-Admin', // Add Admin Tools to titles
  // ... add any other routes that need specific titles from the Sidebar
}

export default function AdminLayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? 'PEJAA' // Default title if not found

  return (
    <AdminLayout pageTitle={title} activeRoute={pathname}>
      {children}
    </AdminLayout>
  )
}
