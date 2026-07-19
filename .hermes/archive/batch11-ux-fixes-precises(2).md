# Batch 11 — Corrections précises de responsivité (Drawer / Grid Livraisons)

## Fix 1 — Bug racine de hauteur : `min-h-0` manquant dans `Drawer.tsx`

**Fichier** : `components/Drawer/Drawer.tsx`

**Ligne concernée** :
```tsx
<div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
  {children}
</div>
```

**Cause exacte** : ce conteneur est un enfant de `flex flex-col` avec `flex-1`, mais **sans `min-h-0`**. Par défaut CSS, un enfant flex a `min-height: auto`, ce qui l'empêche de rétrécir sous la hauteur de son contenu. Résultat : ce conteneur ne se contraint jamais correctement à l'espace disponible entre le header et le footer du drawer — tout ce qui est en dessous (y compris `DynamicEntryGrid` et son propre `ResizablePanel`) hérite d'un espace mal calculé, d'où "à peine une ligne visible" même en resize manuel. Le `ResizablePanel` de `DynamicEntryGrid.tsx` n'est pas en cause — le problème est un niveau au-dessus.

**Correction** :
```tsx
<div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
  {children}
</div>
```
Juste l'ajout de `min-h-0`, rien d'autre à changer dans ce fichier.

**Impact** : ce fix corrige potentiellement aussi d'autres drawers qui utilisent des layouts internes en flex/scroll (à surveiller après coup, sans les modifier maintenant — juste observer si d'autres écrans s'améliorent).

---

## Fix 2 — Passer `AddLivraisonDrawer` en plein écran (la prop existe déjà)

**Fichier** : `components/Stock/AddLivraisonDrawer.tsx`

**Ligne actuelle** :
```tsx
<Drawer
  open={open}
  title="Saisie Globale des Livraisons"
  onClose={onClose}
  wide
>
```

**Correction** — remplacer `wide` par `fullScreen` (déjà supporté par `Drawer.tsx`, juste jamais utilisé ici) :
```tsx
<Drawer
  open={open}
  title="Saisie Globale des Livraisons"
  onClose={onClose}
  fullScreen
>
```

**Ne pas toucher** aux autres usages de `<Drawer>` (catalogue, détail) sauf si tu veux le même traitement plein écran pour eux — dans ce cas, me le dire, sinon les laisser en `wide`/défaut.

---

## Fix 3 — Simplifier le hack de hauteur dans `AddLivraisonDrawer.tsx`

**Ligne actuelle** :
```tsx
<div className="h-[calc(100vh-8rem)] min-h-[520px] -mx-4 md:-mx-6">
  <DynamicEntrySession
    module="livraison"
    ...
```

**Pourquoi c'est fragile** : `calc(100vh-8rem)` suppose que le header + footer du Drawer font exactement 8rem (128px) de haut. Si ces éléments changent de taille un jour (padding, texte multi-ligne dans le titre, etc.), ce calcul devient faux silencieusement. Une fois le Fix 1 appliqué (le `min-h-0` du parent), ce conteneur n'a plus besoin de deviner une hauteur en dur — il peut simplement prendre `h-full` et laisser le flexbox parent faire son travail correctement.

**Correction** :
```tsx
<div className="h-full -mx-4 md:-mx-6">
  <DynamicEntrySession
    module="livraison"
    ...
```

**Important** : applique le Fix 1 (dans `Drawer.tsx`) **avant** ce Fix 3, sinon retirer le `calc()` sans le `min-h-0` en amont recréerait le même bug d'une autre façon.

---

## Fix 4 — Le menu déroulant collaborateur qui passe sous le footer (diagnostic confirmé, correction générale)

Ce bug touche potentiellement `TypeaheadSelect` (utilisé dans `AddCatalogueDrawer.tsx` pour "Collaborateur" et "Catégorie") et le composant équivalent dans la modale "Ajouter un collaborateur".

**Cause** : la liste déroulante est rendue en `position: absolute` **à l'intérieur** du conteneur `flex-1 overflow-y-auto` de `Drawer.tsx`. Un élément absolument positionné ne peut jamais visuellement dépasser les bords d'un ancêtre en `overflow: auto` — il se fait rogner à la frontière de cette zone, quel que soit son `z-index`. C'est pour ça qu'augmenter le z-index ne réglera jamais ce bug : ce n'est pas un problème d'empilement, c'est un problème de zone de clipping.

**Correction recommandée** : rendre la liste déroulante via un portail (`createPortal(list, document.body)`), positionnée en JavaScript avec `getBoundingClientRect()` du champ de saisie, plutôt qu'en `position: absolute` classique dans le flux du composant.

**Fichier à me fournir pour un correctif ligne-précis** : `TypeaheadSelect.tsx` (composant réutilisé dans plusieurs formulaires, donc corriger ici une seule fois règle potentiellement le problème partout où il est utilisé — y compris dans la modale collaborateur si elle réutilise le même composant).

---

## Fix 5 — Réarrangement des champs de la modale "Ajouter un collaborateur"

