# Plan d'implémentation — Découpage modulaire de la page Stock (`app/stock/page.tsx`)

Ce plan détaille l'architecture et la stratégie de compression de la page `app/stock/page.tsx` (actuellement **1 311 lignes**), à ramener à **moins de 200 lignes**, en appliquant strictement les consignes des 3 skills :
- **`frontend-design`** : identité visuelle soignée, hiérarchie claire des filtres, micro-interactions naturelles et finitions soignées.
- **`improve-codebase-architecture`** : modules profonds (`deep modules`), haute localité, interfaces découplées et testabilité accrue.
- **`vercel-react-best-practices`** : chargements parallèles (`async-parallel`), séparation des hooks de données et de modales (`rerender-split-combined-hooks`), mémoïsation (`rerender-memo`), et imports dynamiques pour les modales lourdes (`bundle-dynamic-imports`).

---

## 1. Diagnostic de la page actuelle (`app/stock/page.tsx`)

Actuellement, `app/stock/page.tsx` cumule toutes les responsabilités :
1. **Données de référence** : fetch manuel de 4 listes (`collaborateurs`, `pointsDeVente`, `produitsCatalogue`, `unitesDeMesure`).
2. **Onglet 1 (Lots disponibles)** :
   - États de recherche, pagination, tri, switch `Voir épuisés`, filtres avancés (PV, Collab, opérateur/valeur de quantité, date range).
   - Définition inline de 12 colonnes de tableau avec `ActionMenu` et logique de rappel.
3. **Onglet 2 (Catalogue de stock)** :
   - États de recherche, filtre collaborateur, table consolidée stock / seuil d'alerte.
   - Définition inline des colonnes du catalogue.
4. **Onglet 3 (Historique Livraisons)** :
   - Intégration Redux (`livraisonsSlice`), table des livraisons, filtres.
5. **Modales et Tiroirs intégrés en vrac** :
   - `StockAdjustModal`, `AddCatalogueDrawer`, `QuickAddProduitModal`, `LotExplorer`, `VenteAnnulationModal`.
   - Tiroir générique pour détail lot, mouvements de stock et détail livraison.
   - Modale de modification du seuil d'alerte.

---

## 2. Architecture modulaire cible (`components/Stock/`)

La page sera réorganisée en modules spécialisés et découplés :

```
components/Stock/
├── types.ts                    # Interfaces partagées (Lot, Catalogue, Collaborateur, PointDeVente, etc.)
├── stockTypes.ts               # Types spécifiques aux filtres, tris, colonnes et états UI
├── stockUtils.tsx              # Badges de stock, formatters, indicateurs de seuil d'alerte
├── useStockData.ts             # Custom hook de données (fetchs parallèles, pagination, filtres lots & catalogue)
├── useStockModales.ts          # Custom hook de modales/tiroirs (ajustement, seuil, quick add, explorer, annulation)
├── TabLotsDisponibles.tsx      # Onglet Lots (barre recherche, switch épuisés, filtres avancés, ResponsiveDataTable)
├── TabCatalogueStock.tsx       # Onglet Catalogue consolidé (recherche, filtre collab, ResponsiveDataTable, seuil)
├── TabLivraisons.tsx           # Onglet Livraisons (Redux livraisonsState, ResponsiveDataTable, filtres)
├── DrawerStockDetail.tsx       # Tiroir latéral unifié de détail (lot, mouvements, livraison, produit)
├── ModalEditSeuil.tsx          # Modale dédiée de modification du seuil d'alerte
├── (Composants existants : ActionMenu.tsx, LotExplorer.tsx, StockAdjustModal.tsx, AddCatalogueDrawer.tsx, QuickAddProduitModal.tsx)
app/stock/
└── page.tsx                    # Page principale condensée (< 180 lignes) qui orchestre TabBox, useStockData et les tiroirs
```

---

## 3. Revue selon les 3 Skills

