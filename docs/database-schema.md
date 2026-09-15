# Schéma de Base de Données — PEJAA Next.js

> Document auto-généré à partir de `prisma/schema.prisma`. Dernière mise à jour: 2025-07.

## AUTH / RBAC

### utilisateur
Utilisateurs applicatifs (admins, employés, clients, collaborateurs).

| Colonne | Type | Null | Description | FK |
|---------|------|------|-------------|-----|
| id_utilisateur | Int | PK | Auto-increment | |
| tenant_id | Int | NO | Identifiant tenant | |
| nom | String | NO | Nom | |
| prenom | String | NO | Prénom | |
| email | String | NO | Email unique | |
| password_hash | String | NO | Hash bcrypt | |
| role | String | NO | Code rôle (super_admin, admin, employe, client, collaborateur) | |
| actif | Boolean | NO | true par défaut | |

> `created_by` dans les autres tables est peuplé depuis `id_utilisateur` du JWT au niveau API.

### access_domain, role, role_access_matrix, user_access_override
RBAC matriciel. 12 domaines fonctionnels, 5 rôles, matrice de droits (read/write/delete/manage).

## STOCK

### stock_actuel (photo — source de vérité)
Quantité courante par lot+PDV. **UNIQUE** sur `(tenant_id, id_lot, id_pdv)`.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id | Int | PK | Auto-increment |
| tenant_id | Int | NO | |
| id_lot | Int | NO | FK → livraison_item |
| id_pdv | Int | NO | FK → point_de_vente |
| quantite | Decimal(12,3) | NO | Quantité disponible |
| quantite_reservee | Decimal(12,3) | NO | Réservée pour commandes |
| created_by | Int? | YES | FK → utilisateur |

### stock_mouvement (film — journal append-only)
Historique complet de chaque changement de stock.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_stock_mouvement | Int | PK | Auto-increment |
| tenant_id | Int | NO | |
| id_lot | Int | NO | FK → livraison_item |
| type | String | NO | entree, sortie, reservation, annulation_reservation, ajustement, transfert, annulation_vente |
| quantite | Decimal(12,3) | NO | Quantité mouvementée |
| before_qty | Decimal? | YES | Quantité avant le mouvement |
| after_qty | Decimal? | YES | Quantité après le mouvement |
| source_type | String | NO | VENTE, LIVRAISON, AJUSTEMENT, TRANSFERT, RETOUR |
| source_id | Int? | YES | ID de l'événement source |

### stock_transfert
Transferts de stock entre points de vente.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_stock_transfert | Int | PK | |
| id_point_vente_source | Int | NO | |
| id_point_vente_destination | Int | NO | |
| id_utilisateur | Int | NO | Initiateur |
| commentaire | String? | YES | |

### stock_snapshot, snapshot_ligne
Snapshots périodiques de stock pour reporting.

## PRODUITS

### produit_catalogue
Catalogue produits par collaborateur.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_produit | Int | PK | |
| tenant_id | Int | NO | |
| id_collaborateur | Int | NO | FK → collaborateur (propriétaire) |
| nom | String | NO | Libellé du produit |
| description | String? | YES | |
| categorie | String? | YES | Catégorie fonctionnelle |
| sku | String? | YES | Code article |
| unite | String? | YES | Unité de mesure |
| seuil_alerte | Int? | YES | Seuil d'alerte stock bas |
| statut | String | NO | actif / archive (défaut: actif) |
| created_by | Int? | YES | FK → utilisateur |
| modified_by | Int? | YES | FK → utilisateur |

## COLLABORATEURS

### collaborateur
Marchands/collaborateurs utilisant PEJAA.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_collaborateur | Int | PK | |
| tenant_id | Int | NO | |
| nom, prenom | String | NO/? | |
| telephone, email | String? | YES | |
| adresse | String? | YES | Ajouté |
| statut | String | NO | actif / archive |
| date_adhesion | DateTime | NO | Date d'adhésion |

## POINTS DE VENTE

