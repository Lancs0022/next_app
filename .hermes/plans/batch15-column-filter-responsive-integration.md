# Batch 15 — Intégration filtre par colonne + responsive générique dans ResponsiveDataTable

## Portée de ce batch

Porte le système de filtre (`FilterDropdown` + `DateFilter`/`NumericFilter`/`SelectFilter`) et le pattern responsive du mockup Figma dans le vrai `ResponsiveDataTable.tsx`, généralisé pour fonctionner avec **toutes** les tables de l'app (Ventes, Stock, pas seulement Collaborateurs).

**Hors scope de ce batch** (à traiter séparément, batches 16/17) :
- Upgrade du detail panel en fieldsets (spécifique à chaque page, pas au composant générique)
- Bouton Exporter (nécessite une décision sur le format — CSV ? Excel ? — et la génération côté backend ou client)

---

## Étape 1 — Étendre l'interface `Column`

**Fichier** : `components/ResponsiveDataTable/ResponsiveDataTable.tsx`

**Avant** :
```tsx
interface Column {
  field: string
  headerName: string
  sortable?: boolean
  filterable?: boolean
  width?: string
  minWidth?: string
  renderCell?: (row: any) => React.ReactNode
  getActions?: (row: any) => Array<{ label: string; onClick?: (row?: any) => void; variant?: string; disabled?: boolean }>
}
```

**Après** — ajouter le typage du filtre et le contrôle de responsive :
```tsx
type FilterKind = 'date' | 'numeric' | 'select' | 'text'

interface Column {
  field: string
  headerName: string
  sortable?: boolean
  filterable?: boolean
  filterKind?: FilterKind          // défaut 'text' si absent, pour compat ascendante
  filterOptions?: string[]         // requis si filterKind === 'select'
  hideBelow?: 'md' | 'lg'          // masque la colonne sous ce breakpoint (remplace le tri en dur nom/prenom/actions de l'ancienne vue mobile)
  width?: string
  minWidth?: string
  renderCell?: (row: any) => React.ReactNode
  renderMobilePrimary?: (row: any) => React.ReactNode  // contenu principal de la carte mobile (remplace le bloc avatar nom/prenom codé en dur)
  renderMobileSecondary?: (row: any) => React.ReactNode // ligne secondaire de la carte (ex: montant + statut)
  getActions?: (row: any) => Array<{ label: string; onClick?: (row?: any) => void; variant?: string; disabled?: boolean }>
}
```

## Étape 2 — Créer le composant de filtre par colonne (porté du mockup Figma)

**Nouveau fichier** : `components/ResponsiveDataTable/ColumnFilterDropdown.tsx`

Porter tel quel depuis le mockup Figma, avec ces adaptations :
- `FilterState` : garder la même forme (`date`/`numeric`/`select`), c'est déjà générique.
- `FilterDropdown`, `DateFilter`, `NumericFilter`, `SelectFilter` : portables presque sans changement. Remplacer les couleurs codées en dur (`AMBER = '#F5A623'`) par les classes Tailwind `bg-primary`/`text-primary` déjà utilisées dans le reste de l'app, pour rester cohérent avec le thème existant plutôt que dupliquer une constante de couleur.
- `SelectFilter` : dans le mockup, `options` vient d'un lookup global `SELECT_OPTIONS[col]`. Ici, la remplacer par `column.filterOptions` passé en prop — chaque table définit ses propres options par colonne (ex: liste des points de vente, liste des collaborateurs) au lieu d'un objet global partagé entre toutes les tables.
- `isFilterActive` : garder tel quel, fonction pure.

## Étape 3 — Remplacer le système de filtre actuel dans `ResponsiveDataTable.tsx`

**Supprimer entièrement** :
- Le state `localFilters` (ligne 181) et `handleFilterChange` (lignes 183-187).
- Le bloc de filtres texte en dur, desktop (lignes 324-338) et mobile (lignes 214-229).

**Remplacer par** :
```tsx
const [filterOpen, setFilterOpen] = useState<string | null>(null)
const [filterPos, setFilterPos] = useState<{ top: number; left: number } | null>(null)
const [filterStates, setFilterStates] = useState<Record<string, FilterState>>({})

const openFilter = (col: Column, e: React.MouseEvent<HTMLButtonElement>) => {
  e.stopPropagation()
  if (filterOpen === col.field) {
    setFilterOpen(null); setFilterPos(null); return
  }
  if (!filterStates[col.field]) {
    setFilterStates(p => ({ ...p, [col.field]: defaultFilterState() }))
  }
  const rect = e.currentTarget.getBoundingClientRect()
  setFilterOpen(col.field)
  setFilterPos({ top: rect.bottom + 6, left: rect.left })
}

const applyFilter = () => {
  if (filterOpen) {
    const next = { ...filterStates }
    onFiltersChange(next)  // <- appelle le parent avec TOUTES les FilterState, pas juste celle qui vient de changer
  }
  setFilterOpen(null); setFilterPos(null)
}

const clearFilter = (field: string) => {
  const next = { ...filterStates }
  delete next[field]
  setFilterStates(next)
  onFiltersChange(next)
  setFilterOpen(null); setFilterPos(null)
}
```

