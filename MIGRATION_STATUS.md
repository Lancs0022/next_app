# MIGRATION_STATUS.md — PEJAA Next.js Migration

> Suivi de l'état de migration de tous les endpoints API des 10 domaines.
> Statuts : ⬜ à faire | 🔄 en cours | ✅ migré

| Méthode | URL | Domaine | Statut |
|---------|-----|---------|--------|
| POST | /api/auth/login | AUTH | ✅ migré |
| POST | /api/auth/logout | AUTH | ✅ migré |
| GET | /api/auth/me | AUTH | ✅ migré |
| GET | /api/stock | STOCK | ✅ migré |
| POST | /api/stock | STOCK | ✅ migré |
| GET | /api/collaborateurs | COLLABORATEURS | ✅ migré |
| POST | /api/collaborateurs | COLLABORATEURS | ✅ migré |
| GET | /api/produits | PRODUITS | ✅ migré |
| POST | /api/produits | PRODUITS | ✅ migré |
| PUT | /api/produits/:id | PRODUITS | ✅ migré |
| DELETE | /api/produits/:id | PRODUITS | ✅ migré |
| POST | /api/produits/:id/image | PRODUITS | ✅ migré |
| GET | /api/livraisons | LIVRAISONS | ✅ migré |
| POST | /api/livraisons | LIVRAISONS | ✅ migré |
| GET | /api/points-de-vente | POINTS_DE_VENTE | ✅ migré |
| POST | /api/points-de-vente | POINTS_DE_VENTE | ✅ migré |
| GET | /api/commandes | COMMANDES | ✅ migré |
| POST | /api/commandes | COMMANDES | ✅ migré |
| GET | /api/encaissements | ENCAISSEMENTS | ✅ migré |
| POST | /api/encaissements | ENCAISSEMENTS | ✅ migré |
| GET | /api/ventes | VENTES | ✅ migré |
| POST | /api/ventes | VENTES | ✅ migré |
| GET | /api/finance | FINANCE | ✅ migré |
| POST | /api/finance | FINANCE | ✅ migré |
| GET | /api/health | INFRASTRUCTURE | ✅ migré |

---

## État final de la migration

**Date de fin :** 2025-01-15
**Statut :** ✅ Migration complète — Pejaa_Back + Pejaa_Front → Next_App (Next.js 15)
**URL du projet :** http://localhost:3000

### Résumé des domaines migrés

| Domaine | Endpoints | Service Layer | Statut |
|---------|-----------|---------------|--------|
| AUTH | 3 endpoints | lib/auth.ts + Route Handlers | ✅ |
| STOCK | 2 endpoints | services/stock.service.ts | ✅ |
| COLLABORATEURS | 2 endpoints | services/collaborateurs.service.ts | ✅ |
| PRODUITS | 5 endpoints (dont upload image) | services/produits.service.ts | ✅ |
| LIVRAISONS | 2 endpoints | services/livraisons.service.ts | ✅ |
| POINTS_DE_VENTE | 2 endpoints | services/pointsDeVente.service.ts | ✅ |
| COMMANDES | 2 endpoints | services/commandes.service.ts | ✅ |
| ENCAISSEMENTS | 2 endpoints | services/encaissements.service.ts | ✅ |
| VENTES | 2 endpoints | services/ventes.service.ts | ✅ |
| FINANCE | 2 endpoints | services/finance.service.ts | ✅ |
| INFRASTRUCTURE | 1 endpoint (health) | — | ✅ |

### Infrastructure

- **ORM :** Prisma (PostgreSQL) — remplace MySQL2 raw queries
- **Auth :** JWT dans cookie HttpOnly `pejaa_token`
- **RBAC :** `withAuth` HOF avec override utilisateur + matrice de rôle
- **Cron jobs :** Snapshot stock mensuel + rappels abonnements hebdomadaires
- **Sécurité :** Headers HTTP via `next.config.ts` headers()
- **Frontend :** App Router, Server/Client Components, Redux Toolkit, TailwindCSS v4
