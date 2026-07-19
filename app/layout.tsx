import type { Metadata } from 'next'
import { Providers } from './providers'
import AdminLayoutClientWrapper from '@/layouts/AdminLayoutClientWrapper'
import './globals.css'

export const metadata: Metadata = {
  title: 'PEJAA',
  description: 'Gestion mini-market dépôt-vente',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>
          <AdminLayoutClientWrapper>{children}</AdminLayoutClientWrapper>
        </Providers>
      </body>
    </html>
  )
}