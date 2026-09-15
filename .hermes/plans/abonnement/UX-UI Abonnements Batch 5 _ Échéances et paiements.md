Construis l'UX/UI permettant de consulter et gérer les échéances et paiements d'abonnement.

## ECHEANCE

Une échéance représente :

"Combien le collaborateur devait pour cette période."

Afficher :

- période
- date d'échéance
- montant dû
- montant payé
- reste à payer
- statut

Statuts possibles selon le backend :
- à venir
- impayée
- partiellement payée
- payée
- annulée

Ne pas inventer de statuts backend sans vérifier le modèle existant.

## PAIEMENT

Une opération de paiement signifie :

"Nous avons enregistré qu'une somme a réellement été reçue."

Le formulaire doit afficher :
- collaborateur
- offre
- échéance
- montant dû
- déjà payé
- reste
- montant du paiement
- date
- mode de paiement si prévu par le modèle
- référence éventuelle

Le montant payé ne doit PAS être automatiquement forcé au montant dû.

## CONFIRMATION

Avant confirmation, afficher un récapitulatif clair :

Echéance
Montant dû
Déjà payé
Nouveau paiement
Reste après paiement

## APRES PAIEMENT

Le frontend doit refléter :

PaiementAbonnement créé
+
TransactionFinanciere IN créée

Ces opérations doivent être atomiques côté backend.

Ne pas implémenter de logique financière uniquement côté frontend.

## ANNULATION D'UN PAIEMENT

L'annulation doit être une opération métier explicite.

Ne pas supprimer physiquement le paiement.

Afficher :
- paiement concerné
- montant
- date
- raison
- conséquences financières

Le backend doit gérer la cohérence avec TransactionFinanciere.

Le frontend ne doit pas supposer qu'un simple DELETE suffit.

## HISTORIQUE

Depuis un collaborateur, une souscription ou une échéance, permettre de remonter vers le paiement correspondant.

L'utilisateur doit pouvoir faire :

Collaborateur
→ Souscription
→ Échéance
→ Paiement
→ Transaction financière

sans perdre le contexte.

## UX

Ne pas transformer l'écran en logiciel comptable complet.

La gestion générale des transactions financières appartient à un futur module.

Ici, on reste centré sur le cycle de vie des abonnements.