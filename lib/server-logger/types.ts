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

/** Stats par clé (endpoint HTTP ou opération DB) */
export interface CallStats {
  key: string
  calls: number
  successes: number
  errors: number
  totalMs: number
  /** Timestamps récents pour détection de répétition */
  recentTs: number[]
}

/** Handle retourné par logger.operation() */
export interface OperationHandle {
  success(meta?: { count?: number; [k: string]: unknown }): void
  failure(error: unknown): void
}
