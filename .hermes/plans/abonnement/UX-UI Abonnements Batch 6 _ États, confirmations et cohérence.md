Passe en revue tout le module Abonnements déjà implémenté et améliore uniquement la cohérence UX/UI et la gestion des états.

Ne refais pas l'architecture.

## 1. ETATS A DISTINGUER

Ne jamais confondre :

### Offre
- ACTIVE
- INACTIVE
- ARCHIVED

### Souscription
- active
- terminée
- annulée
- autres statuts réellement présents dans le backend

### Echéance
- à venir
- impayée
- partiellement payée
- payée
- annulée

### Paiement
- enregistré
- annulé
- autres statuts réellement présents dans le backend

Utiliser des badges visuellement distincts.

## 2. ACTIONS CONDITIONNELLES

Les actions doivent dépendre de l'état.

Exemples :

Offre inactive :
→ Souscrire un nouveau collaborateur interdit

Offre archivée :
→ aucune nouvelle souscription

Souscription terminée :
→ pas de paiement sur une nouvelle échéance inexistante

Paiement annulé :
→ ne pas permettre une deuxième annulation

Offre déjà utilisée :
→ suppression définitive interdite

Offre jamais utilisée :
→ suppression définitive possible

## 3. CONFIRMATIONS

Les actions destructrices ou historiquement importantes doivent avoir une confirmation adaptée.

Notamment :
- désactivation
- archivage
- suppression définitive
- résiliation
- annulation de paiement
- migration

Les confirmations doivent expliquer la conséquence réelle.

Éviter les messages vagues du type :
"Êtes-vous sûr ?"

Préférer :
"Cette offre ne pourra plus recevoir de nouvelles souscriptions. Les souscriptions existantes continueront normalement."

## 4. EMPTY STATES

Prévoir des états propres lorsque :

- aucune offre
- aucune souscription
- aucun collaborateur souscrit
- aucune échéance
- aucun paiement
- aucun résultat après filtre

Les empty states doivent expliquer quoi faire ensuite.

## 5. LOADING / ERROR

Utiliser les mécanismes existants du projet.

Prévoir :
- loading initial
- loading d'action
- erreur API
- validation formulaire
- succès
- impossibilité métier

Ne jamais afficher un succès si l'opération backend a échoué.

## 6. NAVIGATION

Depuis chaque niveau, permettre de remonter/descendre dans le contexte :

Offre
→ souscriptions
→ collaborateur

Collaborateur
→ souscriptions
→ échéances
→ paiements

Paiement
→ échéance
→ souscription
→ collaborateur
→ offre

L'objectif est qu'un utilisateur puisse répondre aux questions métier sans chercher l'information dans plusieurs écrans sans lien.

## 7. RESPONSIVE

Vérifier desktop + mobile.

Ne pas résoudre le responsive uniquement avec overflow horizontal partout.

Les informations prioritaires doivent rester visibles :
- collaborateur
- offre
- tarif
- statut
- paiement
- action principale

## 8. REGLE FINALE

Ne jamais modifier visuellement l'historique pour refléter une nouvelle situation.

Si une nouvelle condition commerciale est créée :
→ l'ancienne reste visible dans l'historique.

Si une offre devient inactive :
→ elle reste visible.

Si une souscription se termine :
→ elle reste visible.

Si un paiement est annulé :
→ il reste traçable comme annulé.

Le système doit privilégier la traçabilité et la compréhension métier plutôt qu'un faux sentiment de simplicité.