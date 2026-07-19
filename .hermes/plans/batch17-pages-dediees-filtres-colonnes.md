# Batch 17 — Pages dédiées, corrections filtres par colonne, colonnes Ventes

## Partie A — Migrer Livraison et Vente du Drawer vers des pages dédiées

### A1. Retirer `ResizablePanel` de `DynamicEntryGrid.tsx`

**Cause du bug persistant** : `ResizablePanel` fixe `style={{ height }}` en pixels, ce qui annule
totalement la classe `flex-1` — la zone reste bloquée à une hauteur fixe peu importe l'espace
réellement disponible.

**Fichier** : `components/DynamicEntry/DynamicEntryGrid.tsx`

Remplacer :
```tsx
<ResizablePanel storageKey="pejaa.livraison.grid.height" defaultHeight={380} minHeight={240} maxHeight={640} className="flex-1 min-h-0">
  {/* contenu mobile + desktop */}
</ResizablePanel>
```
par un simple conteneur flex qui remplit l'espace disponible :
```tsx
<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
  {/* contenu mobile + desktop, inchangé */}
</div>
```
Retirer l'import de `ResizablePanel` s'il n'est plus utilisé ailleurs dans ce fichier.

**Ne pas supprimer `ResizablePanel.tsx` lui-même** — vérifier d'abord s'il est utilisé ailleurs
(`grep -rn "ResizablePanel" components/ app/`) avant de le considérer comme mort.

### A2. Nouvelles pages dédiées

**Créer** `app/livraisons/nouvelle/page.tsx` :
```tsx
'use client'
import { useRouter } from 'next/navigation'
import DynamicEntrySession from '@/components/DynamicEntry/DynamicEntrySession'
// + chargement collaborateurs/pointsVente/produitsCatalogue comme le faisait AddLivraisonDrawer

export default function NouvelleLivraisonPage() {
  const router = useRouter()
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={() => router.push('/stock')} className="text-sm text-slate-300 hover:text-white flex items-center gap-2">
          ← Retour au stock
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <DynamicEntrySession module="livraison" title="Saisie Globale des Livraisons" ... />
      </div>
    </div>
  )
}
```
**Créer** `app/ventes/nouvelle/page.tsx` sur le même principe, reprenant le contenu actuel de
`VenteEntryDrawer.tsx` (header, meta, bouton "Ajouter marchandises", panier) mais sans le wrapper
`<Drawer>` — remplacé par la même structure page + bouton retour vers `/ventes`.

**Modifier** `app/stock/page.tsx` et `app/ventes/page.tsx` : remplacer l'ouverture du Drawer
(`setLivraisonOpen(true)` / `setCreateOpen(true)`) par une navigation :
```tsx
router.push('/livraisons/nouvelle')
router.push('/ventes/nouvelle')
```
Retirer `AddLivraisonDrawer` et `VenteEntryDrawer` (ou les garder comme composants inutilisés
temporairement, à supprimer une fois la migration validée en prod).

**Point d'attention** : `initialPvId`/`initialLotId` (préremplissage depuis le stock, via
`?from_lot=X&from_pv=Y`) doit continuer à fonctionner — passer ces valeurs en query params de la
nouvelle route (`/ventes/nouvelle?from_lot=X&from_pv=Y`) plutôt qu'en props directes.

---

## Partie B — Corrections du système de filtre par colonne (Batch 15)

### B1. Icône de filtre — utiliser celle du mockup Figma

**Fichier** : `components/ResponsiveDataTable/ColumnFilterDropdown.tsx`
```tsx
function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className={active ? 'text-primary' : 'text-slate-400'}>
      <path d="M1 2h9M3 5.5h5M5 9h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
```

### B2. Filtre de colonne Date → réutiliser `DateRangeFilter.tsx` existant, pas une version simplifiée

`DateRangeFilter.tsx` gère déjà tout (presets Jour/Semaine/Mois/Année/Personnalisé, calcul de bornes).
Le réutiliser tel quel pour les colonnes de type date, plutôt que le sous-composant `DateFilter`
simplifié du mockup Figma.

**Modification nécessaire dans `DateRangeFilter.tsx`** : le rendre pilotable de l'extérieur, pour
qu'un clic sur l'icône filtre d'en-tête de colonne l'ouvre directement (au lieu de son propre bouton
"Sélectionner une date") :
```tsx
interface DateRangeFilterProps {
  label?: string
  value: DateFilterValue | null
  onChange: (value: DateFilterValue | null) => void
  buttonClassName?: string
  open?: boolean                        // nouveau : contrôle externe optionnel
  onOpenChange?: (open: boolean) => void // nouveau
  hideTrigger?: boolean                  // nouveau : masque son propre bouton déclencheur
}
```
À l'intérieur, remplacer `const [open, setOpen] = useState(false)` par un état contrôlable :
```tsx
const [internalOpen, setInternalOpen] = useState(false)
const open = props.open ?? internalOpen
const setOpen = props.onOpenChange ?? setInternalOpen
```
Et entourer le bouton déclencheur existant d'une condition `{!hideTrigger && (<button>...</button>)}`.