**Changer la signature du prop `onFiltersChange`** :
```tsx
onFiltersChange?: (filters: Record<string, FilterState>) => void
```
(remplace l'ancien `Record<string, string>` — c'est un changement cassant pour tout composant parent qui utilisait l'ancien format texte simple, à vérifier partout où `ResponsiveDataTable` est utilisé)

**Ajouter le bouton filtre dans chaque `<th>` filterable**, à côté du tri existant :
```tsx
{column.filterable && (
  <button onClick={e => openFilter(column, e)} className="p-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-slate-500">
    <FilterIcon active={!!filterStates[column.field] && isFilterActive(filterStates[column.field], column.filterKind || 'text')} />
  </button>
)}
```

**Rendre `ColumnFilterDropdown`** en dehors du tableau, une seule fois (comme le mockup) :
```tsx
{filterOpen && filterPos && (
  <ColumnFilterDropdown
    col={columns.find(c => c.field === filterOpen)!}
    pos={filterPos}
    state={filterStates[filterOpen] || defaultFilterState()}
    onChange={s => setFilterStates(p => ({ ...p, [filterOpen]: s }))}
    onApply={applyFilter}
    onClear={() => clearFilter(filterOpen)}
    onClose={() => { setFilterOpen(null); setFilterPos(null) }}
  />
)}
```

## Étape 4 — Colonnes masquées par breakpoint (`hideBelow`)

**Dans le `<th>` et `<td>` desktop**, ajouter la classe conditionnelle :
```tsx
className={`... ${column.hideBelow === 'lg' ? 'hidden lg:table-cell' : column.hideBelow === 'md' ? 'hidden md:table-cell' : ''}`}
```

## Étape 5 — Vue mobile générique (retire le codage en dur Collaborateur)

**Remplacer** le bloc avatar/nom/prénom/email (lignes 244-259) par :
```tsx
<div className="flex items-center justify-between gap-2">
  <div className="min-w-0 flex-1">
    {columns.find(c => c.renderMobilePrimary)?.renderMobilePrimary?.(row) ?? (
      <span className="font-medium text-slate-900 dark:text-white truncate">{row[columns[0]?.field]}</span>
    )}
  </div>
  {columns.find(c => c.renderMobileSecondary) && (
    <div className="flex-none text-right">
      {columns.find(c => c.renderMobileSecondary)!.renderMobileSecondary!(row)}
    </div>
  )}
</div>
```
Si aucune colonne ne définit `renderMobilePrimary`/`renderMobileSecondary`, ça retombe sur un affichage générique basique plutôt que de planter ou d'afficher des champs vides comme actuellement.

**Grille de détails restante** (lignes 261-270) : garder telle quelle, mais exclure aussi les colonnes `hideBelow` déjà cachées :
```tsx
{columns.filter(col => col.field !== 'actions' && !col.renderMobilePrimary && !col.renderMobileSecondary).map(...)}
```

## Étape 6 — Wiring côté `page_vente.tsx`

**Fichier** : `app/ventes/page.tsx`

1. Ajouter à chaque définition de colonne filtrable le `filterKind` et `filterOptions` correspondant :
   - `date_vente` → `filterKind: 'date'`
   - `point_vente_nom` → `filterKind: 'select'`, `filterOptions: pointsDeVente.map(pv => pv.nom)`
   - `quantite_vendue`, `montant_ht`, `montant_marge` → `filterKind: 'numeric'`
   - `statut` → `filterKind: 'select'`, `filterOptions: ['en_attente_paiement','payee','annulee','retournee']`

2. **Remplacer** `onFiltersChange={() => {}}` par une vraie fonction qui traduit `Record<string, FilterState>` vers les params déjà attendus par `fetchVentes` :
```tsx
const handleColumnFiltersChange = (colFilters: Record<string, FilterState>) => {
  const next = { ...filters }
  const dateF = colFilters['date_vente']
  if (dateF && isFilterActive(dateF, 'date')) {
    const bounds = computeDateBounds(dateF)  // réutiliser la fonction du mockup, à extraire dans un utilitaire partagé
    next.date = { dateMin: bounds.start, dateMax: bounds.end }
  }
  const pvF = colFilters['point_vente_nom']
  if (pvF && pvF.select.length) {
    const ids = pointsDeVente.filter(pv => pvF.select.includes(pv.nom)).map(pv => getPvId(pv))
    next.id_point_vente = ids[0] || ''  // ou adapter le backend pour accepter un tableau si plusieurs PV filtrés à la fois
  }
  const statutF = colFilters['statut']
  if (statutF && statutF.select.length) {
    next.statut = statutF.select[0]  // idem, à voir si le backend supporte le multi-statut
  }
  setFilters(next)
}
```
**Point à vérifier avant d'implémenter** : le backend `/ventes/atomiques` accepte-t-il plusieurs `id_point_vente` ou `statut` à la fois, ou un seul ? Le filtre par colonne du mockup permet une sélection multiple (checkboxes) — s'il faut le supporter réellement, il faut aussi adapter le service `listVentesAtomiques` côté backend pour accepter des tableaux sur ces champs, pas juste sur `id_collaborateur` comme actuellement.

3. Faire la même chose pour `filters.numeric` sur `quantite_vendue`/`montant_ht` une fois qu'on sait comment le backend doit recevoir un intervalle (`qteMin`/`qteMax` à ajouter côté `VenteQueryParams` et `listVentesAtomiques`).

---

## Test de validation

1. Cliquer sur l'icône filtre d'une colonne Date → le dropdown de type date s'ouvre avec les presets.
2. Appliquer un filtre de date → la liste des ventes se recharge réellement filtrée (pas juste visuellement).
3. Filtrer par Statut (select multiple) → même vérification.
4. Redimensionner la fenêtre sous 768px → vérifier que les cartes mobiles affichent des informations pertinentes pour une vente (pas d'avatar vide ni de champ `email` manquant).
5. Vérifier qu'aucune autre table utilisant `ResponsiveDataTable` (Stock, Collaborateurs si applicable) n'est cassée par le changement de signature de `onFiltersChange` — chercher tous les usages avant de merger : `grep -rn "ResponsiveDataTable" app/ components/ --include="*.tsx" -l`
