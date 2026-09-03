import type { Metadata } from 'next'
import Script from 'next/script'
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
      <head>
        {/* Applique la classe dark AVANT l'hydratation React — évite le flash
            de thème au refresh. strategy="beforeInteractive" garantit une
            exécution avant tout JS React. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pejaa-theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <Providers>
          <AdminLayoutClientWrapper>{children}</AdminLayoutClientWrapper>
        </Providers>
      </body>
    </html>
  )
}
