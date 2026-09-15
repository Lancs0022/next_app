/**
 * Types du logger serveur PEJAA
 * Séparé du logger client (lib/logger.ts — côté navigateur uniquement).
 */

export interface ServerLoggerConfig {
  /** Activer le logging (true en dev par défaut, false en prod) */
  enabled: boolean
  /** Répertoire racine pour les fichiers de logs */
  logsDir: string
  /** Seuil ms au-delà duquel une opération est "lente" */
  slowOperationMs: number
  /** Seuil de lignes retournées avant avertissement volume */
  largeResultCount: number
  /** Fenêtre ms pour détecter les appels répétitifs */
  repetitionWindowMs: number
  /** Nombre d'appels dans la fenêtre avant alerte */
  repetitionThreshold: number
}

export interface LogSession {
  startedAt: string
  sessionDir: string
  sessionLogPath: string
  errorsLogPath: string
  metricsJsonPath: string
  environment: string
}

// ─── Contexte d'exécution (propagé via AsyncLocalStorage) ────────────────────

/**
 * Contexte actif pour une requête ou un flux d'exécution donné.
 * Stocké dans AsyncLocalStorage — isolé entre requêtes concurrentes.
 *
 * requestId et route sont injectés automatiquement par withAuth.
 * section est fournie par la Route Context Map (automatique) ou slog.section() (explicite).
 * step est déclaré manuellement par les services via slog.step().
 *
 * Règle durée de vie :
 *   - slog.section(x) → section = x, step = null  (reset du step)
 *   - slog.step(x)    → step = x  (reste actif jusqu'au prochain step ou section)
 *
 * metadata est une zone d'extension plate et optionnelle.
 * Règles metadata :
 *   - primitives uniquement (string | number | boolean)
 *   - pas d'objets imbriqués
 *   - pas de secrets, credentials, tokens, mots de passe
 *   - pas de résultats Prisma ni de payloads HTTP
 *   - utilisation future : userId, sessionId, tenantId, clientId
 */
export interface RequestContext {
  /** Identifiant unique de la requête (ex: req_7f31a) */
  requestId: string
  /** Route HTTP (ex: "GET /api/stock/catalogue") */
  route: string
  /** Section courante (objectif fonctionnel, ex: "Chargement du catalogue stock") */
  section: string | null
  /** Étape courante (opération métier précise, ex: "Récupération du catalogue produit") */
  step: string | null
  /**
   * Extension optionnelle — primitives uniquement.
   * Allowlist gérée par addRequestMetadata() dans context.ts.
   */
  metadata?: Record<string, string | number | boolean>
}

// ─── Métriques HTTP ───────────────────────────────────────────────────────────

/** Enregistrement d'une requête HTTP entrante (pour détection répétitions HTTP) */
export interface HttpCallRecord {
  requestId: string
  route:     string   // "METHOD /path"
  timestamp: number
}

// ─── Métriques ────────────────────────────────────────────────────────────────

/**
 * Enregistrement d'un appel individuel.
 * Permet de reconstituer précisément qui a appelé quoi, quand et depuis quel contexte.
 */
export interface CallRecord {
  requestId: string
  route: string
  section: string | null
  step: string | null
  timestamp: number  // Date.now()
  durationMs: number
  ok: boolean
}

/** Stats par clé (endpoint HTTP ou opération DB) */
export interface CallStats {
  key: string
  calls: number
  successes: number
  errors: number
  totalMs: number
  /** Timestamps récents pour détection de répétition (fenêtre glissante) */
  recentTs: number[]
  /**
   * Enregistrements individuels (conservés sur la fenêtre de répétition).
   * Permet de distinguer :
   *   Cas A — même requestId plusieurs fois (boucle dans une requête)
   *   Cas B — requestIds différents (plusieurs requêtes distinctes)
   */
  records: CallRecord[]
}

/** Handle retourné par logger.operation() */
export interface OperationHandle {
  success(meta?: { count?: number; [k: string]: unknown }): void
  failure(error: unknown): void
}
