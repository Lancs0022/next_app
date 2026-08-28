# Stratégie offline-first — next_app (Pejaa)

## Contexte de déploiement

L'application sera hébergée sur Vercel (free tier) avec Supabase (free tier).
Ces deux plateformes ont des plafonds stricts sur le nombre de requêtes et de connexions.
**Toute décision d'architecture doit minimiser les appels réseau vers le serveur Next et la base de données.**

## Principes directeurs

### 1. Local d'abord, serveur en secours
- Lire depuis le cache local en priorité ; appeler le serveur uniquement si le cache est absent, expiré, ou si une opération d'écriture vient de modifier les données.
- Ne jamais déclencher un appel réseau depuis un `useEffect` dont les dépendances changent à chaque render (risque de boucle infinie + gaspillage de quota).

### 2. Écriture résiliente via sync queue
- Toutes les opérations d'écriture (ventes, livraisons, collaborateurs, etc.) passent par `useOfflineSyncQueue`.
- L'écriture est d'abord enregistrée localement (localStorage), puis envoyée au serveur dès que la connexion est disponible.
- Ne jamais faire de `api.post` direct pour une entité qui a un endpoint enregistré dans `lib/dynamicEntry/syncEndpoints.ts`.

### 3. Idempotence obligatoire
- Chaque item de la sync queue porte un `client_uuid`. Le serveur doit rejeter les doublons silencieusement (upsert ou check d'unicité sur `client_uuid`).
- Toujours vérifier que l'endpoint cible gère ce check avant d'enregistrer un nouveau module dans `SYNC_ENDPOINTS`.

### 4. Progressive Web App
- L'objectif final est une PWA partiellement indépendante du serveur.
- Les données de référence (collaborateurs, points de vente, catalogue produits) doivent être mises en cache localement et rechargées au maximum une fois par session, pas à chaque montage de composant.
- À terme : service worker + cache statique pour les assets, cache dynamique pour les listes de référence.

## Règles concrètes pour l'implémentation

| Situation | Approche correcte | Approche à éviter |
|---|---|---|
| Charger une liste de référence (PdV, collabs) | Une seule fois au montage, stocker dans un state ou cache | `useEffect` qui recharge à chaque changement d'état |
| Callback passé comme prop à un hook | Utiliser un `ref` pour éviter les re-créations | Passer directement une arrow function inline comme dépendance d'`useCallback`/`useEffect` |
| Créer une entité (vente, livraison) | `enqueue()` + `processQueue()` via `useOfflineSyncQueue` | `api.post()` direct sans queue |
| Lire les ventes / stock pour affichage | Cache local + revalidation en arrière-plan | Fetch systématique à chaque navigation |
| Données de saisie en cours (panier vente, formulaire livraison) | Persister dans `localStorage` via `storage.ts` | State React pur sans sauvegarde locale |

## Modules couverts par la sync queue (état actuel)

- `vente` → `/ventes/directe`
- `livraison` → `/livraisons`

## Modules à couvrir prochainement (batch 16)

- `collaborateur` → `/collaborateurs`
- `produit_catalogue` → `/produits-catalogue`
- `unite_mesure` → `/unites-mesure`

## Rappel de frontière

La sync queue gère les **écritures** hors-ligne.
Le cache de requêtes (à implémenter avec React Query ou équivalent) gère la **lecture** résiliente.
Ne pas mélanger les deux mécanismes.