**Fichier à me fournir** : le composant source de cette modale (nom probable `AddCollaborateurDrawer.tsx` ou similaire — je n'ai que son HTML rendu, pas son code).

**Principe déjà en place ailleurs dans le code** (`AddCatalogueDrawer.tsx`, section Nom/Catégorie) à répliquer ici pour Référence/Date/Commentaire :
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>{/* Référence */}</div>
  <div>{/* Date */}</div>
</div>
```
Et réduire `rows` du `<textarea>` Commentaire à `2` si l'espace vertical reste serré après ce regroupement.

---

## Fix 6 — Restructuration Saisie Globale des Ventes (précis, fichiers reçus)

**Fichiers concernés** : `VenteEntryDrawer.tsx` (à modifier), `LotSelectionTable.tsx` (aucun changement requis, juste déplacé), nouveau fichier `AjouterMarchandisesModal.tsx` (à créer).

**Bonne nouvelle** : le pattern "modale par-dessus le Drawer plein écran" existe déjà dans ce fichier via `QuickAddClientModal` et `ResetSessionModal` (rendus comme siblings du `<Drawer>` principal). Le nouveau composant doit suivre exactement ce même pattern — pas de nouveau mécanisme à inventer.

### Étape 1 — Créer `AjouterMarchandisesModal.tsx`

Déplacer telles quelles dans ce nouveau composant les portions suivantes actuellement dans `VenteEntryDrawer.tsx` :

1. Le `TypeaheadSelect label="Collaborateur"` (filtre, actuellement dans la grille meta 4 colonnes) — il ne sert qu'à filtrer la table de lots, donc il n'a de sens que dans la modale de sélection, pas dans les métadonnées générales de la vente.
2. Le bloc `FormField label="Rechercher un produit"` avec son `<input type="search">`.
3. Le `<ResizablePanel storageKey="pejaa.vente.lots.height" ...><LotSelectionTable ... /></ResizablePanel>` en entier.

Signature proposée :
```tsx
interface AjouterMarchandisesModalProps {
  open: boolean
  onClose: () => void
  lots: LotRow[]
  loading?: boolean
  selected: Record<number, SelectedLine>
  sortField: LotSortField
  sortDir: 'asc' | 'desc'
  onToggleSort: (field: LotSortField) => void
  onToggleLot: (lot: LotRow) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  collaborateurs: { value: string; label: string }[]
  filterCollaborateur: string
  onFilterCollaborateurChange: (value: string) => void
}
```

**Point important** : `onToggleLot` modifie déjà `session.selected` / `session.selectedLines` en direct (le hook `useVenteEntrySession` est déjà branché ainsi dans le code actuel). Ça veut dire que **le bouton "Valider la sélection" n'a besoin de rien faire d'autre que fermer la modale** (`onClose`) — aucune logique de staging à ajouter, la sélection est déjà répercutée en temps réel dans le panier dès qu'on coche une case.

Structure interne : reprendre le même schéma que `QuickAddClientModal` (overlay `fixed inset-0` + panneau centré ou latéral), avec en haut le champ recherche + filtre collaborateur, et en dessous `<LotSelectionTable ... />` qui reste inchangé.

### Étape 2 — Modifier `VenteEntryDrawer.tsx`

**Ajouter l'état** :
```tsx
const [ajouterMarchandisesOpen, setAjouterMarchandisesOpen] = useState(false)
```

**Supprimer de la grille meta** (4 colonnes) le `TypeaheadSelect label="Collaborateur"` — il part dans la modale (voir Étape 1).

**Supprimer entièrement** le bloc `FormField label="Rechercher un produit"` et le `<ResizablePanel>...<LotSelectionTable /></ResizablePanel>` — ils partent dans la modale.

**Remplacer par un bouton**, placé juste avant la section Panier :
```tsx
<div className="px-4 py-3 border-b border-slate-700 shrink-0">
  <button
    type="button"
    onClick={() => setAjouterMarchandisesOpen(true)}
    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg flex items-center gap-2"
  >
    <PlusIcon className="w-4 h-4" />
    Ajouter marchandises
  </button>
</div>
```

**Donner tout l'espace vertical restant au Panier** — remplacer :
```tsx
{session.selectedLines.length > 0 && (
  <div className="border-t border-slate-700 bg-slate-800 shrink-0 max-h-[40vh] overflow-y-auto">
```
par :
```tsx
<div className="border-t border-slate-700 bg-slate-800 flex-1 min-h-0 overflow-y-auto">
  {session.selectedLines.length === 0 ? (
    <div className="py-12 text-center text-sm text-slate-400">
      Aucun article sélectionné — clique sur « Ajouter marchandises »
    </div>
  ) : (
    <>
```
(et fermer le `</>` + `</div>` en conséquence à la fin du bloc, à la place du `)}` actuel). Ce changement retire la condition qui masquait toute la section quand le panier est vide, et lui donne `flex-1 min-h-0` au lieu d'un plafond fixe `max-h-[40vh]`, puisque c'est maintenant le contenu principal de l'écran et non plus une section secondaire.

**Ajouter le rendu de la modale**, au même niveau que `QuickAddClientModal`/`ResetSessionModal` en bas du fichier :
```tsx
<AjouterMarchandisesModal
  open={ajouterMarchandisesOpen}
  onClose={() => setAjouterMarchandisesOpen(false)}
  lots={session.lots}
  loading={session.lotsLoading}
  selected={session.selected}
  sortField={session.sortField}
  sortDir={session.sortDir}
  onToggleSort={session.toggleSort}
  onToggleLot={session.toggleLot}
  searchQuery={session.searchQuery}
  onSearchChange={session.setSearchQuery}
  collaborateurs={collabOptions}
  filterCollaborateur={session.filterCollaborateur}
  onFilterCollaborateurChange={session.setFilterCollaborateur}
/>
```

### Aucun changement requis
- `LotSelectionTable.tsx` — utilisé tel quel à l'intérieur de la nouvelle modale, ses props ne changent pas.
- `useVenteEntrySession` (le hook) — toute la logique de sélection/filtre existe déjà et reste utilisée telle quelle, seul l'endroit où les composants sont rendus change.
