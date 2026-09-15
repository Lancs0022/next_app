Implémente uniquement la structure UX/UI du nouveau module Abonnements de PEJAA.

IMPORTANT :
- Inspecte d'abord les composants UI existants.
- Réutilise les composants existants plutôt que d'en créer de nouveaux inutilement.
- Ne réécris pas le design system.
- Ne touche pas aux autres pages sans nécessité.
- Ne fabrique aucune donnée métier fictive persistante.
- Si une API n'existe pas encore, ne l'invente pas silencieusement. Prépare uniquement la structure UI ou indique clairement le blocage.
- Ne traite pas encore toutes les opérations métier complexes.

## OBJECTIF

Ajouter une entrée "Abonnements" dans la navigation/sidebar.

La page Abonnements doit être une page dédiée.

Elle doit contenir deux grands espaces :

1. Offres
2. Souscriptions

La page ne doit PAS utiliser "Abonnements actifs" comme titre pour désigner toutes les souscriptions historiques.

Utiliser :
- "Offres"
- "Souscriptions"

## ONGLET OFFRES

Afficher une vue de gestion des offres commerciales.

Prévoir :
- liste des offres
- nom
- prix catalogue
- périodicité
- statut
- éventuellement nombre de souscriptions
- actions

Actions principales :
- Voir le détail
- Créer une offre
- Modifier les informations autorisées
- Modifier le prix selon la règle métier
- Désactiver
- Réactiver
- Archiver
- Supprimer définitivement uniquement si autorisé

IMPORTANT :
Le bouton "Supprimer" ne doit pas apparaître comme une action normale si l'offre a déjà eu des souscriptions.

## ONGLET SOUSCRIPTIONS

Afficher toutes les relations Collaborateur ↔ Offre.

Colonnes minimales :
- Collaborateur
- Offre
- Tarif applicable
- Date de début
- Date de fin
- Renouvellement automatique
- Statut
- Prochaine échéance
- Actions

Filtres :
- Toutes
- Actives
- Impayées
- Terminées
- Annulées

Ne pas confondre :
- statut de l'offre
- statut de la souscription
- statut de l'échéance

## STYLE

Respecter le style existant de PEJAA.

Le projet utilise déjà notamment :
- Box
- ResponsiveDataTable
- TabBox
- Modal
- Toast

Réutiliser ces composants lorsqu'ils correspondent au besoin.

La page doit être responsive et fonctionner correctement en desktop et mobile.

Ne pas créer un écran surchargé.

## IMPORTANT

Ce batch est uniquement consacré à :
- navigation
- structure
- onglets
- table principale
- filtres
- actions visibles

Ne pas implémenter ici toute la logique de paiement, migration, annulation ou modification tarifaire complexe.