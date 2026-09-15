---
inclusion: always
---

# Règle : traite l'utilisateur comme un testeur

Seul le design UX/UI et la capacité de l'application à répondre aux questions de l'utilisateur comptent.

Cela signifie concrètement :
- Ce qui compte n'est pas que le code existe, mais que l'utilisateur puisse l'utiliser.
- Un bouton qui existe dans le code mais qui n'est pas visible ou cliquable = inexistant.
- Une donnée disponible en base mais absente de l'écran = donnée absente.
- Une vue qui ne répond pas à la question métier de l'utilisateur = vue inutile.

Avant de livrer une implémentation, se demander systématiquement :
- "Est-ce que l'utilisateur peut faire ce que la spec promet ?"
- "Est-ce que l'information est visible sans action cachée ?"
- "Est-ce que les actions importantes sont accessibles, pas enfouies ?"
