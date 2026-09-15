# PEJAA — MISSION GLOBALE : AUDIT EXHAUSTIF + ROBUSTIFICATION + REFONTE UX DES ABONNEMENTS

Nous allons maintenant traiter le chantier abonnements comme un ensemble cohérent.

**IMPORTANT : NE PAS TOUT FAIRE D’UNE TRAITE.**

La priorité est d’abord de **comprendre et tester le comportement réel du système**, puis de corriger les incohérences, puis de refondre l’UX.

Je veux que tu travailles en **passes successives**, avec un état d’avancement clair à chaque passe.

Ne commence pas par modifier massivement le code.

À chaque étape :

1. inspecte l’existant ;
2. identifie les comportements réellement implémentés ;
3. teste ce qui peut être testé sans modification ;
4. liste les anomalies et ambiguïtés ;
5. propose la correction ;
6. implémente uniquement le périmètre validé de l’étape ;
7. exécute les tests ;
8. vérifie qu’il n’y a pas de régression ;
9. passe ensuite à l’étape suivante.

Si une décision métier est ambiguë, **ne l’invente pas silencieusement**. Signale-la clairement et donne le comportement actuellement observé.

Le but n’est pas de produire beaucoup de code rapidement.

Le but est d’obtenir un système dont les règles métier sont compréhensibles, testées et cohérentes.

---

# 1. PRIORITÉ ABSOLUE : CARTOGRAPHIER LE VRAI COMPORTEMENT DES ABONNEMENTS

Nous avons besoin d’un état des lieux réel du système.

Inspecte notamment :

- modèles Prisma ;
- migrations ;
- services abonnements ;
- routes/API ;
- logique de création de souscription ;
- logique de génération des échéances ;
- logique de renouvellement ;
- cron/jobs ;
- logique de paiement ;
- logique de suspension ;
- logique de terminaison/résiliation ;
- logique d’annulation ;
- logique de changement de renouvellement automatique ;
- calcul de situation d’abonnement ;
- frontend de la page Abonnements ;
- frontend de la page Collaborateurs ;
- composants de tableau, notamment `ResponsiveDataTable` ;
- tests existants.

Ne te limite pas aux noms de fonctions.

Nous voulons savoir ce que le système **fait réellement**.

---

# 2. MATRICE D’ÉTATS À TESTER EXHAUSTIVEMENT

Les états de souscription sont :

- `ACTIVE`
- `SUSPENDUE`
- `TERMINEE`
- `ANNULEE`

Les modes de renouvellement sont :

- manuel
- automatique

Nous avons donc au minimum ces 8 combinaisons :

| État | Renouvellement |
|---|---|
| ACTIVE | MANUEL |
| ACTIVE | AUTOMATIQUE |
| SUSPENDUE | MANUEL |
| SUSPENDUE | AUTOMATIQUE |
| TERMINEE | MANUEL |
| TERMINEE | AUTOMATIQUE |
| ANNULEE | MANUEL |
| ANNULEE | AUTOMATIQUE |

Pour chacune, déterminer et tester :

- peut-on créer cette situation ?
- peut-on y arriver par transition ?
- peut-on en sortir ?
- vers quels états ?
- une échéance peut-elle être créée ?
- une échéance future peut-elle exister ?
- une échéance existante peut-elle continuer son cycle ?
- le paiement est-il autorisé ?
- un paiement partiel est-il autorisé ?
- le paiement total est-il autorisé ?
- une réduction est-elle autorisée ?
- le cron de renouvellement agit-il dessus ?
- une nouvelle période peut-elle être générée ?
- peut-on modifier le mode de renouvellement ?
- peut-on créer une nouvelle souscription pour le même collaborateur et la même offre ?
- les règles de chevauchement s’appliquent-elles ?
- que devient `date_fin` ?
- que deviennent les échéances existantes ?
- que devient la situation calculée ?
- que voit l’utilisateur dans l’interface ?
- quelle action l’utilisateur peut-il encore effectuer ?

