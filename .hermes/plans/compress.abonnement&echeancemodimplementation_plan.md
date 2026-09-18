# Plan d'implémentation — Découpage modulaire de la page Abonnements & UX Échéances

Ce plan adresse deux objectifs prioritaires :
1. **Modularisation et allègement drastique de `app/abonnements/page.tsx`** (actuellement ~1840 lignes, à ramener à moins de 200 lignes) via extraction des types/helpers, custom hooks et sous-composants d'onglets.
2. **Évolutions UX sur les échéances et le switch** :
   - Entête compact pour la liste des échéances (derniers nœuds de l'arbre).
   - Affichage de 5 échéances par souscription avec bouton / action « Voir plus ».
   - Affichage explicite du montant déjà payé (« Payé : X Ar » ou « Payé : 0 Ar » si non payé) à côté du montant restant.
   - Remplacement du switch « Trier par collaborateur » par le design exact de `app/stock/page.tsx` (lignes 748-757).

---

## 1. Découpage modulaire de `app/abonnements/page.tsx`

La page sera réorganisée en modules spécialisés dans `components/Abonnements/` :

```
components/Abonnements/
├── abonnementsTypes.ts          # Interfaces (Offre, Souscription, Echeance, Filtres, Paiements)
├── abonnementsUtils.tsx         # Badges, avatars, formatters, helpers de statuts (Figma)
├── useAbonnementsData.ts        # Custom hook data : fetchs, filtres, tri, pagination, cache échéances
├── useAbonnementsModales.ts     # Custom hook modales : formulaires création, confirmation, drawers
├── TabOffres.tsx                # Onglet Offres / Abonnements catalogue
├── TabSouscriptions.tsx         # Onglet Souscriptions (arborescence, switch stock, échéances)
├── TabPaiements.tsx             # Onglet Paiements (historique et annulations)
├── ModaleOffre.tsx              # Modale de création d'offre
├── ModaleSouscription.tsx       # Modale de création de souscription
├── DrawerOffre.tsx              # (Existant) Détail offre
└── DrawerSouscription.tsx        # (Existant) Détail souscription
app/abonnements/
└── page.tsx                     # Page principale condensée (< 200 lignes) qui orchestre l'ensemble
```

---

## 2. Évolutions UX demandées

### A. Entête pour les échéances
- Pour chaque souscription dépliée (que ce soit en mode liste standard ou en mode groupé par collaborateur), insérer un entête compact au-dessus du groupe d'échéances :
  - `Période (début → fin)` · `Montant` · `Statut` · `Date de paiement` · `Payé / Reste dû`.
  - Style épuré et sobre : bandeau gris discret (`bg-slate-100/70 dark:bg-slate-800/70 text-[10px] font-semibold text-slate-500 uppercase tracking-wider`).

### B. Affichage de 5 échéances avec bouton « Voir plus »
- Chaque souscription affiche jusqu'à 5 échéances.
- Si la souscription en compte plus de 5, un bouton interactif « Voir les X autres échéances » (ou replier) permet d'afficher l'intégralité sans quitter la table.
- Les données réelles sont chargées paresseusement via l'API existante `/api/souscriptions-abonnements/:id` et mises en cache local (respect offline-first).

### C. Montants déjà payé et restant à payer
- Dans les cellules d'échéance et de prochaine échéance :
  - Calculer `montant_paye` (somme des paiements actifs ou `montant - reste`).
  - Afficher systématiquement :
    - `Payé : {formatMontant(paye)}` (si 0 : `Payé : 0 Ar`).
    - Si `reste > 0` : `{formatMontant(reste)} restant` (en rouge/orange).

### D. Switch « Trier par collaborateur » identique à `stock/page.tsx`
- Remplacer le switch actuel par le composant de `app/stock/page.tsx` :
  ```tsx
  <label className="inline-flex items-center gap-2 cursor-pointer select-none h-[42px] px-3">
    <div
      onClick={() => setGroupByCollab(prev => !prev)}
      className={`relative w-9 h-5 rounded-full transition-colors ${groupByCollab ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${groupByCollab ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">Trier par collaborateur</span>
  </label>
  ```

---

## 3. Plan d'exécution par étapes

1. **Création de `abonnementsTypes.ts` et `abonnementsUtils.tsx`** :
   - Migration de tous les types et mappers visuels (Avatar, RenewBadge, SitBadge, EchBadge, PayLabel, etc.).
2. **Création du Custom Hook `useAbonnementsData.ts`** :
   - Gestion des données `offres`, `souscriptions`, `paiements`, `collaborateurs`.
   - Pipeline de tri, filtres (recherche, statut, date), pagination.
   - Cache d'échéances et enrichissement des données hiérarchiques.
3. **Création du Custom Hook `useAbonnementsModales.ts`** :
   - États d'ouverture des modales, formulaires, loadings, handlers de création et confirmation.
4. **Création des composants modales `ModaleOffre.tsx` et `ModaleSouscription.tsx`**.
5. **Création des composants d'onglets `TabOffres.tsx`, `TabPaiements.tsx` et `TabSouscriptions.tsx`** :
   - Dans `TabSouscriptions.tsx` : intégration de l'entête d'échéances, limite 5 échéances avec bouton « Voir plus », switch de `stock/page.tsx`, et affichage `Payé : X Ar`.
6. **Refactorisation finale de `app/abonnements/page.tsx`** :
   - Assemblage clair et lisible en moins de 200 lignes.
7. **Validation complète** :
   - Tests unitaires ResponsiveDataTable (`vitest run __tests__/components/ResponsiveDataTable.test.tsx`).
   - Tests API abonnements (`vitest run __tests__/api/abonnements.test.ts`).
   - Compilation TypeScript (`npx tsc --noEmit`).
   - Build de production Next.js (`npm run build`).
