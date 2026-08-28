/**
 * Layout dédié au groupe (auth) — ne contient ni sidebar ni navbar.
 * Les pages /login (et toute autre page d'auth future) s'affichent ici
 * en pleine page, complètement indépendantes du layout admin.
 */
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PEJAA — Connexion',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
