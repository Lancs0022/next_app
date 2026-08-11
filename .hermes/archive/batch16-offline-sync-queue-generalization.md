# Batch 16 — Généraliser la sync queue offline-first (Collaborateurs, Produit Catalogue, Unité de mesure)

## Périmètre

Ce batch étend `useOfflineSyncQueue` (déjà fonctionnel pour Ventes/Livraisons) à de nouvelles
entités créables hors-ligne : Collaborateurs, Produit Catalogue, Unité de mesure.

**Ce batch NE couvre PAS** la lecture résiliente (Ventes/Stock/mouvements de stock affichés hors
ligne) — c'est un mécanisme différent (cache de requêtes, voir `architecture-data-strategy.md`,
Option C). La sync queue ici ne gère que les **écritures** (création d'entités). Ne pas mélanger
les deux dans la même implémentation, ce sont deux problèmes différents avec des solutions différentes.

---

## Étape 0 — Fix de résilience obligatoire, avant toute extension

**Fichier** : `hooks/useOfflineSyncQueue.ts`

**Problème** : un item en erreur permanente (validation 4xx) reste bloqué en tête de file pour
toujours, bloquant tout ce qui est derrière lui.

**Correction** — classifier l'erreur dans `processOne` :

```ts
const processOne = useCallback(async (): Promise<boolean> => {
  if (processingRef.current || !isOnline) return false

  const queue = loadQueue(module)
  if (queue.length === 0) return false

  const item = queue[0]
  processingRef.current = true

  try {
    await sendItem(item)  // voir Étape 1 pour sendItem générique
    dequeue(item.client_uuid)
    onSyncSuccess?.()
    return true
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string }
    const status = err?.response?.status

    if (status && status >= 400 && status < 500) {
      // Erreur permanente (validation) : ne PAS retenter indéfiniment.
      // Sortir de la file active vers une file d'échecs séparée et persistée.
      moveToFailedQueue(module, item, err?.response?.data?.error || 'Erreur de validation')
      dequeue(item.client_uuid)
      onSyncError?.(err?.response?.data?.error || 'Entrée rejetée, voir les échecs de synchronisation')
      return true  // true pour continuer à traiter le reste de la file, pas bloquer dessus
    }

    // Erreur réseau/5xx : reste en file, on retentera à la prochaine reconnexion
    onSyncError?.(err?.message || 'Erreur de synchronisation, nouvelle tentative à la reconnexion')
    return false
  } finally {
    processingRef.current = false
  }
}, [module, isOnline, dequeue, onSyncSuccess, onSyncError])
```

**Nouvelles fonctions de stockage** dans `lib/dynamicEntry/storage.ts` :
```ts
export function loadFailedQueue(module: DynamicEntryModule): FailedSyncItem[] { ... }
export function moveToFailedQueue(module: DynamicEntryModule, item: SyncQueueItem, reason: string) { ... }
export function clearFailedItem(module: DynamicEntryModule, clientUuid: string) { ... }
```

**UI minimale requise** : un endroit (même basique — une petite liste dans les paramètres, ou un
badge sur `SyncStatusIndicator` existant) pour que l'utilisateur voie "3 entrées ont échoué, cliquez
pour voir pourquoi" — sinon les échecs disparaissent silencieusement de son point de vue, ce qui est
pire que le blocage actuel.

---

## Étape 1 — Rendre `SyncQueueItem` générique

**Fichier** : `lib/dynamicEntry/types.ts`

**Avant** (probablement, à vérifier dans le fichier réel) : `SyncQueueItem` a des champs spécifiques
vente (`date_vente`, `id_client`) et livraison (`date_livraison`, `reference`) mélangés dans un seul
type, avec `processOne` qui fait `if (item.module === 'livraison') {...} else {...}` pour savoir quoi
envoyer.

**Après** — un seul type générique, le payload exact est la responsabilité du hook appelant, pas de
la queue :
```ts
export type DynamicEntryModule =
  | 'vente'
  | 'livraison'
  | 'collaborateur'
  | 'produit_catalogue'
  | 'unite_mesure'

export interface SyncQueueItem {
  client_uuid: string
  module: DynamicEntryModule
  payload: Record<string, unknown>   // corps exact attendu par l'endpoint, construit par le hook appelant
  enqueuedAt: number
}
```

**Registre des endpoints**, nouveau fichier `lib/dynamicEntry/syncEndpoints.ts` :
```ts
export const SYNC_ENDPOINTS: Record<DynamicEntryModule, string> = {
  vente: '/ventes/directe',
  livraison: '/livraisons',
  collaborateur: '/collaborateurs',
  produit_catalogue: '/produits-catalogue',
  unite_mesure: '/unites-mesure',
}
```

**`sendItem` générique** dans `useOfflineSyncQueue.ts`, remplace le `if/else` en dur :
```ts
const sendItem = (item: SyncQueueItem) => api.post(SYNC_ENDPOINTS[item.module], item.payload)
```

**Migration des hooks existants** : `useVenteEntrySession.ts` et `useDynamicEntrySession.ts`
construisent déjà leur `SyncQueueItem` avec les champs spécifiques — il faut juste les envelopper
dans `payload` au lieu de les mettre à plat :
```ts
// Avant
const item: SyncQueueItem = {
  client_uuid: meta.client_uuid,
  module: 'vente',
  id_collaborateur: validLines[0].id_collaborateur,
  id_pdv: Number(meta.id_pdv),
  date_vente: meta.date,
  ...
}
// Après
const item: SyncQueueItem = {
  client_uuid: meta.client_uuid,
  module: 'vente',
  payload: {
    client_uuid: meta.client_uuid,
    header: { id_point_vente: Number(meta.id_pdv), id_client: resolvedClientId, date_vente: meta.date },
    lines: validLines.map(l => ({ ... })),
  },
  enqueuedAt: Date.now(),
}
```

---

## Étape 2 — Ajouter les nouveaux modules

Pour chacun de Collaborateur / Produit Catalogue / Unité de mesure :

1. **Backend** : vérifier ou ajouter le check d'idempotence `client_uuid` dans le service de création
   correspondant, sur le modèle de `createVenteDirecte` déjà fait. **Ne pas ajouter le module à
   `SYNC_ENDPOINTS` avant que ce check existe côté serveur** — sinon risque de doublons en cas de
   retry après coupure.
2. **Champ `client_uuid`** : vérifier que le modèle Prisma correspondant a bien une colonne pour le
   stocker (comme `vente.client_uuid` déjà existant) — sinon l'ajouter en migration.
3. **Frontend** : créer un petit hook dédié (`useCollaborateurSync`, etc.) ou étendre les formulaires
   existants (`AddCollaborateurDrawer` une fois créé/retrouvé, `AddCatalogueDrawer`) pour construire
   le `payload` et appeler `enqueue()` + `processQueue()` au lieu d'un `api.post` direct — c'est le
   seul changement d'usage pour bénéficier de la résilience offline.
4. **Formulaire d'unité de mesure** : dépend du Batch 7 (table `unite_mesure`) déjà spécifié —
   à faire une fois cette table en place.

---

## Étape 3 — Ce qui reste hors de ce mécanisme (rappel de frontière)

- **Lecture de Ventes/Stock/mouvements de stock** : passe par le cache de requêtes (React Query),
  pas par cette queue. Le volume "massif" de mouvements de stock est justement un argument pour du
  cache + pagination serveur efficace, pas pour du offline-write — on ne "crée" pas des mouvements de
  stock manuellement depuis le poste client la plupart du temps, ils sont générés par les
  ventes/livraisons/annulations déjà couvertes par la queue existante.
- **Annulation de vente (Batch 5)** : à évaluer séparément si tu veux qu'elle soit offline-résiliente
  aussi — actuellement `cancelVente` fait un appel direct, pas via la queue. Vu que Batch 6 va ajouter
  une vérification de stock en transaction, une annulation en attente hors-ligne pourrait se heurter à
  un état de stock qui a changé entre-temps — à réfléchir avant d'y toucher, pas urgent maintenant.

---

## Test de validation

1. Couper le réseau (mode avion / DevTools offline), créer un collaborateur → doit apparaître en
   file d'attente (`SyncStatusIndicator` sur "pending"/"offline").
2. Reconnecter → le collaborateur doit se synchroniser automatiquement, sans action utilisateur.
3. Couper le réseau, créer deux collaborateurs avec le même email (le deuxième doit échouer côté
   validation) → reconnecter → vérifier que le premier collaborateur SE synchronise correctement et
   que le second apparaît dans la liste des échecs, **sans bloquer le premier**.
4. Créer une vente hors-ligne, couper avant la fin de la requête si possible (simulateur réseau
   lent + coupure), reconnecter → vérifier qu'aucun doublon de vente n'apparaît (test de l'idempotence
   `client_uuid`).