### point_de_vente
Points de vente physiques.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_pdv | Int | PK | |
| tenant_id | Int | NO | |
| nom | String | NO | |
| quartier, ville | String? | YES | |
| adresse, telephone, email | String? | YES | |
| responsable_id | Int? | YES | FK → utilisateur |
| statut | String | NO | actif / ferme / archive |
| date_ouverture, date_fermeture | DateTime? | YES | |

## LIVRAISONS (header + lines)

### livraison
Document d'en-tête de livraison.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_livraison | Int | PK | |
| tenant_id | Int | NO | |
| id_collaborateur | Int | NO | FK → collaborateur (expéditeur) |
| id_pdv | Int | NO | FK → point_de_vente (destinataire) |
| date_livraison | DateTime | NO | |
| reference | String? | YES | Référence libre |
| commentaire | String? | YES | |

### livraison_item
Lignes/lots d'une livraison. Chaque ligne = un lot de stock.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_lot | Int | PK | Identifiant du lot |
| tenant_id | Int | NO | |
| id_produit | Int | NO | FK → produit_catalogue |
| id_livraison | Int | NO | FK → livraison |
| id_pdv | Int | NO | FK → point_de_vente |
| prix_initial | Decimal(10,2) | NO | Prix initial (Ar) |
| marge | Decimal(10,2) | NO | Marge PEJAA (Ar) |
| quantite_initiale | Decimal(12,3) | NO | Quantité livrée |
| quantite_remboursee | Decimal(12,3) | NO | 0 par défaut |
| id_lot_parent | Int? | YES | Self-ref (split) |
| statut | String | NO | en_stock / vendu / archive |

> **Note** : `livraison_item` ne contient PAS de `quantite_actuelle`. Le stock courant est dans `stock_actuel`.

## COMMANDES

### commande
Commandes client (réservation de stock avant vente).

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_commande | Int | PK | |
| id_client | Int | NO | FK → client |
| id_pdv | Int | NO | FK → point_de_vente |
| cree_par_id | Int | NO | FK → utilisateur |
| statut | String | NO | reservee / confirmee / annulee |

### commande_ligne
Lignes de commande (réservation par lot).

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id | Int | PK | |
| id_commande | Int | NO | FK → commande |
| id_lot | Int | NO | FK → livraison_item |
| id_collaborateur | Int | NO | FK → collaborateur |
| quantite_reservee | Int | NO | |
| prix_initial, marge | Decimal(10,2) | NO | |

## CLIENTS

### client
Clients finaux (acheteurs).

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_client | Int | PK | |
| tenant_id | Int | NO | |
| nom | String | NO | |
| prenom | String? | YES | |
| telephone, email | String? | YES | |
| adresse | String? | YES | |
| date_inscription | DateTime | NO | |

## VENTES

### vente
Ventes confirmées (avec soft-delete).

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_vente | Int | PK | |
| tenant_id | Int | NO | |
| id_commande | Int? | YES | FK → commande (optionnel) |
| id_client | Int | NO | FK → client |
| id_point_vente | Int | NO | FK → point_de_vente |
| date_vente | DateTime | NO | Date de la vente |
| enregistre_par_admin_id | Int | NO | Utilisateur validateur |
| id_utilisateur | Int? | YES | Utilisateur vendeur |
| statut | String | NO | en_attente_paiement / payee / annulee / retournee |
| montant_ht | Decimal? | YES | |
| montant_tva | Decimal? | YES | 0 par défaut |
| montant_marge | Decimal? | YES | |
| montant_total | Decimal? | YES | |
| deleted | Boolean | NO | false par défaut |
| deleted_at | DateTime? | YES | |
| raison_suppression | String? | YES | |

