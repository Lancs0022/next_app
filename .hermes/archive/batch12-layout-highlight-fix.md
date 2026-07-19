# Batch 12 — Fix layout : titre de page et highlight sidebar figés sur Dashboard

## Cause confirmée

`app/layout.tsx` importe et utilise `AdminLayout` directement :
```tsx
import AdminLayout from '@/layouts/AdminLayout'
...
<AdminLayout>{children}</AdminLayout>
```

Mais `AdminLayoutClientWrapper.tsx` (qui existe déjà dans le projet) est le composant censé être utilisé ici — c'est lui qui calcule `pathname` via `usePathname()` et le transmet à `AdminLayout` comme `pageTitle` et `activeRoute` :
```tsx
export default function AdminLayoutClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? 'PEJAA'
  return (
    <AdminLayout pageTitle={title} activeRoute={pathname}>
      {children}
    </AdminLayout>
  )
}
```

Comme `AdminLayout` est utilisé sans ce wrapper, il retombe sur ses valeurs par défaut :
```tsx
pageTitle = 'Dashboard',
activeRoute = '/dashboard',
```
Et comme le layout racine ne se remonte jamais entre deux navigations (comportement normal du App Router Next.js), ces valeurs par défaut restent figées pour toute la session — d'où le titre qui reste "Dashboard" sur `/ventes`, `/stock`, etc., et le highlight de sidebar qui reste bloqué sur l'item Dashboard puisque `activeRoute` ne change jamais.

## Correction

**Fichier** : `app/layout.tsx`

**Avant** :
```tsx
import AdminLayout from '@/layouts/AdminLayout'
...
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>
          <AdminLayout>{children}</AdminLayout>
        </Providers>
      </body>
    </html>
  )
}
```

**Après** :
```tsx
import AdminLayoutClientWrapper from '@/layouts/AdminLayoutClientWrapper'
...
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
```

**Vérifier le chemin d'import exact** : `AdminLayoutClientWrapper.tsx` a été fourni sans son chemin de fichier complet — confirmer qu'il est bien dans `layouts/` à côté de `AdminLayout.tsx` avant d'appliquer ce changement. Si le fichier est ailleurs (ex: `components/layout/`), ajuster l'import en conséquence.

**Aucun autre fichier à toucher** : `AdminLayout.tsx`, `Sidebar.tsx` et `Topbar.tsx` fonctionnent déjà correctement avec `pageTitle`/`activeRoute` reçus en props — le seul maillon manquant était ce branchement à la racine.

## Test de validation après correctif

1. Aller sur `/dashboard`, vérifier titre "Dashboard" et highlight Dashboard actif.
2. Naviguer vers `/ventes` **sans recharger la page** (clic sur le lien sidebar) : le titre doit changer pour "Ventes" et le highlight doit se déplacer sur Ventes, sans fusion visuelle avec l'ancien contenu.
3. Naviguer vers `/stock`, `/collaborateurs`, `/finance/transactions` : même vérification, pour confirmer que ce n'était pas spécifique à `/ventes`.
4. Recharger la page (F5) sur une route profonde (ex: `/stock/mouvements`) : le titre et le highlight doivent être corrects dès le chargement initial, pas seulement après une navigation client-side.