---

# 3. NE PAS SE LIMITER AUX 8 CASES : TESTER LES TRANSITIONS

Nous voulons une véritable cartographie de la machine d’état.

Tester au minimum :

- ACTIVE → SUSPENDUE
- SUSPENDUE → ACTIVE
- ACTIVE → TERMINEE
- ACTIVE → ANNULEE
- SUSPENDUE → TERMINEE
- SUSPENDUE → ANNULEE
- et toutes les autres transitions que le code autorise actuellement.

Pour chaque transition, déterminer :

- déclencheur ;
- préconditions ;
- effet sur `date_fin` ;
- effet sur les échéances ;
- effet sur le renouvellement ;
- effet sur les paiements ;
- effet sur la situation ;
- réversibilité ;
- effet UI ;
- message utilisateur ;
- possibilité ou non d’une nouvelle souscription après cette transition.

Une attention particulière doit être portée à la différence entre :

- suspension ;
- terminaison ;
- résiliation ;
- annulation.

Ne pars pas du principe qu’ils signifient la même chose.

**Nous devons notamment vérifier précisément ce que fait actuellement “résilier/terminer”.**

Question métier à éclaircir par le comportement réel :

> Une résiliation termine-t-elle immédiatement la souscription, ou signifie-t-elle seulement que le renouvellement ne doit plus continuer après la période courante ?

Si le code actuel ne permet pas de répondre clairement, signale-le comme ambiguïté au lieu de choisir arbitrairement.

---

# 4. RENOUVELLEMENT MANUEL VS AUTOMATIQUE

Tester explicitement les transitions :

### ACTIVE + MANUEL → ACTIVE + AUTOMATIQUE

Et :

### ACTIVE + AUTOMATIQUE → ACTIVE + MANUEL

Mais également les autres états lorsqu’un changement est techniquement possible.

Tester chaque changement avec :

- aucune échéance ;
- une échéance courante ;
- une échéance future ;
- plusieurs échéances futures ;
- échéance partiellement payée ;
- échéance totalement payée ;
- période proche de sa fin ;
- exactement à la fin de période ;
- après la fin de période.

Déterminer :

- si une échéance est créée ;
- si une échéance est supprimée ;
- si les dates changent ;
- si le montant change ;
- si le statut change ;
- si un événement financier est créé ;
- si un événement d’audit est créé ;
- si le cron se comporte différemment ;
- si le frontend reflète immédiatement le changement.

**Le mode automatique doit changer le comportement futur, pas faire disparaître l’information temporelle actuelle.**

---

# 5. BUG IMPORTANT : NOUVELLE SOUSCRIPTION SANS “PROCHAINE ÉCHÉANCE”

Nous avons actuellement un problème UX/fonctionnel :

> Une nouvelle souscription apparaît sans “Prochaine échéance”, y compris lorsqu’elle est en renouvellement manuel.

Il faut remonter toute la chaîne :

```text
création souscription
        ↓
création échéance
        ↓
données en base
        ↓
service de situation abonnement
        ↓
API
        ↓
mapping frontend
        ↓
ResponsiveDataTable
        ↓
affichage “Prochaine échéance”
```

Identifier exactement où l’information disparaît.

Ne corrige pas uniquement l’affichage.

Déterminer d’abord si :

- l’échéance n’est jamais créée ;
- elle est créée mais mal datée ;
- elle existe mais n’est pas renvoyée ;
- la situation calcule mal `echeance_fin` ;
- l’API expose mal la donnée ;
- le frontend l’interprète mal ;
- le tableau masque la donnée.

Corriger à la source appropriée.

Règle UX :

**Une souscription doit pouvoir indiquer sa prochaine échéance indépendamment du fait qu’elle soit en renouvellement manuel ou automatique.**

Le badge “Renouvellement automatique” existe déjà.

Le problème n’est donc PAS simplement d’ajouter un badge.

Le problème est que la représentation globale doit permettre de comprendre immédiatement :

