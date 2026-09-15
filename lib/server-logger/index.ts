/**
 * Logger serveur PEJAA — point d'entrée public.
 * MODULE SERVEUR UNIQUEMENT — ne jamais importer depuis un composant React.
 *
 * ─── Dans les services ────────────────────────────────────────────────────────
 *
 *   import { slog } from '@/lib/server-logger'
 *
 *   slog.section("Chargement du catalogue stock")
 *   slog.step("Récupération du catalogue produit")
 *   const produits = await prisma.produitCatalogue.findMany(...)
 *   // Prisma mesure et logue automatiquement [DB] + durée + lignes
 *   // Ne jamais appeler slog.db() ou slog.success() dans les services
 *
 * ─── slog est stateless ───────────────────────────────────────────────────────
 *
 *   slog ne stocke aucun contexte. Chaque appel lit l'ALS courant.
 *   req_A → slog.section("X") → ALS_A.section = "X"
 *   req_B → slog.section("Y") → ALS_B.section = "Y"  ← isolé
 */

export { serverLogger, PejaServerLogger, RequestLogger } from './logger'
export type { ServerLoggerConfig, LogSession, OperationHandle, CallStats, CallRecord } from './types'

import { updateRequestContext, getRequestContext, addRequestMetadata } from './context'
import { serverLogger } from './logger'

export { addRequestMetadata }

/**
 * Interface de contexte pour les services.
 *
 * Règles :
 *   1. section() reset step à null automatiquement
 *   2. step() reste actif jusqu'au prochain step ou section
 *   3. Déclarer le step JUSTE AVANT l'appel Prisma qu'il décrit
 *   4. Ne JAMAIS appeler slog.db() / slog.success() dans les services —
 *      Prisma observe et logue automatiquement tout ce qui compte
 */
export const slog = {
  /**
   * Déclare une section fonctionnelle (objectif général de la requête).
   * Reset step à null. Préfixe la ligne avec [requestId] si dans un contexte ALS.
   */
  section: (title: string): void => {
    updateRequestContext({ section: title, step: null })
    const ctx    = getRequestContext()
    const prefix = ctx ? `[${ctx.requestId}] ` : ''
    const symbol = title === 'Auth' ? '▸' : '▶'
    serverLogger.emit([``, `${prefix}${symbol} ${title}`, ``])
  },

  /**
   * Déclare l'étape en cours (opération métier précise).
   * Reste actif jusqu'au prochain step ou section.
   * Préfixe la ligne avec [requestId] si dans un contexte ALS.
   */
  step: (label: string): void => {
    updateRequestContext({ step: label })
    const ctx    = getRequestContext()
    const prefix = ctx ? `[${ctx.requestId}] ` : ''
    serverLogger.emit([`${prefix}  → ${label}`])
  },
} as const
