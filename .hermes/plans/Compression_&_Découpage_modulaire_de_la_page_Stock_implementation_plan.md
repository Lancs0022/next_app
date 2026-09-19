# Plan d'implémentation — Compression & Découpage modulaire de la page Stock (`app/stock/page.tsx`)

Découpage modulaire complet de la page `app/stock/page.tsx` (actuellement **1 311 lignes**) pour la ramener à **moins de 200 lignes**, suivant le modèle éprouvé sur la page Abonnements (`.hermes/plans/compress.abonnement&echeancemodimplementation_plan.md`) et respectant strictement les 3 skills :
- **`frontend-design`** : UI soignée, harmonisation des filtres et contrôles, micro-interactions, responsive mobile.
- **`improve-codebase-architecture`** : architecture profonde (`deep modules`), haute localité (`locality`), découplage et testabilité unitaire.
- **`vercel-react-best-practices`** : requêtes parallèles (`async-parallel`), séparation hooks de données / hooks de modales (`rerender-split-combined-hooks`), mémoïsation (`rerender-memo`) et imports dynamiques (`bundle-dynamic-imports`).

---

## Architecture modulaire cible

```
components/Stock/
├── types.ts                    # Interfaces partagées (Lot, Catalogue, Collaborateur, PointDeVente, etc.)
├── stockTypes.ts               # [NEW] Types de filtres, tris, colonnes et états UI
├── stockUtils.tsx              # [NEW] Badges d'état, formatters, calculs seuil/quantité
├── useStockData.ts             # [NEW] Custom hook données (fetchs parallèles, lots, catalogue, pagination serveur)
├── useStockModales.ts          # [NEW] Custom hook modales (ajustement, seuil, quick add, explorer, annulation)
├── TabLotsDisponibles.tsx      # [NEW] Onglet Lots (recherche, switch épuisés, filtres avancés, table, actions)
├── TabCatalogueStock.tsx       # [NEW] Onglet Catalogue consolidé (recherche, filtre collab, table, seuil d'alerte)
├── TabLivraisons.tsx           # [NEW] Onglet Livraisons (Redux livraisonsState, ResponsiveDataTable, filtres)
├── DrawerStockDetail.tsx       # [NEW] Tiroir latéral unifié (lot, mouvements paresseux, livraison, produit)
├── ModalEditSeuil.tsx          # [NEW] Modale dédiée d'édition de seuil d'alerte
├── (Composants existants : ActionMenu.tsx, LotExplorer.tsx, StockAdjustModal.tsx, AddCatalogueDrawer.tsx, QuickAddProduitModal.tsx)
app/stock/
└── page.tsx                    # [MODIFY] Page principale condensée (< 180 lignes) orchestrant TabBox et les hooks
```

---

## Revue selon les 3 Skills

### 1. `frontend-design`
- **Filtres avancés & switch** : Remplacement des filtres rigides par des composants flexibles, préservation du switch toggle `Voir épuisés` déjà calibré.
- **Indicateurs visuels de seuil** : Rendu clair des stocks sous le seuil d'alerte sans surcharge visuelle.
- **Micro-interactions** : Transitions douces lors du dépliage des filtres, retours immédiats par toasts unifiés.

### 2. `improve-codebase-architecture`
- **Module profond `useStockData`** : Centralise la synchronisation serveur, les filtres et le tri des lots derrière une interface simple.
- **Localité maximale** : Chaque onglet encapsule la définition de ses colonnes, ses filtres spécifiques et ses actions.
- **Contrat clair** : Élimination des états croisés et des variables globales non typées.

### 3. `vercel-react-best-practices`
- **`async-parallel`** : Chargement initial parallèle des 4 tables de référence (`Promise.all()`).
- **`rerender-split-combined-hooks`** : Isolation de l'état des modales (`useStockModales`) pour ne pas re-rendre les grands tableaux lors des ouvertures de tiroirs.
- **`bundle-dynamic-imports`** : Chargement dynamique (`next/dynamic`) pour `LotExplorer`, `StockAdjustModal` et `VenteAnnulationModal`.
- **`rerender-memo`** : Mémoïsation rigoureuse des colonnes de `ResponsiveDataTable`.

---

## Proposed Changes

### Composants modulaires Stock (`components/Stock/`)

#### [NEW] [stockTypes.ts](file:///d:/Code/Pejaa/next_app/components/Stock/stockTypes.ts)
Types pour les filtres de lots (opérateurs de quantité, dates, multi-sélection PV/collabs), filtres catalogue, et états de tri.

#### [NEW] [stockUtils.tsx](file:///d:/Code/Pejaa/next_app/components/Stock/stockUtils.tsx)
Helpers de formatage de quantités, calculs d'alerte seuil et badges de statut.

#### [NEW] [useStockData.ts](file:///d:/Code/Pejaa/next_app/components/Stock/useStockData.ts)
Gestionnaire réactif de chargement : références, lots disponibles avec filtres et pagination serveur, catalogue consolidé et rafraîchissements.

#### [NEW] [useStockModales.ts](file:///d:/Code/Pejaa/next_app/components/Stock/useStockModales.ts)
Gestionnaire des états d'ouverture et des cibles de modales (ajustement de lot, modification de seuil, explorer, annulation de vente, tiroir de mouvements).

#### [NEW] [TabLotsDisponibles.tsx](file:///d:/Code/Pejaa/next_app/components/Stock/TabLotsDisponibles.tsx)
Composant d'onglet pour les lots : barre de recherche, switch épuisés, filtres avancés, ResponsiveDataTable avec ActionMenu.

#### [NEW] [TabCatalogueStock.tsx](file:///d:/Code/Pejaa/next_app/components/Stock/TabCatalogueStock.tsx)
Composant d'onglet pour le catalogue : recherche, filtre collaborateur, suivi du stock vs seuil d'alerte, ResponsiveDataTable.

#### [NEW] [TabLivraisons.tsx](file:///d:/Code/Pejaa/next_app/components/Stock/TabLivraisons.tsx)
Composant d'onglet pour les livraisons : liaison avec `redux/livraisonsSlice`, table historique et détails.

#### [NEW] [DrawerStockDetail.tsx](file:///d:/Code/Pejaa/next_app/components/Stock/DrawerStockDetail.tsx)
Tiroir unifié pour les détails de lot, les mouvements historiques (avec fetch paresseux sans bloquer la vue) et les détails de livraison.

#### [NEW] [ModalEditSeuil.tsx](file:///d:/Code/Pejaa/next_app/components/Stock/ModalEditSeuil.tsx)
Modale dédiée à la modification rapide du seuil d'alerte d'un produit catalogue.

---

### Page Principale (`app/stock/`)

#### [MODIFY] [page.tsx](file:///d:/Code/Pejaa/next_app/app/stock/page.tsx)
Remplacement des 1 311 lignes par un orchestrateur sobre (< 180 lignes) connectant `TabBox`, `useStockData`, `useStockModales` et les tiroirs.

---

## Verification Plan

### Automated Tests
- Vérification TypeScript complète :
  ```powershell
  npx tsc --noEmit
  ```
- Tests unitaires existants :
  ```powershell
  npx vitest run __tests__/components/ResponsiveDataTable.test.tsx
  ```

### Manual Verification
- Navigation entre les 3 onglets (Lots, Catalogue, Livraisons).
- Test du switch `Voir épuisés` et des filtres avancés de lots.
- Test de l'ouverture du tiroir de mouvements et du tiroir de détails.
- Test de la modification de seuil d'alerte.
- Test de l'ajustement de stock et création rapide de produit catalogue.