**Dans `ColumnFilterDropdown.tsx`**, pour `filterKind === 'date'` :
```tsx
{col.filterKind === 'date' && (
  <DateRangeFilter
    value={dateValue}
    onChange={onDateChange}
    open={true}
    onOpenChange={onClose}
    hideTrigger
  />
)}
```
Le champ "Filtrer par" de `DateRangeFilter` (actuellement `date_livraison`/`date_creation` en dur)
doit être fixé à la variable de date de la colonne cliquée — passer une prop supplémentaire pour
présélectionner/masquer ce sélecteur puisqu'il est déjà implicite (on a cliqué sur la colonne
"Date de vente", pas besoin de redemander).

### B3. Les filtres de colonne actifs doivent apparaître dans la barre "Filtres actifs" existante

**Fichier** : `app/ventes/page.tsx`

La barre de chips existe déjà (`{filters.q && (...)}`, `{filters.id_point_vente && (...)}`, etc.).
Dans `handleColumnFiltersChange` (déjà spécifié au Batch 15), après avoir traduit les `FilterState`
en paramètres de fetch, ajouter aussi une entrée lisible dans un state `columnFilterChips` :
```tsx
const [columnFilterChips, setColumnFilterChips] = useState<Array<{ field: string; label: string }>>([])
```
Chaque filtre de colonne appliqué pousse un chip (`"Quantité : entre 5 et 20"`, `"Statut : Payée, Annulée"`)
avec un bouton `×` qui appelle `clearFilter(field)` côté `ResponsiveDataTable` **et** retire l'entrée
correspondante de `filters`/`columnFilterChips`. Rendre ces chips dans le même conteneur que les
chips existants, pas dans une zone séparée.

### B4. Statut — badge compact une lettre + infobulle

**Fichier** : `app/ventes/page.tsx`, `renderCell` de la colonne `statut`
```tsx
const STATUT_LETTER: Record<string, string> = { en_attente_paiement: 'A', payee: 'P', annulee: 'X', retournee: 'R' }

renderCell: (row) => (
  <span
    title={formatStatut(row.statut)}
    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${getStatutBadgeClass(row.statut)}`}
  >
    {STATUT_LETTER[row.statut] || '?'}
  </span>
)
```
Colonne dédiée, étroite (`width: '40px'`), **non fusionnée** avec un autre groupe — confirmé.

---

## Partie C — Regroupement des colonnes Ventes (miroir du pattern Stock/Lots)

**Fichier** : `app/ventes/page.tsx`, `atomiqueColumns`/`aggregeColumns`

Nouvelle structure de colonnes, sur le modèle de `PRODUIT` / `LOT-LOCALISATION` / `QTÉ-PRIX` / `DATES`
déjà en place sur Stock :

| Colonne groupée | Contenu (ligne principale + sous-lignes) |
|---|---|
| **Produit / Contexte** | Nom du produit (gras) · Point de vente · Collaborateur (en sous-texte) |
| **Qté / Montant** | Quantité · Montant (gras) · Marge (en vert, sous-texte) |
| **Dates** | Date de vente (gras) · Créé par · Créé le (en sous-texte) |
| **Statut** | Badge une lettre, colonne étroite (voir B4) |
| **Actions** | inchangé |

**Exemple de `renderCell`** pour la colonne groupée Produit/Contexte :
```tsx
{
  field: 'produit_contexte', headerName: 'Produit', width: '220px', minWidth: '180px', sortable: true,
  filterable: true, filterKind: 'select', filterOptions: /* liste des produits distincts */,
  renderCell: (row) => (
    <div>
      <div className="font-medium text-slate-900 dark:text-white">{row.libelle_produit || `Lot #${row.id_lot}`}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{row.point_vente_nom} · {row.collaborateur_nom || '-'}</div>
    </div>
  )
}
```
Même logique pour Qté/Montant (montant en gras + marge en vert dessous) et Dates (date de vente en
gras + "Créé par {nom}, le {date}" en sous-texte).

**Tri** : chaque colonne groupée garde un seul `field` de tri principal (ex: trier "Produit /
Contexte" trie par `libelle_produit`) — pas de tri combiné sur plusieurs champs à la fois.

---

## Test de validation

1. Cliquer "Nouvelle vente" / "Ajouter une marchandise" (Stock) → navigue vers une vraie page, pas un
   Drawer. Bouton retour fonctionnel vers la liste correspondante.
2. Sur la nouvelle page Livraison, le tableau de saisie remplit tout l'espace vertical disponible
   sans scrollbar interne coincée — un seul scroll, celui de la page.
3. Cliquer l'icône filtre sur la colonne Date → `DateRangeFilter` s'ouvre directement (pas de bouton
   "Sélectionner une date" dupliqué).
4. Appliquer un filtre de colonne (n'importe lequel) → un chip apparaît dans la barre "Filtres
   actifs" existante, avec un `×` qui le retire correctement.
5. Vérifier que la colonne Statut affiche bien un badge à une lettre avec l'infobulle correcte au
   survol pour chacun des 4 statuts.
6. Vérifier l'affichage groupé des colonnes Produit/Contexte, Qté/Montant, Dates — comparer
   visuellement à la page Stock/Lots existante pour la cohérence de densité.