- ce qui est actif ;
- quelle est la période courante ;
- quand elle se termine ;
- si elle se renouvellera automatiquement ou non ;
- si une action est nécessaire.

---

# 6. TESTS TEMPORELS : NE PAS MODIFIER L’HORLOGE DU PC

Nous voulons tester les comportements liés au temps.

**Ne modifie pas manuellement la date/heure du PC ou du serveur.**

Cela peut perturber :

- JWT ;
- TLS ;
- sessions ;
- cron ;
- cache ;
- système ;
- base de données ;
- autres services.

À la place, inspecte comment l’application obtient l’heure :

- `new Date()`
- `Date.now()`
- PostgreSQL `now()`
- autres accès directs à l’horloge.

Déterminer si une abstraction de temps existe déjà.

Si nécessaire, proposer une horloge contrôlable pour les tests :

```text
production → vraie horloge
tests → horloge simulée
```

Ne réécris pas tout le système de temps sans nécessité.

---

# 7. TESTS E2E DE FIN DE PÉRIODE

Nous voulons pouvoir faire :

```text
1. créer une souscription
2. créer sa période
3. fixer le temps simulé
4. avancer jusqu’à la fin
5. déclencher le mécanisme temporel
6. observer le résultat
```

Tester au minimum :

### Manuel

À la fin de période :

- aucune nouvelle période automatique ;
- état correct ;
- situation correcte ;
- aucune échéance inattendue ;
- UI correcte.

### Automatique

À la fin de période :

- nouvelle période créée ;
- dates correctes ;
- durée correcte ;
- montant correct ;
- statut correct ;
- absence de doublon ;
- nouvelle échéance visible ;
- comportement identique lors d’une seconde exécution du job.

---

# 8. DURÉES EXTRÊMES

Le mécanisme temporel doit être testé avec des périodes très courtes :

- 10 secondes ;
- 30 secondes ;
- 1 minute ;
- quelques minutes ;
- quelques heures ;
- 1 jour ;
- durée normale mensuelle ;
- trimestrielle ;
- annuelle.

Le but est de vérifier qu’il n’existe pas d’hypothèse implicite du type :

```text
une période = au moins 24 heures
```

ou :

```text
le cron aura forcément le temps de tourner exactement à la bonne seconde.
```

---

# 9. CRON ET RETARD D’EXÉCUTION

Tester aussi un job qui s’exécute en retard.

Exemple conceptuel :

```text
période :
01/09 → 30/09

horloge actuelle :
31/12

job lancé maintenant
```

Déterminer le comportement voulu et actuel :

- création d’une seule période suivante ;
- création de toutes les périodes manquantes ;
- rattrapage jusqu’à la période courante ;
- autre comportement.

Le calcul d’une nouvelle période doit être basé sur la dernière période connue, pas simplement sur `now`, si cela correspond à la règle métier retenue.

Vérifier aussi l’idempotence :

```text
job exécuté deux fois
        ↓
pas de doublon
```

La contrainte/stratégie d’idempotence existante autour de :

```text
(id_souscription_abonnement, periode_debut)
```

doit être vérifiée.

---

# 10. CHEVAUCHEMENT DES SOUSCRIPTIONS

Nous avons la règle métier suivante :

> Pour un même collaborateur + une même offre, les périodes de souscription ne doivent pas se chevaucher.

Les souscriptions sur des offres différentes peuvent se chevaucher.

Tester les cas :

- ACTIVE + nouvelle souscription ;
- SUSPENDUE + nouvelle souscription ;
- TERMINEE + nouvelle souscription ;
- ANNULEE + nouvelle souscription ;
- même offre ;
- offre différente ;
- période passée ;
- période courante ;
- période future ;
- bornes exactement adjacentes ;
- chevauchement d’une seule seconde ;
- même date de début ;
- souscription sans `date_fin`.

Vérifier notamment le comportement réel de la contrainte PostgreSQL proposée autour de `tsrange`.