### vente_article
Articles vendus dans une vente.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_ligne | Int | PK | |
| tenant_id | Int | NO | |
| id_vente | Int | NO | FK → vente |
| id_lot | Int | NO | FK → livraison_item |
| id_collaborateur | Int | NO | FK → collaborateur |
| quantite_vendue | Int | NO | |
| prix_initial | Decimal(10,2) | NO | |
| marge | Decimal(10,2) | NO | Marge unitaire |
| montant_ht, montant_tva, montant_marge | Decimal? | YES | Totaux ligne |
| deleted | Boolean | NO | false par défaut |

| quantite_retournee | Decimal(12,3) | NO | 0 par défaut — mis à jour uniquement lors d'une annulation de vente (stock_mouvement type='annulation_vente') |
## ENCAISSEMENTS

### encaissement
Paiements liés aux ventes.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_encaissement | Int | PK | |
| tenant_id | Int | NO | |
| id_vente | Int | NO | FK → vente |
| montant | Decimal(15,2) | NO | |
| mode | String | NO | cash / mobile_money / carte / virement / autre |
| reference | String? | YES | |
| cree_par_id | Int | NO | FK → utilisateur |

## FINANCE

### transaction_financiere
Journal des flux d'argent (append-only).

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_transaction_financiere | Int | PK | |
| tenant_id | Int | NO | |
| type | String | NO | IN / OUT |
| montant | Decimal(15,2) | NO | |
| id_categorie_financiere | Int | NO | FK → financial_category |
| source_module | String | NO | VENTE, MANUEL, etc. |
| source_id | Int? | YES | ID source |
| created_by | Int | NO | FK → utilisateur |

### financial_category
Catégories de flux financiers.

## ABONNEMENTS

Architecture en 5 couches :

```
Abonnement                → offre commerciale / catalogue
    └── SouscriptionAbonnement  → relation Collaborateur ↔ Offre (active, suspendue, terminée ou annulée)
            └── EcheanceAbonnement     → obligation financière d'une période
                    └── PaiementAbonnement    → encaissement réel
                            └── TransactionFinanciere → journal financier (IN, source_module='ABONNEMENT')
```

**Règle absolue** : le passé financier ne doit jamais être modifié par une modification du catalogue ou d'un tarif actuel. Chaque couche porte son propre montant figé au moment de sa création.

### abonnement

Offre commerciale proposée par PEJAA. `montant` = prix catalogue **actuel**, évolutif.
Sa modification ne rétroagit JAMAIS sur les souscriptions, échéances ou paiements existants.

Contrainte de suppression physique : interdite si au moins une `souscription_abonnement` existe (même annulée).

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_abonnement | Int | PK | |
| tenant_id | Int | NO | |
| nom | String | NO | Libellé de l'offre |
| description | String? | YES | Description optionnelle |
| montant | Decimal(10,2) | NO | Prix catalogue actuel (évolutif) |
| periodicite | String | NO | mensuel / trimestriel / annuel / ponctuel |
| statut | String | NO | ACTIVE / INACTIVE / ARCHIVED (défaut: ACTIVE) |
| created_by | Int? | YES | |
| modified_by | Int? | YES | |
| modified_at | DateTime? | YES | |

### souscription_abonnement

Relation commerciale entre un collaborateur et une offre. Peut représenter une souscription **actuellement active, suspendue, terminée ou annulée** — le nom ne présuppose pas l'état.

`montant` = tarif **actuellement applicable** à ce collaborateur — peut différer du catalogue.
C'est ce montant qui sert de base lors de la prochaine génération d'échéance.
Les montants historiques sont portés par `echeance_abonnement.montant`.

