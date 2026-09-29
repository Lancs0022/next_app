# Refonte — Journal des événements de stock (`/stock/mouvements`)

## 0. Contexte & Objectif

L'ancienne page `StockMouvementsPage` (`app/stock/mouvements/page.tsx`) est un tableau brut du ledger technique `stock_mouvement` (`ID | Lot | Type | Qté | Avant/Après | Source | Date`).
L'objectif est de la refondre entièrement en un **journal métier des événements de stock** moderne, vivant, hautement lisible et opérationnel, en répondant à la hiérarchie :
- **Niveau 1 : Événement agrégé** (vue par défaut compacte dans `ResponsiveDataTable` avec 4 colonnes).
- **Niveau 2 : Mouvements atomiques** (expansion directe dans la table pour voir les composants enfants).
- **Mini-tableau / mini-modal** (consultation tabulaire directe des lignes atomiques réelles).
- **Drawer de détail contextuel** (traçabilité complète : contexte métier, impact stock avec blocs distincts Source/Destination pour les transferts, dates distinctes événement vs enregistrement, opérateur, marchandise détaillée, et actions métier dont annulation).

---

## 1. Analyse & Évolution des Données Backend (Règle #43)

Le modèle Prisma `StockMouvement` stocke les clés étrangères nues (`id_lot`, `created_by`, `source_type`, `source_id`).
Pour respecter scrupuleusement la règle #43 (**aucune donnée simulée ou inventée dans le frontend**), le backend doit joindre les entités réelles :

### Évolution de `services/stock.service.ts` (`listStockMouvements`) et `app/api/stock/mouvements/route.ts`
1. **Filtres serveur & pagination** :
   - Prise en charge de `page`, `limit`, `dateMin`, `dateMax`, `type`, `source_type`, `id_lot`, `id_pdv`, `id_utilisateur`, `search` (`q`).
   - Retour : `{ data: EnrichedStockMouvement[], total, page, limit }`.
2. **Jointure des entités réelles** :
   - `livraison_item` + `produit_catalogue` + `unite_de_mesure` ➔ nom produit, sku, catégorie, unité (`code`, `label`, `est_decimal`), statut du lot.
   - `point_de_vente` ➔ nom du point de vente / dépôt.
   - `utilisateur` ➔ nom et prénom de l'opérateur (`created_by_nom`).
   - `source_type` & `source_id` :
     - Si `VENTE` : jointure `vente` + `client` (nom, prénom, entreprise), statut, date de vente.
     - Si `LIVRAISON` : jointure `livraison` (`numero_bon`, date, statut).
     - Si `TRANSFERT` : jointure `stock_transfert` (point de vente source, point de vente destination, commentaire).
     - Si `AJUSTEMENT` : jointure `stock_ajustement` (motif, type, date).

---

## 2. Modèle et Agrégation Métier (`StockEvent`)

Normalisation claire avant le rendu dans `ResponsiveDataTable` :
```text
DONNÉES API ENRICHIES
        ↓
buildStockEvents (normalisation & groupement par source métier : source_type + source_id)
        ↓
StockEvent[]
  ├── id (ex: evt-TRANSFERT-18)
  ├── type (ENTREE, SORTIE, TRANSFERT, RETOUR, RESERVATION, AJUSTEMENT, ANNULATION)
  ├── reference (Transfert #18, Vente #384, etc.)
  ├── eventDate & createdAt (dates distinctes)
  ├── operator (nom)
  ├── status (Effectué, Payée, Annulée...)
  ├── movements[] (mouvements atomiques)
  ├── isGrouped (movements.length > 1)
  └── résumés formatés pour les 4 colonnes
```

- Si un événement ne contient qu'**un seul mouvement** : pas de badge "1 mouvement" parasite ni de chevron vide. Clic sur la ligne ➔ Drawer direct.
- Si un événement contient **N mouvements** : badge de pluralité doux `[4 mouvements]`, chevron d'expansion `ResponsiveDataTable`, action pour ouvrir le mini-tableau et drawer global.

---

## 3. Colonnes du Tableau Principal & Densité (Max 3 lignes/colonne)

### Colonne 1 : Événement
- Ligne 1 : Date & heure (`08 sept. 2026 · 11:14`)
- Ligne 2 : Badge plein de type sémantique (`ENTRÉE`, `SORTIE`, `TRANSFERT`, `RETOUR`, `RÉSERVATION`, `AJUSTEMENT`, `ANNULATION`)
- Ligne 3 : Référence (`Transfert #18` ou `Vente #384 · 4 mouvements`)

### Colonne 2 : Article / lot
- Produit : Nom (`Riz blanc 5 kg` ou `3 articles différents`)
- Référence : SKU (`REF-RIZ-005`)
- Lot & Unité : `Lot #128 · [kg]` (badge soft)