Attention particulière au filtre actuel envisagé :

```sql
WHERE (
  canceled_at IS NULL
  AND statut NOT IN ('ANNULEE', 'TERMINEE')
)
```

Ne considère pas automatiquement cette expression comme correcte.

Nous devons déterminer si une souscription `TERMINEE` avec une période encore pertinente doit réellement être ignorée par la protection contre les chevauchements.

Si la contrainte actuelle est incorrecte ou trop permissive, signale-le avant modification.

Les erreurs de chevauchement doivent être transformées en erreurs métier compréhensibles côté API/frontend.

**Aucun message Prisma/SQL brut ne doit arriver à l’utilisateur.**

---

# 11. PAIEMENTS : ARCHITECTURE VALIDÉE POUR V1

Architecture retenue :

- `PaiementAbonnement` = lignes d’allocation aux échéances ;
- `TransactionFinanciere` = acte financier global ;
- une transaction financière peut correspondre à plusieurs lignes `PaiementAbonnement`.

Exemple :

```text
paiement de 6 échéances
        ↓
6 PaiementAbonnement
        ↓
1 TransactionFinanciere
```

La transaction financière porte :

```text
source_module = ABONNEMENT
source_id = id_souscription_abonnement
type = IN
```

Pour V1 :

**interdire tout surplus de paiement.**

Pas de crédit/avoir pour le moment.

---

# 12. TESTS PAIEMENTS À EXÉCUTER

Tester :

### Paiement exact

Une échéance de 8 000 :

```text
paiement = 8 000
```

→ payée.

### Paiement partiel

```text
paiement = 3 000
```

→ échéance partiellement payée.

### Deux paiements partiels

```text
3 000
+
5 000
```

→ deux actes financiers distincts.

### Six échéances dans un même paiement

→ exactement :

```text
6 PaiementAbonnement
1 TransactionFinanciere
```

### Surpaiement

→ HTTP 400.

### Zéro

→ rejet.

### Montant négatif

→ rejet.

### Échéance déjà totalement payée

→ HTTP 409 ou erreur métier équivalente.

### Même échéance deux fois dans la même requête

→ rejet.

### Plusieurs souscriptions dans un même paiement

→ rejet en V1.

### Autre tenant

→ rejet.

### Échéance annulée/invalide

→ rejet.

### Atomicité

Si une ligne échoue :

```text
aucun PaiementAbonnement créé
aucune TransactionFinanciere créée
```

---

# 13. ANNULATION D’UN GROUPE DE PAIEMENT

L’annulation est au niveau de l’acte financier.

Route cible :

```text
/api/paiements-abonnements/groupes/:id_tf/annuler
```

Tester :

```text
1 TransactionFinanciere IN
+
N PaiementAbonnement
```

après annulation :

```text
TransactionFinanciere IN conservée
+
1 TransactionFinanciere OUT compensatrice
+
lignes PaiementAbonnement annulées
```

Le montant du OUT doit correspondre au montant réellement annulé.

Deuxième annulation :

→ rejet.

Pas de suppression physique de l’historique financier.

---

# 14. RÉDUCTIONS

Une réduction est appliquée directement sur `EcheanceAbonnement`.

Elle ne crée :

- ni paiement ;
- ni transaction financière.

Tester :

```text
échéance = 8 000
réduction = 2 000
reste = 6 000
```

Puis :

```text
paiement exact = 6 000
```

→ fonctionnement correct.

---

# 15. UX : LA PAGE ABONNEMENTS EST TROP ATOMISÉE

La table actuelle expose trop de colonnes et force l’utilisateur à reconstruire mentalement le dossier.

Nous ne voulons pas simplement réduire le nombre de pixels.

Nous voulons changer le **niveau de représentation**.

Le problème est :

```text
1 ligne UI = 1 ligne DB
```

Ce modèle ne fonctionne pas bien pour des abonnements renouvelables.

---

# 16. AGRÉGATION DES SOUSCRIPTIONS

