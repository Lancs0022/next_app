# Flux d'annulation de vente — Spécification finale

## Portée

Annulation partielle, ligne par ligne, via **un seul endpoint** `POST /api/ventes/{id}/annuler`,
accessible depuis 4 points d'entrée UI différents.

---

## Changement de schéma requis

**`vente_article`** — ajouter :
```prisma
raison_suppression String?
```
**Pourquoi** : `vente.raison_suppression` (champ unique sur la vente) s'écrase à chaque nouvelle
annulation partielle — on perd la trace du motif précédent si plusieurs annulations successives
touchent la même vente à des moments différents. En stockant le motif **par ligne touchée**, chaque
`vente_article` garde le motif de sa dernière annulation, ce qui est plus fin sans nécessiter une
table de log séparée.

**Comportement d'écriture** : dans la transaction, pour chaque ligne du payload `lignes[]`, écrire
le `raison` de la requête dans `vente_article.raison_suppression` de cette ligne (écrase l'ancien
motif de cette ligne précise si elle avait déjà été partiellement annulée avant — acceptable, c'est
mieux qu'un seul champ global sur toute la vente). Garder aussi la mise à jour de
`vente.raison_suppression` avec le motif le plus récent, comme résumé rapide non-faisant-foi (pratique
pour un affichage synthétique, mais la source de vérité par ligne reste `vente_article.raison_suppression`).

---

## Endpoint unique

```
POST /api/ventes/{id}/annuler
{
  "raison": "...",
  "lignes": [
    { "id_ligne": 42, "quantite": 1.5 },
    { "id_ligne": 43, "quantite": 2 }
  ]
}
```

Une annulation totale (vente agrégée) n'est qu'un cas particulier : toutes les lignes de la vente
listées, chacune avec sa quantité restante maximale. Pas de branche de code séparée, pas de
deuxième endpoint.

---

## Logique métier serveur (transaction Prisma)

Par ligne reçue :
1. Valider `0 < quantite <= quantite_vendue - quantite_retournee` (recalculé serveur)
2. Valider le respect de l'unité (`produit_catalogue.id_unite → unite_mesure.decimal` — rejeter les
   décimales si l'unité de la ligne est entière)
3. `vente_article.quantite_retournee` += quantité saisie
4. `vente_article.raison_suppression` = raison de la requête (voir section schéma ci-dessus)
5. `stock_mouvement` : nouvelle ligne, `type='annulation_vente'`, `quantite`=quantité saisie,
   `source_type='VENTE'`, `source_id=id_vente`
6. `stock_actuel.quantite` += quantité saisie

Une seule fois, à la fin :
7. `transaction_financiere` : nouvelle ligne, `type='OUT'`, `montant` = somme proratisée
   (`quantite_saisie × prix_initial` par ligne, sommé sur les lignes de cette action),
   `id_categorie_financiere` résolu par lookup direct dans `financial_category`
8. `vente.statut` recalculé par dérivation : `'annulee'` si `SUM(quantite_retournee) ==
   SUM(quantite_vendue)` sur toutes les lignes, `'retournee'` si partiel
9. `vente.raison_suppression` = raison de la requête (résumé, non-faisant-foi — voir ci-dessus)

**Rejet total de la requête si une seule ligne est invalide** — pas de traitement partiel des lignes
valides d'une même requête.

**Ce qui ne change jamais** : `vente.montant_ht/montant_tva/montant_marge/montant_total` et
`vente_article.prix_initial/marge/montant_ht/montant_marge/quantite_vendue` — la vente reste un
constat historique figé. Tout l'effet financier/stock passe par de nouvelles écritures
(`stock_mouvement`, `transaction_financiere`), jamais par modification des montants d'origine.

**Pour les rapports futurs** : le "montant net perçu" sur une vente partiellement annulée n'est pas
un champ direct — c'est `vente.montant_total - SUM(transaction_financiere WHERE source_id=id_vente
AND type='OUT')`. Pas à implémenter maintenant, juste à garder en tête pour ne pas chercher un champ
qui n'existe pas plus tard.

---

## Lecture préalable (laissée à l'agent, hors détail ici)

Un endpoint de lecture est nécessaire pour retrouver les ventes associées à un lot (point d'entrée
"clic droit sur un lot"). Non spécifié en détail ici — l'agent sait quoi faire.

---

## Les 4 points d'entrée UI et leur comportement de sélection

### 1. Clic droit sur un lot (Lots disponibles / Lot Explorer / Lot Detail Modal)

- Affiche **toutes les lignes de vente** (`vente_article`) associées à ce lot, potentiellement issues
  de plusieurs ventes différentes.
- Si aucune vente n'existe pour ce lot → toast d'info ("Aucune vente enregistrée pour ce lot"), pas
  de modale.
- Sinon → modale avec cases à cocher, **éditables**, pour choisir quelles lignes annuler et avec
  quelle quantité chacune.
- **Défaut des cases à cocher** : aucune supposition de ma part — à confirmer, mais je pars sur
  "aucune ligne pré-cochée par défaut" (l'utilisateur choisit activement quoi annuler, pas de
  sélection de masse accidentelle). Corrige si tu veux un autre défaut.

### 2. Menu flottant sur une ligne, vue Ventes **atomique**

- Une vue atomique = une ligne = un `vente_article` précis.
- La modale n'affiche **que cette ligne unique**, case cochée, **impossible à décocher**.
- Quantité pré-remplie au restant annulable maximum, éditable (partiel possible même en atomique).

### 3. Menu flottant sur une ligne, vue Ventes **agrégée**

- Affiche **toutes les lignes `vente_article`** de cette vente.
- **Toutes cochées par défaut** — l'utilisateur **décoche** les lignes qu'il veut garder (logique
  inverse du point d'entrée Lot).

### 4. Paramètres de Lot Explorer / Lot Detail Modal

- Même comportement que le point 1 (recherche des ventes du lot, cases décochées par défaut,
  sélection manuelle).

---

## Résumé du comportement de cases à cocher (pour éviter toute confusion à l'implémentation)

| Point d'entrée | Lignes affichées | Défaut des cases | Décochable ? |
|---|---|---|---|
| Lot (clic droit / Explorer / Detail Modal) | Toutes les ventes du lot | Aucune pré-cochée | Oui |
| Vente — vue atomique | 1 seule ligne | Cochée | **Non** |
| Vente — vue agrégée | Toutes les lignes de la vente | Toutes cochées | Oui |

---

## Confirmation avant soumission

Quel que soit le point d'entrée, avant l'envoi de la requête : afficher un résumé de ce que
l'annulation va concrètement produire — quantités qui vont changer (par ligne) et montant du flux
financier compensatoire — avant que l'utilisateur confirme. Pas de soumission silencieuse.
