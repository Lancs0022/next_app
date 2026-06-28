# Architecture Ledgers — PEJAA

## Principe des 3 journaux

PEJAA repose sur trois journaux append-only. Chaque événement métier se décompose en écritures dans ces journaux :

```
Événement métier (ex: Vente)
        |
   +----+----+
   |         |
   v         v
stock_mouvement   transaction_financiere
  (journal)          (journal)
```

| Journal | Rôle | Analogie |
|---------|------|----------|
| **stock_actuel** | Snapshot courant des quantités | Photo (source de vérité) |
| **stock_mouvement** | Historique complet des changements | Film (append-only) |
| **transaction_financiere** | Flux de trésorerie observés | Journal d'argent |

## Ce qui génère quoi

| Événement | stock_mouvement | transaction_financiere |
|-----------|:---:|:---:|
| Livraison | YES (entree) | NO |
| Vente | YES (sortie) | YES (IN) |
| Ajustement | YES (ajustement) | NO |
| Transfert | YES (sortie + entree) | NO |
| Retour collaborateur | YES (sortie) | NO |
| Encaissement | NO | YES (IN) |
| Abonnement paiement | NO | YES (IN) |

## Flux Vente

```
POST /api/ventes/directe
  → Vente + VenteArticle (données métier)
  → StockMouvement(sortie) pour chaque article
    - before_qty = stock actuel
    - after_qty = stock actuel - quantite_vendue
  → Mise à jour stock_actuel (décrément)
  → TransactionFinanciere(IN) pour le montant total
```

## Flux Livraison

```
POST /api/livraisons
  → Livraison (header) + LivraisonItem[] (lignes/lots)
  → StockActuel (création, quantite = quantite_initiale)
  → StockMouvement(entree) pour chaque ligne
    - before_qty = 0
    - after_qty = quantite_initiale
  → PAS de TransactionFinanciere
```

## Invariants

- **Stock jamais négatif** : vérifier `stock_actuel.quantite >= quantite_vendue` avant chaque sortie
- **Journaux append-only** : pas de modification/suppression. Corrections via nouveaux événements (ex: annulation)
- **Soft-delete** : les ventes et articles utilisent `deleted` / `deleted_at` (pas de DELETE physique)
- **stock_actuel = photo, stock_mouvement = film** : la somme des mouvements doit égaler le stock actuel

## Module comptable (optionnel)

Le module comptable est contrôlé par un killswitch. PEJAA ne produit que des `transaction_financiere`. Un module externe optionnel peut les transformer en `ecriture_comptable` (comptabilité en partie double).

Si désactivé : les endpoints comptabilité retournent 404, l'UI masque les menus, aucun traitement automatique.
