---
inclusion: always
---

# Règle : pas d'emoji comme icône UI

Ne jamais utiliser d'emoji (📋, 🤝, ✅, ⚠️, etc.) comme icône dans l'interface utilisateur.

Cela inclut sans exception :
- les boutons et actions
- les menus et dropdowns
- les badges et statuts
- les éléments de navigation
- les empty states
- les titres de sections
- les toasts et notifications

## Icônes à utiliser

Utiliser uniquement de vraies icônes SVG compatibles Tailwind CSS.

Le projet expose déjà un système d'icônes dans `components/icons/Icons.tsx`.
Vérifier ce fichier avant d'importer une bibliothèque externe.

Si une icône manque, l'ajouter dans `components/icons/Icons.tsx` sous forme de composant SVG inline,
ou utiliser **Lucide React** (`lucide-react`) si déjà installé dans le projet.

## Ce qui est autorisé

- SVG inline dans le JSX
- Composants d'icônes depuis `components/icons/Icons.tsx`
- Icônes Lucide React (`import { AlertCircle } from 'lucide-react'`)
- Toute bibliothèque d'icônes SVG déjà présente dans `package.json`

## Ce qui est interdit

- Tout caractère emoji utilisé comme élément visuel fonctionnel
- Unicode décoratif dans les boutons, labels, badges ou titres