Nous voulons pouvoir avoir une ligne UI qui représente un groupe.

Exemple conceptuel :

```text
Articho
  ├── Pro · Auto
  │    ├── période 1
  │    ├── période 2
  │    └── période 3
  ├── Premium · Manuel
  └── Formation · Manuel
```

Une souscription renouvelable avec plusieurs périodes doit pouvoir apparaître comme :

```text
▾ Articho | Pro | Auto | Situation actuelle
```

puis :

```text
  période 1
  période 2
  période 3
```

Le principe est similaire à celui que nous voulons déjà utiliser pour les mouvements de stock.

**Ce n’est pas une exception spécifique aux abonnements.**

Le `ResponsiveDataTable` doit disposer d’une capacité générique permettant :

- ligne agrégée ;
- chevron ;
- expansion ;
- lignes enfants ;
- état ouvert/fermé ;
- représentation desktop ;
- représentation mobile.

Ne crée donc pas un hack spécifique du genre :

```text
if subscription then special rendering
```

si une abstraction générique du composant est possible.

---

# 17. ATTENTION À LA HIÉRARCHIE D’AGRÉGATION

Ne regroupe pas aveuglément toutes les lignes d’un collaborateur.

Un collaborateur peut avoir :

- 3 abonnements renouvelables ;
- 6 abonnements manuels ;
- plusieurs offres différentes.

Nous ne voulons pas transformer tout cela en une soupe de neuf lignes cachées derrière un seul bouton.

La hiérarchie logique doit plutôt être :

```text
Collaborateur
    ↓
Souscription commerciale
    ↓
Périodes / échéances / renouvellements
```

À valider avec les données et le code existants.

---

# 18. DISTINCTION VISUELLE DES LIGNES AGRÉGÉES

Une ligne agrégée doit être immédiatement reconnaissable.

Utiliser par exemple :

- chevron ;
- légère variation de fond ;
- bordure ou indentation ;
- typographie légèrement différente.

Mais :

**ne pas utiliser les couleurs de statut pour représenter “agrégé”.**

Les couleurs vert/orange/rouge doivent conserver leur sémantique métier.

---

# 19. PAGE COLLABORATEURS : NOUVELLE VISION

La page Collaborateurs doit devenir un point d’entrée opérationnel naturel pour les abonnements.

Ce n’est pas seulement :

```text
ajouter un bouton "Abonner"
```

Il faut revoir la **vision de la situation abonnement par collaborateur**.

La page connaît déjà les collaborateurs et possède déjà des informations liées aux abonnements.

Le modèle attendu est :

### Aucun abonnement

Afficher une action directe :

```text
Abonner
```

### Un abonnement

Afficher une synthèse immédiatement compréhensible :

```text
Pro
8 000 Ar / mois
Prochaine échéance : 01/10/2026
Auto
```

### Plusieurs abonnements

Afficher une synthèse groupée et expandable.

L’utilisateur doit pouvoir comprendre la situation d’un collaborateur sans aller reconstruire son dossier à partir de plusieurs lignes dispersées.

---

# 20. RÔLE DE LA PAGE ABONNEMENTS

La page Abonnements peut rester utile.

Mais elle doit être davantage orientée :

- supervision ;
- administration ;
- recherche ;
- gestion globale ;
- historique ;
- opérations avancées.

La page Collaborateurs est le point d’entrée opérationnel.

Ne pas créer deux interfaces concurrentes qui racontent deux histoires différentes.

---

# 21. MOBILE

Ne pas résoudre le problème desktop en fabriquant un tableau horizontal encore plus petit.

Sur mobile :

```text
Collaborateur
Offre + prix
Prochaine échéance
Statut / renouvellement
Actions
```

Puis expansion pour les détails.

Les groupes agrégés doivent fonctionner naturellement sous forme de cartes compactes.

Pas de dépendance à un scroll horizontal pour comprendre la situation principale.

---

