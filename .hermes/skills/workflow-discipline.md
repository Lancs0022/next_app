# Skill : Discipline de workflow (plan-first)

## Objectif
Empêcher l'implémentation impulsive et sans direction. Toute tâche non triviale
passe par : analyse → sélection d'outils → plan écrit → validation utilisateur →
implémentation → suivi → rapport.

## Règle fondamentale
**Ne jamais écrire de code d'implémentation sans plan validé au préalable.**
Exception : les fichiers de plan/tâches eux-mêmes peuvent être édités à tout
moment (pour corriger, ajouter une tâche, ou noter un blocage).

## Étape 0 — Avant de lire les fichiers sources
1. Analyser en détail le sujet de la demande pour identifier les problèmes réels à résoudre.
2. Vérifier si une info doit être ajoutée à la mémoire permanente d'Hermes.
3. Lister les capacités Hermes disponibles (outils, skills) pertinentes pour le problème
   (ex : skill frontend-design si la tâche touche à l'UI).
4. Mémoriser cette sélection d'outils/skills et la faire suivre à **chaque** appel de modèle
   pendant la durée de la tâche.

## Étape 1 — Planification
1. Lire les fichiers source nécessaires.
2. Rédiger un plan en markdown contenant :
   - L'état existant (ce qui fonctionne déjà)
   - Les tâches à faire, découpées atomiquement, en lots (batches)
   - Les blocages connus ou anticipés
   - Les outils/skills sélectionnés à l'étape 0
   - La liste de tous les fichiers liés au plan (sources + tasks + mémoire)
3. Ne rien implémenter à ce stade.
4. Soumettre le plan à l'utilisateur.
   - Si la décision est mineure/rapide → utiliser l'outil de question rapide.
   - Sinon → attendre une validation explicite ("c'est bon", "go", etc.)

## Étape 2 — Stockage des plans et tâches
- Les fichiers de tâches vivent en permanence dans `.hermes/tasks/`.
- Un fichier "mémoire de session" séparé résume ce qui a déjà été fait ;
  le consulter avant de reprendre une tâche interrompue.

## Étape 3 — Exécution
- Une fois le plan validé, implémenter tâche par tâche.
- Après chaque tâche :
  - Cocher comme terminée **si vérifiée correcte**, ou
  - Noter précisément pourquoi elle a échoué / ce qui bloque.
- Si une tâche entre en boucle d'échecs répétés :
  **s'arrêter immédiatement**, ne pas insister, écrire dans le markdown la raison
  de l'échec, et remonter un rapport à l'utilisateur pour décider de la suite
  — plutôt que de continuer à tenter des variations à l'aveugle.

## Étape 4 — Clôture
- "Tâche terminée" seul ne suffit jamais. Fournir systématiquement :
  - Un rapport de ce qui a été fait
  - Les fichiers modifiés
  - Les vérifications effectuées (ex : résultat de build/tests)
  - Un retour honnête sur les points d'incertitude
- Si toutes les tâches d'un plan sont finies ET l'utilisateur confirme que
  tout est bon → déplacer les fichiers du plan vers `.hermes/archive/`,
  versionnés par un numéro incrémental + le titre du plan d'origine.
- Si l'utilisateur enchaîne sur une autre demande sans confirmer → laisser
  le plan en cours tel quel (ne pas archiver, ne pas l'abandonner).

## Anti-patterns à éviter (constatés)
- Implémenter par tâtonnement sans liste de tâches → hallucination de solution.
- Corriger un fichier, en casser un autre, revenir en boucle sur le premier.
- Oublier les tâches parallèles du plan en cours de route.
- Déclarer une correction "faite" sans preuve de vérification (ex : re-run du build).
- Attribuer un succès à la mauvaise cause (ex : accuser un flag de config qui
  était déjà correct depuis le début, au lieu d'identifier la vraie cause racine).
