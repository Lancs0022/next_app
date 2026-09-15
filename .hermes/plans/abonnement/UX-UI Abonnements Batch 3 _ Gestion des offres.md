Construis l'UX/UI de la gestion des offres dans la page Abonnements.

Ne traite que le côté Offre.

## LISTE DES OFFRES

Chaque ligne doit permettre de comprendre immédiatement :

- Nom
- Prix catalogue actuel
- Périodicité
- Statut
- Nombre de souscriptions
- éventuellement nombre de souscriptions actives

Actions :

- Voir le détail
- Créer une souscription
- Modifier les informations autorisées
- Modifier le prix catalogue
- Désactiver / Réactiver
- Archiver
- Supprimer définitivement si autorisé

## DETAIL D'UNE OFFRE

Créer une vue détaillée permettant de voir :

### Informations générales
- nom
- description
- prix catalogue
- périodicité
- statut
- dates importantes

### Collaborateurs souscrits

Afficher la liste des collaborateurs liés à cette offre.

Pour chaque collaborateur :
- nom
- tarif applicable
- statut de souscription
- date de début
- prochaine échéance
- situation de paiement

Prévoir une action "Voir la souscription".

## SOUSCRIRE UN COLLABORATEUR

Depuis une offre, prévoir l'action :

"Souscrire un collaborateur"

Le parcours doit permettre :
1. sélectionner le collaborateur
2. afficher l'offre choisie
3. afficher le prix catalogue
4. permettre de définir le tarif applicable si la règle métier le permet
5. définir la date de début
6. choisir le renouvellement automatique
7. afficher un récapitulatif
8. confirmer

Ne jamais masquer la différence entre :
Prix catalogue
et
Tarif applicable.

## MODIFICATION DU PRIX CATALOGUE

Ce n'est PAS un simple champ PATCH.

Lorsqu'on change le prix catalogue, afficher un avertissement clair :

"Certains collaborateurs ont actuellement un tarif différent ou utilisent l'ancien tarif."

Afficher les collaborateurs concernés.

Permettre de sélectionner ceux dont le tarif applicable doit évoluer.

Ne jamais modifier automatiquement tous les collaborateurs sans confirmation explicite.

Les échéances déjà générées ne doivent jamais être modifiées.

## DESACTIVATION

Lorsqu'une offre est désactivée :

Afficher clairement :

"Les nouvelles souscriptions seront bloquées. Les souscriptions existantes continueront normalement."

Ne surtout pas afficher une UX laissant penser que les collaborateurs existants seront résiliés.

## ARCHIVAGE

Si des souscriptions actives existent :
- bloquer l'archivage
- expliquer pourquoi
- afficher le nombre de souscriptions actives
- orienter vers leur migration ou terminaison

Si aucune souscription active n'existe :
- permettre l'archivage selon les règles métier.

## SUPPRESSION DEFINITIVE

Si l'offre n'a jamais eu de souscription :
→ suppression définitive possible.

Si elle a déjà eu au moins une souscription :
→ suppression définitive impossible.

Présenter une confirmation explicite pour toute suppression définitive.

Ne pas utiliser le terme "Supprimer" pour une opération qui correspond en réalité à un archivage.