# 22. DATE CONTRACTUELLE VS PÉRIODE DE FACTURATION

Respecter la distinction :

```text
date_fin
```

= fin contractuelle de la relation.

Et :

```text
periode_fin
```

= fin de la période couverte/facturée.

La liste doit utiliser le vocabulaire :

```text
Prochaine échéance
```

pour l’information opérationnelle.

Le drawer peut utiliser :

```text
Fin contractuelle
```

ou :

```text
Sans date de fin
```

Ne mélange pas les deux concepts.

---

# 23. PRIX PERSONNALISÉ : NE PAS SUR-DESIGNER

Le modèle doit rester capable de gérer un tarif applicable/snapshot.

Mais l’UX doit être pensée pour le cas normal :

> la majorité des abonnements utilisent le prix fixe de l’offre.

Le prix personnalisé est un cas particulier.

Ne construis donc pas une interface où le tarif personnalisé prend autant de place que le reste.

Les changements de prix globaux doivent être des actions contextuelles avec une explication claire de leurs conséquences sur :

- anciennes échéances ;
- échéances déjà générées ;
- futures périodes.

Principe :

```text
prix de l’offre = tarif catalogue actuel
prix de la souscription = tarif applicable/snapshot
échéance = montant figé au moment de sa génération
```

Une modification future du tarif catalogue ne doit pas réécrire l’historique.

---

# 24. DRAWERS ET DÉTAILS

La table principale doit rester simple.

Les détails doivent vivre dans un drawer ou une vue détaillée.

Pour une souscription :

### Collaborateur

- collaborateur ;
- informations principales.

### Offre

- nom ;
- description ;
- prix ;
- périodicité.

### Conditions commerciales

- tarif applicable ;
- éventuelle personnalisation.

### Validité contractuelle

- début ;
- fin contractuelle ;
- renouvellement automatique.

### Échéances

- périodes ;
- montants ;
- états ;
- réductions ;
- paiements associés.

### Paiements

- actes financiers ;
- lignes ;
- dates ;
- montants ;
- annulations.

### Audit

- créé le/par ;
- modifié le/par ;
- autres informations pertinentes.

---

# 25. OFFRES : NE PAS OUBLIER LEUR CYCLE DE VIE

Inspecter aussi :

```text
ACTIVE
INACTIVE
ARCHIVED
```

et déterminer :

- création ;
- activation ;
- désactivation ;
- archivage ;
- suppression.

Règle existante :

> Suppression physique uniquement si l’offre n’a jamais eu de souscription.

Si elle a déjà été utilisée :

→ cycle de vie/archive, pas suppression destructive.

Déterminer précisément le comportement attendu lorsqu’on veut archiver une offre ayant encore des souscriptions actives.

Ne pas choisir silencieusement entre :

1. interdire l’archivage ;
2. permettre l’archivage mais empêcher les nouvelles souscriptions ;
3. autre comportement.

Documenter le comportement actuel et signaler l’ambiguïté si nécessaire.

---

# 26. RESPONSIVEDATATABLE : CAPACITÉ GÉNÉRIQUE

Puisque le même besoin apparaît pour :

- abonnements ;
- mouvements de stock ;
- potentiellement historique financier ;
- autres groupes d’événements,

nous voulons une capacité générique de :

```text
aggregate row
expandable row
child rows
```

Le composant doit rester utilisable pour une table normale.

Il doit donc supporter au minimum :

```text
mode classique
+
mode agrégé
```

sans imposer une logique métier spécifique au composant.

Vérifier aussi l’accessibilité :

- bouton/zone d’expansion ;
- aria approprié ;
- clavier ;
- état ouvert/fermé compréhensible.

---

# 27. TESTS UI À AJOUTER APRÈS STABILISATION DU BACKEND

Une fois les règles métier stabilisées, tester :

### Page Collaborateurs

- collaborateur sans abonnement ;
- un abonnement ;
- plusieurs abonnements ;
- auto ;
- manuel ;
- échéance courante ;
- échéance future ;
- échéance en retard ;
- abonnement suspendu ;
- terminé ;
- annulé.