### Colonne 3 : Mouvement (sans soldes avant/après dans la table)
- Livraison : `Dépôt central` \n `+50 kg`
- Vente : `Dépôt central` \n `−3 kg → Client Q`
- Retour : `Dépôt central` \n `+3 kg ← Client Q`
- Transfert : `Dépôt central −20 kg → Boutique A +20 kg` (ou `Dépôt central → Boutique A` si multi-lignes)
- Ajustement : `Dépôt central` \n `−5 kg` (motif secondaire)
- Réservation : `Dépôt central` \n `−10 kg · [RÉSERVATION]`

### Colonne 4 : Opérateur
- Ligne 1 : `Alice` (avec avatar/icône subtile)
- Ligne 2 : `créé le 08 sept. · 11:16`

### Mobile View (`renderMobilePrimary`)
Rendu en carte compacte conforme à la spécification :
```text
┌────────────────────────────────────┐
│ 11:14 · TRANSFERT · #18          ▼ │
│                                    │
│ Riz blanc 5 kg                     │
│ Lot #128 · [kg]                    │
│                                    │
│ Dépôt central −20 kg               │
│ → Boutique A +20 kg                │
│                                    │
│ Alice                              │
│ Créé le 08 sept. · 11:16          │
└────────────────────────────────────┘
```

---

## 4. Composants & Architecture

### Support `canExpandRow` dans `ResponsiveDataTable`
- Ajout de `canExpandRow?: (row: T, depth?: number) => boolean` dans `types.ts`, `DataTableDesktopView.tsx`, `DataTableMobileView.tsx`, et `useDataTablePipeline.ts`.
- Permet à `ResponsiveDataTable` de masquer le chevron et désactiver l'expansion pour les événements à 1 mouvement tout en permettant l'expansion compacte pour les événements groupés.

### Nouveaux composants dans `components/Stock/Journal/`
1. `journalTypes.ts` : Types TypeScript complets (`EnrichedStockMouvement`, `StockEvent`, `JournalFiltersState`).
2. `journalUtils.ts` : Fonctions pures d'agrégation, calculs de badges sémantiques, formats monétaires/quantités, extraction du sens de mouvement.
3. `JournalFilterBar.tsx` : Barre de filtres reprenant le pattern de `TabLotsDisponibles.tsx` :
   - Recherche texte principale (`q`)
   - Filtre rapide par type (pilules / dropdown)
   - Bouton "Filtres avancés"
   - Panneau dépliable avec : Type, Source métier, Point de vente (multi/select), Opérateur, Période (`DateRangeFilter`), Statut
   - Bouton "Réinitialiser"
   - Ligne de badges actifs avec bouton de suppression individuelle (`×`)
4. `JournalExpandedRow.tsx` : Rendu compact des mouvements enfants dans la ligne développée de `ResponsiveDataTable`.
5. `JournalMiniTableModal.tsx` : Mini-modal / mini-tableau affichant toutes les lignes atomiques réelles non agrégées avec leur avant/après, quantité, lot, produit, sens, opérateur.
6. `JournalDrawerDetail.tsx` : Drawer contextuel complet (`Drawer.tsx`) :
   - Header avec type & référence
   - Section 1 : Informations générales
   - Section 2 : Dates (événement vs enregistrement séparés)
   - Section 3 : Opérateur
   - Section 4 : Article / Marchandise (liste sans addition d'unités incompatibles)
   - Section 5 : Impact stock (avec double bloc séparé **SOURCE** et **DESTINATION** pour les transferts)
   - Section 6 : Mouvements associés avec bouton vers le mini-tableau
   - Section 7 : Source métier avec navigation / lien direct
   - Section 8 : Actions (dont annulation de vente via `/api/ventes/[id]/annuler`)

### Page principale `app/stock/mouvements/page.tsx`
- Remplacement intégral de l'ancienne page technique par l'orchestrateur du nouveau journal.

---

## 5. Plan de Vérification

### Tests Automatisés
- Exécuter la suite existante Vitest pour garantir 100% de non-régression sur `ResponsiveDataTable` :
  `npx vitest run __tests__/components/ResponsiveDataTable.test.tsx`
- Nouveau test unitaire dédié pour le normalisateur d'événements :
  `__tests__/components/journalUtils.test.ts` (vérifiant l'agrégation métier par `source_type` + `source_id`, le calcul des variations de transfert, la séparation des unités incompatibles).
- Vérification TypeScript stricte :
  `npx tsc --noEmit`

### Vérification Manuelle & Visuelle
- Tester le filtrage rapide, les filtres avancés, la réinitialisation et la suppression par badge.
- Vérifier l'expansion d'une ligne groupée (transfert multi-lignes, vente multi-articles).
- Vérifier qu'un événement simple n'affiche aucun chevron parasite.
- Tester l'ouverture du mini-tableau modal des mouvements atomiques.
- Tester le Drawer de détail (vérifier les doubles blocs source/dest pour transfert, les dates séparées, etc.).
- Tester le responsive (vue mobile en cartes compactes).
