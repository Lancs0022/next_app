Construis l'UX/UI de l'onglet "Souscriptions".

RAPPEL DU MODÈLE :

Abonnement
→ offre commerciale

SouscriptionAbonnement
→ relation Collaborateur ↔ Offre + conditions commerciales

EcheanceAbonnement
→ obligation financière pour une période

PaiementAbonnement
→ paiement réellement enregistré

## TABLE SOUSCRIPTIONS

Colonnes :

- Collaborateur
- Offre
- Tarif applicable
- Début
- Fin
- Renouvellement auto
- Statut
- Prochaine échéance
- Situation paiement
- Actions

Filtres :

Toutes
Actives
Impayées
Terminées
Annulées

## DETAIL D'UNE SOUSCRIPTION

Afficher clairement :

### Conditions commerciales
- collaborateur
- offre
- tarif applicable
- périodicité héritée de l'offre
- renouvellement automatique

### Validité
- date début
- date fin
- statut

### Échéances
Liste chronologique :
- période
- montant dû
- date d'échéance
- montant payé
- reste
- statut

### Paiements
Liste :
- date
- montant
- référence
- échéance
- utilisateur

## ACTIONS

Ne pas proposer un bouton générique "Modifier la souscription" qui permettrait de modifier arbitrairement tout.

Utiliser des opérations métier explicites :

- Changer le tarif applicable
- Modifier le renouvellement automatique
- Résilier
- Annuler selon les règles métier
- Migrer vers une autre offre
- Enregistrer un paiement
- Voir l'historique

## CHANGEMENT DE TARIF

Lorsqu'un tarif change :

Afficher :
Ancien tarif
Nouveau tarif
Date d'effet

Expliquer que :
- les échéances déjà générées ne changent pas
- les paiements historiques ne changent pas
- le nouveau tarif s'applique aux futures échéances concernées

Si le changement nécessite une nouvelle période de souscription selon le modèle backend, utiliser la mécanique prévue par celui-ci plutôt que de modifier l'historique.

## MIGRATION

Une migration d'offre doit être présentée comme une vraie opération métier.

Exemple :

Premium ancien
5 000 Ar
→ Premium nouveau
7 000 Ar

Afficher :
- ancienne souscription
- nouvelle offre
- nouveau tarif
- date de transition
- conséquences sur les futures échéances

Ne jamais donner l'impression que l'ancienne souscription est réécrite.

## RESILIATION

Afficher une confirmation indiquant clairement :
- date de fin
- conséquences sur le renouvellement
- conservation de l'historique

Une résiliation ne supprime jamais la souscription de la base.

## IMPORTANT

L'utilisateur doit toujours pouvoir comprendre :

"Quelles étaient les conditions ?"
"Quelles sont les conditions actuelles ?"
"Qu'est-ce qui a déjà été facturé ?"
"Qu'est-ce qui reste dû ?"
"Qu'est-ce qui a été payé ?"

Ne jamais sacrifier l'historique pour simplifier l'interface.