### A. `frontend-design` (Design d'interface intentionnel et distinctif)
- **Barre d'outils uniforme et aérée** : Harmonisation des filtres entre les onglets avec des contrôles précis (`SelectWithTags`, recherche en temps réel, switch toggle élégant).
- **Indicateurs de seuil d'alerte** : Présentation visuelle claire des stocks critiques avec badge d'alerte doux (`text-red-600 dark:text-red-400 font-semibold`) plutôt que des alertes criardes.
- **Micro-interactions** : Transition fluide lors du dépliage des filtres avancés, feedback visuel immédiat lors des ajustements de stock.
- **Accessibilité & typographie** : Alignement strict sur la police globale, contrastes conformes en mode clair et sombre, prise en charge native du responsive mobile.

### B. `improve-codebase-architecture` (Architecture profonde et découplage)
- **Module profond `useStockData`** : Masque la complexité des requêtes réseau, de la pagination et de la composition des filtres derrière une interface simple et prédictible.
- **Haute localité (`locality`)** : Chaque composant d'onglet (`TabLotsDisponibles`, `TabCatalogueStock`, `TabLivraisons`) possède ses propres colonnes et ses interactions locales.
- **Testabilité** : Les onglets peuvent être testés unitairement sans charger l'ensemble de la page ni simuler tous les sous-systèmes simultanément.
- **Seams propres** : Les flux de mutations (ajustement de stock, modification de seuil, création rapide) communiquent par des callbacks typés (`onSuccess={() => refresh()}`).

### C. `vercel-react-best-practices` (Optimisation Next.js / React)
- **`async-parallel`** : Chargement des listes de référence (`collaborateurs`, `pointsDeVente`, `produits`, `unitesDeMesure`) via `Promise.all()` sans cascades séquentielles.
- **`rerender-split-combined-hooks`** : Séparation stricte de l'état des données (`useStockData`) et de l'état transitoire des modales (`useStockModales`) pour éviter les re-rendus inutiles de tableaux de données lors de l'ouverture/fermeture d'un tiroir.
- **`rerender-memo`** : Mémoïsation des colonnes de tableau (`useMemo`) et des fonctions d'actions (`useCallback`) pour préserver les performances de `ResponsiveDataTable`.
- **`bundle-dynamic-imports`** : Chargement paresseux (`next/dynamic`) pour les tiroirs et modales lourds (`LotExplorer`, `StockAdjustModal`, `VenteAnnulationModal`) afin d'alléger le bundle initial de la page.

---

## 4. Plan d'exécution étape par étape

1. **Création de `components/Stock/stockTypes.ts` et `stockUtils.tsx`** :
   - Centralisation des interfaces de filtres, colonnes, données de détail et aides au rendu (statuts, seuils, quantités).
2. **Création du Hook `useStockData.ts`** :
   - Fetching parallèle des références.
   - Gestion des lots (chargement API, filtres, tri, pagination serveur).
   - Gestion du catalogue (recherche client, filtre collaborateur).
   - Actions de rafraîchissement global et ciblé.
3. **Création du Hook `useStockModales.ts`** :
   - Gestion des états d'ouverture et des payloads pour `StockAdjustModal`, `AddCatalogueDrawer`, `QuickAddProduitModal`, `LotExplorer`, `VenteAnnulationModal`, `ModalEditSeuil`, et `DrawerStockDetail`.
4. **Création des composants modulaires d'onglets** :
   - `components/Stock/TabLotsDisponibles.tsx` : recherche, switch épuisés, filtres avancés, colonnes avec `ActionMenu`, `ResponsiveDataTable`.
   - `components/Stock/TabCatalogueStock.tsx` : recherche, filtre collaborateur, colonnes catalogue, seuil d'alerte, `ResponsiveDataTable`.
   - `components/Stock/TabLivraisons.tsx` : intégration Redux livraisons, colonnes, filtres, `ResponsiveDataTable`.
5. **Création des modales et tiroirs extraits** :
   - `components/Stock/DrawerStockDetail.tsx` : affichage unifié lot/mouvements/livraison avec chargement asynchrone des mouvements.
   - `components/Stock/ModalEditSeuil.tsx` : modale isolée de saisie du seuil d'alerte.
6. **Refactorisation de `app/stock/page.tsx`** :
   - Assemblage compact de la page principale sous la barre des 180 lignes.
7. **Validation et tests** :
   - `npx tsc --noEmit` (0 erreur).
   - Tests unitaires et régression des composants.
   - Build Next.js.
