# Batch 14 — Fix TypeaheadSelect : clic sur une option ne sélectionne rien

## Cause confirmée

`components/TypeaheadSelect.tsx` rend sa liste d'options via un portail (`createPortal(..., document.body)`), mais son détecteur de "clic à l'extérieur" ne vérifie que `containerRef`, pas le contenu du portail :

```tsx
const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
    setOpen(false)
  }
}
```

Séquence du bug :
1. `mousedown` sur une option → `containerRef.current.contains(e.target)` est `false` (l'option est dans le portail, ailleurs dans le DOM) → `setOpen(false)` ferme immédiatement le dropdown.
2. Le `click` qui suit ne trouve plus le bouton (démonté) → `handleSelect` ne s'exécute jamais.
3. Le champ reste vide, aucune erreur console.

Comparaison avec `SelectWithTags.tsx` (même pattern de portail, fonctionne correctement) : ce composant vérifie en plus `portalRef.current?.contains(target)` avant de fermer. C'est exactement ce qui manque à `TypeaheadSelect`.

**Composants affectés** (tous ceux qui utilisent `TypeaheadSelect`, notamment dans les saisies globales) : `VenteEntryDrawer.tsx`, `AjouterMarchandisesModal.tsx`, `AddCatalogueDrawer.tsx`, et tout autre formulaire utilisant ce composant pour Point de vente / Client / Collaborateur / Catégorie.

**Non affecté** : `MultiSelectTags.tsx` (ne portale pas, fonctionne déjà correctement) et `SelectWithTags.tsx` (portale mais gère déjà le cas correctement).

## Correction

**Fichier** : `components/TypeaheadSelect.tsx`

### Étape 1 — Marquer le conteneur du portail

Dans le composant `DropdownPortal`, ajouter un attribut identifiable sur le `<div>` rendu :

**Avant** :
```tsx
return createPortal(
  <div
    style={{
      position: 'absolute',
      top: `${coords.top}px`,
      left: `${coords.left}px`,
      width: `${coords.width}px`,
      zIndex: Z_DROPDOWN,
    }}
  >
    {children}
  </div>,
  document.body
)
```

**Après** :
```tsx
return createPortal(
  <div
    data-typeahead-portal
    style={{
      position: 'absolute',
      top: `${coords.top}px`,
      left: `${coords.left}px`,
      width: `${coords.width}px`,
      zIndex: Z_DROPDOWN,
    }}
  >
    {children}
  </div>,
  document.body
)
```

### Étape 2 — Corriger le détecteur de clic extérieur

**Avant** :
```tsx
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
```

**Après** :
```tsx
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (containerRef.current && containerRef.current.contains(target)) return
    if (target.closest('[data-typeahead-portal]')) return
    setOpen(false)
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
```

Aucun autre changement dans le fichier — `handleSelect`, `handleFocus`, `handleClear` restent identiques.

## Test de validation

1. Ouvrir la Saisie Globale des Ventes → champ "Point de vente" : cliquer sur une option de la liste doit maintenant la sélectionner (le champ affiche la valeur choisie, le dropdown se ferme).
2. Même test sur le champ "Client" et sur "Collaborateur" dans `AjouterMarchandisesModal`.
3. Champ "Collaborateur" et "Catégorie" dans `AddCatalogueDrawer.tsx` (formulaire catalogue).
4. Vérifier que le clic **à l'extérieur** du champ (ailleurs sur la page) ferme toujours correctement le dropdown sans sélection — pour confirmer que le fix n'a pas cassé ce comportement dans l'autre sens.
