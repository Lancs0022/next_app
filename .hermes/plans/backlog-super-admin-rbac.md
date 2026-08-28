# Backlog — Super Admin & RBAC complet

> Statut : **PLANIFIÉ** — ne pas implémenter avant validation du batch unités de mesure.
> Compte super_admin de référence : `Lancs0022@gmail.com`

---

## 1. Rôles et hiérarchie

| Rôle | Description | Accès |
|---|---|---|
| `super_admin` | Accès total + fonctions réservées | Tout, y compris gestion utilisateurs, unités, RBAC |
| `admin` | Gestion opérationnelle complète | Tout sauf RBAC et gestion utilisateurs |
| `employe` | Saisie ventes, livraisons, stock | Périmètre limité défini dans la matrix |
| `collaborateur` | Vue lecture seule de ses propres données | Dashboard limité |
| `client` | Aucun accès admin | — |

Le `super_admin` hérite de tout ce que l'`admin` peut faire, mais l'inverse n'est pas vrai.

---

## 2. Gestionnaire d'utilisateurs (super_admin only)

### Pages à créer
- `/settings/utilisateurs` — liste des utilisateurs du tenant
- `/settings/utilisateurs/nouveau` — formulaire création
- `/settings/utilisateurs/[id]` — édition, suspension, réinitialisation mot de passe

### Fonctionnalités
- CRUD complet : créer, modifier, suspendre (`actif = false`), supprimer (soft delete)
- Changer le rôle d'un utilisateur
- Réinitialiser le mot de passe (génère un lien ou un mot de passe temporaire)
- Voir le dernier login (`last_login_at` à ajouter sur `Utilisateur`)

### Schéma à ajouter sur `Utilisateur`
```prisma
last_login_at DateTime?
suspended_at  DateTime?
suspended_by  Int?
```

---

## 3. Gestionnaire d'autorisations — Mini-LDAP

### Concept
Trois niveaux d'autorisation, par ordre de priorité décroissante :
1. **Override individuel** (`user_access_override`) — surcharge tout le reste
2. **Matrice de rôle** (`role_access_matrix`) — défaut du rôle
3. **Défaut système** — refus si rien n'est défini

### Tables existantes (déjà présentes)
- `access_domain` — domaines fonctionnels (STOCK, VENTES, etc.)
- `role_access_matrix` — permissions par rôle × domaine
- `user_access_override` — exceptions individuelles

### Domaines à ajouter dans le seed
```
UNITES          Unités de mesure
UTILISATEURS    Gestion des utilisateurs
RBAC            Gestion des autorisations
```

### UI à créer (`super_admin` only)
- `/settings/autorisations` — matrice rôle × domaine (tableau éditable)
- `/settings/autorisations/utilisateur/[id]` — overrides individuels

### Groupes (future évolution)
Ajouter une table `Groupe` (nom, membres) pour assigner des permissions à un ensemble d'utilisateurs sans passer par les rôles. Priorité : override utilisateur > groupe > rôle.

```prisma
model Groupe {
  id_groupe  Int                 @id @default(autoincrement())
  tenant_id  Int
  nom        String
  actif      Boolean             @default(true)
  membres    GroupeMembre[]
  matrix     GroupeAccessMatrix[]
  @@map("groupe")
}

model GroupeMembre {
  id_groupe      Int
  id_utilisateur Int
  @@id([id_groupe, id_utilisateur])
  @@map("groupe_membre")
}

model GroupeAccessMatrix {
  id_groupe  Int
  id_domain  Int
  can_read   Boolean @default(false)
  can_write  Boolean @default(false)
  can_delete Boolean @default(false)
  can_manage Boolean @default(false)
  @@id([id_groupe, id_domain])
  @@map("groupe_access_matrix")
}
```

---

## 4. Page Settings — structure cible

```
/settings
  ├── /points-de-vente       (admin + super_admin)
  ├── /unites-de-mesure      (super_admin only)          ← BATCH ACTUEL
  ├── /utilisateurs          (super_admin only)          ← CE BACKLOG
  ├── /autorisations         (super_admin only)          ← CE BACKLOG
  └── /profil                (tous)
```

---

## 5. Sidebar — entrées conditionnelles

La sidebar doit afficher/masquer les entrées selon le rôle. Actuellement le filtrage est absent.
À implémenter : `useAuth().currentUser.role` → filtrage des items dans `Sidebar.tsx`.

Entrées réservées `super_admin` :
- Unités de mesure
- Utilisateurs
- Autorisations

---

## 6. Ordre d'implémentation recommandé

1. ✅ Unités de mesure (batch actuel)
2. Gestion utilisateurs (CRUD simple, sans groupes)
3. Matrice d'autorisations (édition de `role_access_matrix` via UI)
4. Overrides individuels
5. Groupes (LDAP-like)

---

*Rédigé le : 2026-08-20 — À réviser avant chaque batch.*