### Page Abonnements

- affichage agrégé ;
- expansion ;
- plusieurs périodes ;
- distinction auto/manuelle ;
- prochaine échéance ;
- statut ;
- actions disponibles.

### Responsive

- desktop ;
- tablette ;
- mobile ;
- expansion mobile.

---

# 28. TESTS D’INTÉGRATION DE BOUT EN BOUT

Construire progressivement des scénarios réalistes.

## Scénario A — abonnement manuel

```text
créer collaborateur
→ créer offre
→ créer souscription MANUEL
→ vérifier échéance
→ payer partiellement
→ payer le reste
→ arriver à la fin de période
→ vérifier absence de renouvellement automatique
→ vérifier situation/UI
```

## Scénario B — abonnement automatique

```text
créer souscription AUTO
→ vérifier échéance
→ avancer le temps
→ déclencher renewal job
→ vérifier nouvelle période
→ vérifier nouvelle échéance
→ vérifier absence de doublon
```

## Scénario C — changement MANUEL → AUTO

```text
créer MANUEL
→ vérifier situation
→ passer AUTO
→ avancer le temps
→ exécuter job
→ vérifier renouvellement
```

## Scénario D — changement AUTO → MANUEL

```text
créer AUTO
→ vérifier renouvellement
→ passer MANUEL
→ avancer le temps
→ exécuter job
→ vérifier absence de renouvellement automatique
```

## Scénario E — suspension

Tester :

```text
ACTIVE
→ SUSPENDUE
→ période
→ paiement
→ cron
→ reprise
→ comportement final
```

## Scénario F — terminaison

Tester précisément ce que signifie la terminaison/résiliation :

```text
ACTIVE
→ TERMINEE
→ échéances existantes
→ paiement
→ cron
→ nouvelle souscription
```

## Scénario G — annulation

Tester :

```text
ACTIVE
→ ANNULEE
→ échéances
→ paiement
→ cron
→ nouvelle souscription
```

---

# 29. ISOLATION DES TESTS

Les scénarios temporels et abonnements doivent utiliser des données de test isolées.

Après chaque scénario :

- supprimer/rollback les données créées ;
- ne jamais détruire les données seed importantes ;
- ne jamais modifier les données réelles de développement de façon irréversible ;
- vérifier que le scénario suivant démarre dans un état propre.

Si des tests utilisent une transaction rollbackable, utiliser cette stratégie lorsqu’elle est compatible avec le mécanisme testé.

Pour les jobs/cron qui nécessitent une transaction séparée, utiliser une stratégie d’isolation adaptée.

---

# 30. RAPPORT DE TEST ATTENDU

Pour chaque passe, fournir un rapport concis avec :

```text
PASS N

Inspecté :
...

Tests exécutés :
...

Résultats :
✓ ...
✗ ...

Anomalies :
...

Décisions nécessaires :
...

Corrections effectuées :
...

Tests de non-régression :
...

Prochaine passe :
...
```

Ne masque jamais une ambiguïté derrière une implémentation arbitraire.

---

# 31. ORDRE DE TRAVAIL IMPOSÉ

Travaille dans cet ordre général :

## PASSE 1 — AUDIT

Aucune refonte UI massive.

Cartographier :

- états ;
- transitions ;
- renouvellement ;
- échéances ;
- paiements ;
- cron ;
- temps ;
- chevauchements ;
- calcul de situation ;
- UI actuelle.

## PASSE 2 — TESTS MÉTIER

Construire/compléter les tests autour :

- état × renouvellement ;
- transitions ;
- échéances ;
- chevauchements ;
- paiements ;
- annulations.

## PASSE 3 — TEMPS

Mettre en place la stratégie d’horloge de test.

Ajouter les scénarios :

- fin de période ;
- renouvellement ;
- retard de cron ;
- durées extrêmes ;
- idempotence.

