# Ajouter une marchandise

## Vue d'ensemble

Le flux complet comporte deux étapes métier distinctes :

1. créer ou retrouver le produit dans le catalogue ;
2. enregistrer la livraison qui crée un ou plusieurs lots en stock.

Le catalogue décrit le produit. La livraison crée le stock réel disponible dans un point de vente.

## Parcours recommandé

### 1. Ouvrir le catalogue

Depuis `Stock > Catalogue`, cliquer sur `Ajouter au catalogue`.

Renseigner :

- le collaborateur ;
- le point de vente si vous voulez préparer le contexte de livraison ;
- le nom du produit ;
- la catégorie ;
- l'unité ;
- le seuil d'alerte ;
- la description si nécessaire.

Valider avec `Créer`.

### 2. Ouvrir l'ajout de marchandise

Depuis `Stock > Lots disponibles` ou `Stock > Livraisons`, cliquer sur `Ajouter une marchandise` ou `Nouvelle livraison`.

Renseigner l'en-tête de livraison :

- collaborateur ;
- point de vente ;
- date de livraison ;
- référence ;
- commentaire si besoin.

### 3. Ajouter les lots

Dans la section `Lots`, sélectionner un produit catalogue existant.

Si le produit n'existe pas encore :

- cliquer sur le bouton `+` dans le champ `Produit catalogue` ;
- créer rapidement le produit ;
- revenir automatiquement sur la ligne du lot avec le produit déjà sélectionné.

Pour chaque lot, renseigner :

- le prix initial ;
- la marge ;
- la quantité initiale ;
- la description optionnelle du lot.

Ajouter autant de lots que nécessaire dans la même livraison.

### 4. Valider la livraison

Quand la livraison est créée :

- un en-tête de livraison est enregistré ;
- chaque ligne devient un lot ;
- chaque lot alimente le stock actuel ;
- un mouvement d'entrée est enregistré dans l'historique.

Le produit apparaît alors :

- dans `Catalogue` avec son stock agrégé ;
- dans `Lots disponibles` avec ses détails de lot ;
- dans `Livraisons` avec le résumé de la livraison.

## Cas rapide

Si vous connaissez déjà le produit, commencez directement par `Ajouter une marchandise`.

Si vous ne connaissez pas encore le produit, créez-le d'abord dans `Catalogue`, puis enchaînez sur la livraison.

## Conseils

- Utiliser le seuil d'alerte pour repérer rapidement les produits proches de la rupture.
- Utiliser le filtre collaborateur dans `Catalogue` pour isoler les produits d'un fournisseur ou partenaire.
- Utiliser l'historique de mouvements d'un lot pour tracer les entrées et ajustements.
