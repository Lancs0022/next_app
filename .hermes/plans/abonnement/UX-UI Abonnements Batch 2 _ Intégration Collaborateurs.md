Améliore la page Collaborateurs existante pour intégrer le contexte des abonnements sans transformer cette page en deuxième module Abonnements.

Inspecte d'abord la page actuelle et ses composants existants.

La page actuelle possède déjà :
- statistiques
- liste des collaborateurs
- ResponsiveDataTable
- TabBox
- création d'un collaborateur

Conserver cette structure générale.

## 1. TABLE DES COLLABORATEURS

Ajouter une colonne "Abonnement".

Cette colonne doit donner une synthèse rapide de la situation actuelle du collaborateur.

Exemples :

Aucun abonnement
→ neutre

Premium
→ Actif

Premium
→ Impayé

Premium
→ Échéance proche

Plusieurs souscriptions
→ afficher la situation actuelle de manière concise

Ne pas afficher toute l'histoire dans la cellule.

## 2. ACTIONS COLLABORATEUR

Prévoir des actions contextuelles adaptées à l'état.

Actions possibles :

- Voir le détail
- Souscrire à un abonnement
- Voir les souscriptions
- Enregistrer un paiement
- Gérer la souscription

Ne pas mettre mécaniquement toutes les actions dans le menu de chaque ligne.

Les actions indisponibles selon l'état doivent être masquées ou désactivées côté UI.

RAPPEL :
Le backend doit rester l'autorité sur les permissions et règles métier.

## 3. DETAIL COLLABORATEUR

Le détail d'un collaborateur doit prévoir une section Abonnements.

Cette section doit permettre de voir :

### Souscriptions
- offre
- tarif applicable
- date début
- date fin
- statut
- renouvellement automatique

### Échéances
- période
- montant dû
- statut
- montant payé si disponible
- reste éventuel

### Paiements
- date
- montant
- référence
- échéance concernée
- utilisateur ayant enregistré

Prévoir une navigation claire vers le détail complet du module Abonnements lorsque nécessaire.

## 4. STATISTIQUES

Ne pas transformer les statistiques générales de Collaborateurs en dashboard financier.

Les statistiques existantes doivent rester centrées sur les collaborateurs.

Une petite information abonnement peut être ajoutée uniquement si elle apporte une vraie valeur immédiate.

## 5. RESPONSIVE

Sur mobile :
- éviter une table illisible avec 15 colonnes
- utiliser les mécanismes responsive déjà présents
- conserver les actions importantes accessibles

Ne pas réécrire ResponsiveDataTable si ce n'est pas nécessaire.

## OBJECTIF UX

Depuis un collaborateur, l'utilisateur doit comprendre rapidement :

"Quel abonnement a-t-il ?"
"À quel tarif ?"
"Est-il à jour ?"
"Puis-je enregistrer son paiement ?"
"Puis-je consulter son historique ?"

Mais la gestion complète reste dans la page Abonnements.

Ne pas implémenter ici les règles complexes de modification de prix.