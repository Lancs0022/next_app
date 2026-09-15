/**
 * Route Context Map — cartographie des routes vers leur section métier par défaut.
 *
 * Rôle : fournir une section initiale automatique pour chaque requête HTTP,
 * sans que le service ait besoin de déclarer slog.section() explicitement.
 *
 * Règles :
 *   - La section par défaut est une valeur initiale, jamais une contrainte.
 *   - slog.section() dans le service remplace toujours la valeur automatique.
 *   - Un endpoint non cartographié fonctionne normalement avec section = null.
 *   - Ce fichier est la seule chose à mettre à jour pour un nouveau module.
 *
 * Convention de nommage des sections :
 *   - Verbe d'action + objet métier (français)
 *   - GET  → "Récupération de..."  / "Chargement de..."
 *   - POST → "Enregistrement de..." / "Création de..."
 *   - PATCH/PUT → "Mise à jour de..."
 *   - DELETE → "Suppression de..."
 *
 * Organisation par domaine fonctionnel :
 *   Chaque bloc correspond à un domaine PEJAA futur ou existant.
 *   Ajouter une section "── NOM DU DOMAINE ──" pour chaque nouveau module.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouteContextEntry {
  /** Section métier par défaut affichée dans les logs */
  section: string
}

// ─── Cartographie ─────────────────────────────────────────────────────────────

const ROUTE_CONTEXTS: Record<string, RouteContextEntry> = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  'POST /api/auth/login':           { section: 'Authentification' },
  'POST /api/auth/logout':          { section: 'Déconnexion' },
  'GET  /api/auth/me':              { section: 'Récupération du profil utilisateur' },
  'POST /api/auth/change-password': { section: 'Changement de mot de passe' },
  'GET  /api/auth/profile':         { section: 'Récupération du profil' },
  'POST /api/auth/profile':         { section: 'Mise à jour du profil' },

  // ── Produits ──────────────────────────────────────────────────────────────
  'GET /api/produits':              { section: 'Récupération des produits' },
  'POST /api/produits':             { section: 'Création d\'un produit' },

  // ── Stock ─────────────────────────────────────────────────────────────────
  'GET /api/stock':                 { section: 'Récupération du stock' },
  'POST /api/stock':                { section: 'Ajustement du stock' },
  'GET /api/stock/catalogue':       { section: 'Chargement du catalogue stock' },
  'GET /api/stock/lots':            { section: 'Récupération des lots' },
  'GET /api/stock/mouvements':      { section: 'Récupération des mouvements de stock' },
  'GET /api/stock/ajustements':     { section: 'Récupération des ajustements de stock' },
  'POST /api/stock/ajustements':    { section: 'Enregistrement d\'un ajustement de stock' },
  'GET /api/stock/transferts':      { section: 'Récupération des transferts de stock' },
  'POST /api/stock/transferts':     { section: 'Enregistrement d\'un transfert de stock' },

  // ── Ventes ────────────────────────────────────────────────────────────────
  'GET /api/ventes':                { section: 'Récupération des ventes' },
  'POST /api/ventes':               { section: 'Enregistrement d\'une vente' },
  'GET /api/ventes/atomiques':      { section: 'Récupération des ventes (vue atomique)' },
  'POST /api/ventes/directe':       { section: 'Enregistrement d\'une vente directe' },

  // ── Livraisons ────────────────────────────────────────────────────────────
  'GET /api/livraisons':            { section: 'Récupération des livraisons' },
  'POST /api/livraisons':           { section: 'Enregistrement d\'une livraison' },

  // ── Collaborateurs ────────────────────────────────────────────────────────
  'GET /api/collaborateurs':        { section: 'Récupération des collaborateurs' },
  'POST /api/collaborateurs':       { section: 'Création d\'un collaborateur' },

  // ── Points de vente ───────────────────────────────────────────────────────
  'GET /api/points-de-vente':       { section: 'Récupération des points de vente' },
  'POST /api/points-de-vente':      { section: 'Création d\'un point de vente' },

  // ── Unités de mesure ──────────────────────────────────────────────────────
  'GET /api/unites-de-mesure':      { section: 'Récupération des unités de mesure' },
  'POST /api/unites-de-mesure':     { section: 'Création d\'une unité de mesure' },

  // ── Clients ───────────────────────────────────────────────────────────────
  'GET /api/clients':               { section: 'Récupération des clients' },
  'POST /api/clients':              { section: 'Création d\'un client' },

  // ── Commandes ─────────────────────────────────────────────────────────────
  'GET /api/commandes':             { section: 'Récupération des commandes' },
  'POST /api/commandes':            { section: 'Enregistrement d\'une commande' },

  // ── Encaissements ─────────────────────────────────────────────────────────
  'GET /api/encaissements':         { section: 'Récupération des encaissements' },
  'POST /api/encaissements':        { section: 'Enregistrement d\'un encaissement' },

  // ── Finance ───────────────────────────────────────────────────────────────
  'GET /api/finance':               { section: 'Récupération des données financières' },

  // ── Comptabilité / Transactions financières (futurs modules) ─────────────
  // 'GET /api/comptabilite':          { section: 'Récupération des données comptables' },
  // 'POST /api/transactions-financieres': { section: 'Enregistrement d\'une transaction financière' },

  // ── Abonnements (futur) ───────────────────────────────────────────────────
  // 'GET /api/abonnements':           { section: 'Récupération des abonnements' },
  // 'POST /api/abonnements':          { section: 'Création d\'un abonnement' },

  // ── Paiements (futur) ─────────────────────────────────────────────────────
  // 'GET /api/paiements':             { section: 'Récupération des paiements' },
  // 'POST /api/paiements':            { section: 'Enregistrement d\'un paiement' },

  // ── Utilisateurs / Groupes / Autorisations (futur) ───────────────────────
  // 'GET /api/utilisateurs':          { section: 'Récupération des utilisateurs' },
  // 'POST /api/utilisateurs':         { section: 'Création d\'un utilisateur' },
  // 'GET /api/groupes':               { section: 'Récupération des groupes' },
  // 'GET /api/autorisations':         { section: 'Récupération des autorisations' },

  // ── Paramètres / Préférences (futur) ──────────────────────────────────────
  // 'GET /api/parametres':            { section: 'Récupération des paramètres' },
  // 'GET /api/preferences':           { section: 'Récupération des préférences' },

}

