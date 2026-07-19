# Batch 13 — Fix z-index : dropdown TypeaheadSelect invisible dans une modale imbriquée

## Cause confirmée

`components/TypeaheadSelect.tsx` positionne son dropdown flottant (`DropdownPortal`) avec un z-index codé en dur :
```tsx
zIndex: 9999
```
Cette valeur correspond par coïncidence à `Z_SIDEBAR_FLYOUT` (9999) dans `lib/zIndex.ts`, mais n'est reliée à aucune constante centrale. Or `lib/zIndex.ts` définit des tiers plus élevés pour les modales :
```
Z_DRAWER = 10000
Z_MODAL = 10050
Z_MODAL_NESTED = 10052
```
Quand `TypeaheadSelect` est utilisé à l'intérieur d'une modale ouverte à `Z_MODAL_NESTED` (ex: `AjouterMarchandisesModal`), son dropdown (z-index 9999) se retrouve peint **derrière** la modale (z-index 10052). Résultat : le champ réagit normalement en React (aucune erreur), mais la liste flottante est invisible car masquée par le calque de la modale.

## Correction

### Étape 1 — Ajouter un tier dédié dans `lib/zIndex.ts`

**Ajouter**, au-dessus des constantes existantes, une valeur strictement supérieure à la plus haute actuelle (`Z_MODAL_NESTED = 10052`) :
```ts
export const Z_DROPDOWN = 10060
```

**Pourquoi un nouveau tier plutôt que réutiliser `Z_MODAL_NESTED`** : `TypeaheadSelect` est réutilisé dans des contextes variés (Drawer simple, Modal, Modal imbriquée). Un tier dédié, toujours au-dessus de tous les conteneurs existants, évite de recasser le composant à chaque nouveau niveau d'imbrication ajouté ailleurs dans l'app à l'avenir.

### Étape 2 — Utiliser cette constante dans `TypeaheadSelect.tsx`

**Ajouter l'import** :
```tsx
import { Z_DROPDOWN } from '@/lib/zIndex'
```

**Remplacer**, dans le composant `DropdownPortal` :
```tsx
style={{
  position: 'absolute',
  top: `${coords.top}px`,
  left: `${coords.left}px`,
  width: `${coords.width}px`,
  zIndex: 9999,
}}
```
par :
```tsx
style={{
  position: 'absolute',
  top: `${coords.top}px`,
  left: `${coords.left}px`,
  width: `${coords.width}px`,
  zIndex: Z_DROPDOWN,
}}
```

## Ne pas toucher maintenant (juste à surveiller)

`components/SelectWithTags.tsx` utilise déjà `Z_MODAL_NESTED` pour son propre dropdown. S'il est un jour utilisé à l'intérieur d'une modale elle-même à `Z_MODAL_NESTED`, il pourrait présenter le même symptôme. Ne pas modifier ce fichier dans ce batch — seulement y revenir si le même bug est observé dessus.

## Test de validation

1. Ouvrir "Ajouter marchandises" dans la Saisie Globale des Ventes (modale imbriquée dans le Drawer plein écran).
2. Cliquer/taper dans le champ Collaborateur : la liste déroulante doit maintenant apparaître par-dessus la modale, pas en dessous.
3. Vérifier aussi les champs Client et Point de vente dans le même écran (Drawer principal, pas la modale imbriquée) — comportement déjà correct avant ce fix, doit le rester (aucune régression attendue, `Z_DROPDOWN` reste supérieur à `Z_DRAWER` de toute façon).
4. Vérifier le champ Collaborateur dans `AddCatalogueDrawer.tsx` (Drawer simple, sans modale imbriquée) — même vérification de non-régression.