Une migration commerciale (changement d'offre ou de tarif structurant) se représente comme :
ancienne souscription `date_fin` → nouvelle souscription. Ne jamais réécrire `id_abonnement` ou `montant` sur une souscription existante.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_souscription_abonnement | Int | PK | |
| tenant_id | Int | NO | |
| id_abonnement | Int | NO | FK → abonnement |
| id_collaborateur | Int | NO | FK → collaborateur |
| montant | Decimal(10,2) | NO | Tarif actuellement applicable (peut différer du catalogue) |
| renouvellement_auto | Boolean | NO | true par défaut |
| date_debut | DateTime | NO | |
| date_fin | DateTime? | YES | NULL = pas de date limite |
| statut | String | NO | ACTIVE / SUSPENDUE / TERMINEE / ANNULEE (défaut: ACTIVE) |
| canceled_at | DateTime? | YES | Renseigner pour annuler (pas de suppression physique) |
| canceled_by | Int? | YES | |
| created_by | Int? | YES | |
| modified_by | Int? | YES | |
| modified_at | DateTime? | YES | |

### echeance_abonnement

Obligation financière concrète pour une période donnée.
`montant` = **snapshot figé** du montant dû à la génération.
Une modification ultérieure de `souscription_abonnement.montant` ou `abonnement.montant`
ne modifie **JAMAIS** une échéance déjà créée.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_echeance_abonnement | Int | PK | |
| tenant_id | Int | NO | |
| id_souscription_abonnement | Int | NO | FK → souscription_abonnement |
| montant | Decimal(10,2) | NO | Snapshot figé du montant dû — jamais recalculé |
| periode_debut | DateTime | NO | Début de la période couverte |
| periode_fin | DateTime | NO | Fin de la période couverte |
| statut | String | NO | en_attente / partiellement_payee / payee / annulee |
| canceled_at | DateTime? | YES | Renseigner pour annuler (pas de suppression physique) |
| canceled_by | Int? | YES | |
| created_by | Int? | YES | |
| modified_by | Int? | YES | |
| modified_at | DateTime? | YES | |

### paiement_abonnement

Encaissement réel pour une échéance.
`montant` est **indépendant** de `echeance_abonnement.montant` : partiel, multiple, supérieur ou en régularisation sont tous valides.
Un paiement ne peut jamais être rattaché directement à `abonnement` ou `souscription_abonnement` — il appartient obligatoirement à une `echeance_abonnement`.

Création atomique d'une `TransactionFinanciere(IN, source_module='ABONNEMENT', source_id=id_paiement_abonnement)` à chaque enregistrement confirmé.

| Colonne | Type | Null | Description |
|---------|------|------|-------------|
| id_paiement_abonnement | Int | PK | |
| tenant_id | Int | NO | |
| id_echeance_abonnement | Int | NO | FK → echeance_abonnement |
| montant | Decimal(10,2) | NO | Montant réellement encaissé (indépendant de l'échéance) |
| date_paiement | DateTime | NO | |
| canceled_at | DateTime? | YES | Renseigner pour annuler (pas de suppression physique) |
| canceled_by | Int? | YES | |
| created_by | Int? | YES | |
| modified_by | Int? | YES | |
| modified_at | DateTime? | YES | |

> `abonnement.montant` → prix catalogue (évolutif). `souscription_abonnement.montant` → tarif applicable actuel. `echeance_abonnement.montant` → dû figé à la période. `paiement_abonnement.montant` → encaissé réel. Ces quatre valeurs sont strictement indépendantes.


## LEGACY (utiliser stock_mouvement à la place)

### stock_ajustement
Ajustements (perte, casse, inventaire, correction). Préférer `stock_mouvement` directement.

### retour_collaborateur
Retours vers collaborateur. Préférer `stock_mouvement(type='sortie', source_type='RETOUR')`.

---

## Résumé Seed

| Entité | Quantité | Notes |
|--------|----------|-------|
| Rôles | 5 | super_admin, admin, employe, client, collaborateur |
| Domaines RBAC | 12 | |
| Utilisateurs | 5 | |
| Point de vente | 1 | Boutique principale |
| Collaborateurs | 5 | Rakoto, Miora, Andry, Fara, Hery |
| Produits catalogue | 25 | 5 par collaborateur |
| Livraisons | 4 | 5+2+3+3 items |
| LivraisonItems | 13 | Avec stock_actuel + stock_mouvement(entree) |
| Clients | 4 | Divers + 3 nommés |
| Catégories financières | 7 | |
| Ventes | 10 | 2 articles chacune, full ledger |