// ─── Accesseur ───────────────────────────────────────────────────────────────

/**
 * Retourne la section par défaut pour une route donnée.
 *
 * Correspondance dans l'ordre :
 *   1. Exacte            : "GET /api/stock/catalogue"
 *   2. Sans query string : "GET /api/stock/catalogue?foo=bar" → "GET /api/stock/catalogue"
 *   3. Préfixe /*        : pour les routes dynamiques (/api/produits/[id])
 *
 * Retourne null si aucune correspondance — section restera null dans le contexte.
 * Un endpoint non cartographié fonctionne normalement.
 */
export function getDefaultSection(route: string): string | null {
  // 1. Correspondance exacte
  if (ROUTE_CONTEXTS[route]) return ROUTE_CONTEXTS[route].section

  // 2. Sans query string
  const withoutQs = route.split('?')[0]
  if (withoutQs !== route && ROUTE_CONTEXTS[withoutQs]) {
    return ROUTE_CONTEXTS[withoutQs].section
  }

  // 3. Préfixe wildcard pour routes dynamiques (ex: "GET /api/produits/*")
  const parts = withoutQs.split('/')
  // Essaie de raccourcir le chemin d'un segment à la fois (ex: /api/ventes/123 → /api/ventes/*)
  for (let len = parts.length - 1; len > 2; len--) {
    const prefix = parts.slice(0, len).join('/') + '/*'
    if (ROUTE_CONTEXTS[prefix]) return ROUTE_CONTEXTS[prefix].section
  }

  return null
}