## PASSE 4 — CORRECTIONS BACKEND

Corriger les incohérences révélées.

Notamment :

- création d’échéance ;
- prochaine échéance ;
- renouvellement ;
- états ;
- chevauchement ;
- erreurs métier ;
- paiement.

## PASSE 5 — UX / FRONTEND

Seulement une fois les règles métier fiables :

- page Collaborateurs ;
- page Abonnements ;
- agrégation ;
- prochaine échéance ;
- auto/manuelle ;
- mobile ;
- drawers.

## PASSE 6 — RESPONSIVEDATATABLE

Introduire proprement la capacité générique d’agrégation/expansion.

Puis adapter :

- abonnements ;
- collaborateurs ;
- mouvements de stock si nécessaire.

## PASSE 7 — TESTS E2E UI

Vérifier les scénarios utilisateurs complets.

---

# 32. RÈGLE DE PRUDENCE

Tu dois volontairement éviter le comportement :

```text
"j'ai compris le besoin"
→
"je modifie 30 fichiers"
→
"je lance les tests"
→
"voilà"
```

Nous voulons plutôt :

```text
inspecter
→
comprendre
→
tester
→
rapporter
→
corriger
→
tester
→
continuer
```

Si une passe devient trop volumineuse, **arrête-toi à une frontière logique**.

Ne cherche pas à finir artificiellement toute la mission dans une seule réponse.

La stabilité et la compréhension priment sur la vitesse.

---

# 33. CRITÈRE DE FIN GLOBAL

Nous considérerons le chantier comme stabilisé lorsque nous pourrons expliquer clairement :

1. ce que signifie chaque état ;
2. quelles transitions sont possibles ;
3. ce que fait chaque mode de renouvellement ;
4. ce qui se passe à la fin d’une période ;
5. ce que fait le cron ;
6. ce qui se passe si le cron est en retard ;
7. comment les échéances sont générées ;
8. comment les paiements sont enregistrés ;
9. comment les annulations financières fonctionnent ;
10. comment les chevauchements sont empêchés ;
11. ce qui est autorisé après terminaison/annulation ;
12. comment la situation est représentée côté UI ;
13. pourquoi la prochaine échéance est toujours correctement visible ;
14. comment un collaborateur voit ses abonnements ;
15. comment plusieurs périodes sont agrégées ;
16. comment cela fonctionne sur mobile ;
17. et surtout, que tout cela est couvert par des tests reproductibles.

---

# 34. PREMIÈRE ACTION À EFFECTUER MAINTENANT

**Commence uniquement par la PASSE 1 : AUDIT.**

Ne fais pas encore la refonte massive du frontend.

Ne réécris pas le système de dates.

Ne transforme pas immédiatement `ResponsiveDataTable`.

Ne modifie pas toute la logique métier en supposant ce qui devrait être vrai.

Inspecte l’existant et produis :

1. la machine d’état réellement implémentée ;
2. la matrice état × renouvellement ;
3. les transitions actuellement possibles ;
4. le fonctionnement réel des échéances ;
5. le fonctionnement réel du cron ;
6. les sources de temps utilisées ;
7. les règles de chevauchement réellement appliquées ;
8. le flux réel des paiements ;
9. la cause du bug “Prochaine échéance absente” ;
10. l’état actuel des pages Collaborateurs et Abonnements ;
11. les capacités actuelles de `ResponsiveDataTable` ;
12. les tests existants et les trous critiques.

**Puis arrête-toi.**

Je veux le rapport de la PASSE 1 avant que tu attaques la suite.

Et surtout : **ménage-toi.**

Il y a beaucoup de matière ici. Ne cherche pas à tout avaler d’une traite. Une passe bien faite vaut mieux qu’une avalanche de modifications à moitié vérifiées. Nous sommes précisément en train d’essayer d’éviter le genre de système où personne ne sait pourquoi quelque chose fonctionne mais où tout le monde prie pour que ça continue. 😌