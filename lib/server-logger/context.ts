/**
 * Contexte d'exécution PEJAA — AsyncLocalStorage
 *
 * Chaque requête HTTP (ou flux d'exécution asynchrone) possède son propre
 * contexte isolé. Deux requêtes concurrentes ne peuvent pas se mélanger.
 *
 * Schéma :
 *
 *   withRequestContext(ctx, async () => {
 *     // tout le code ici voit ctx via getRequestContext()
 *     await prisma.vente.findMany()   ← $allOperations lit le même ctx
 *   })
 *
 * Node.js propage automatiquement le store AsyncLocalStorage à travers
 * await, Promise.all, setTimeout, setImmediate — pas besoin de le passer
 * manuellement à chaque fonction.
 */

import { AsyncLocalStorage } from 'async_hooks'
import type { RequestContext } from './types'
import { makeRequestId } from './formatter'

// Singleton du store — une seule instance partagée pour toute l'application.
export const requestContextStore = new AsyncLocalStorage<RequestContext>()

// ─── Accesseurs ───────────────────────────────────────────────────────────────

/** Retourne le contexte actif, ou null si on est hors d'un withRequestContext. */
export function getRequestContext(): RequestContext | null {
  return requestContextStore.getStore() ?? null
}

/**
 * Crée un nouveau contexte et exécute fn à l'intérieur.
 * Utilisé au point d'entrée de chaque requête HTTP (dans withAuth ou la route).
 */
export function withRequestContext<T>(
  ctx: RequestContext,
  fn: () => T,
): T {
  return requestContextStore.run(ctx, fn)
}

/**
 * Met à jour le contexte actif en place (mutation directe du store).
 * Safe : on mute l'objet référencé par le store, pas le store lui-même.
 * Utilisé par section() et step() dans RequestLogger.
 */
export function updateRequestContext(patch: Partial<RequestContext>): void {
  const ctx = requestContextStore.getStore()
  if (!ctx) return
  Object.assign(ctx, patch)
}

// Clés autorisées dans metadata — allowlist explicite.
// Toute clé absente de cette liste est silencieusement ignorée.
// Objectif : empêcher la metadata de devenir un sac à variables arbitraires.
const METADATA_ALLOWLIST = new Set([
  'userId',
  'tenantId',
  'sessionId',
  'clientId',
  'userRole',
  'domainCode',
])

/**
 * Ajoute des métadonnées au contexte de la requête courante.
 *
 * Règles :
 *   - Primitives uniquement (string | number | boolean)
 *   - Clés filtrées par allowlist — les clés inconnues sont ignorées silencieusement
 *   - Pas de secrets, credentials, tokens, mots de passe
 *   - Pas d'objets imbriqués
 *   - No-op si appelé hors d'un contexte ALS
 *
 * Usage futur :
 *   addRequestMetadata({ userId: user.id_utilisateur, tenantId })
 */
export function addRequestMetadata(
  kv: Record<string, string | number | boolean>,
): void {
  const ctx = requestContextStore.getStore()
  if (!ctx) return

  const filtered: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(kv)) {
    if (METADATA_ALLOWLIST.has(key)) {
      filtered[key] = value
    }
  }

  if (Object.keys(filtered).length > 0) {
    ctx.metadata = { ...(ctx.metadata ?? {}), ...filtered }
  }
}

/**
 * Construit un RequestContext initial pour une requête HTTP.
 * requestId et route sont obligatoires — injectés par withAuth.
 * section et step démarrent à null — déclarés par les services via slog.
 * metadata est absent — ajouté via addRequestMetadata() si nécessaire.
 */
export function makeRequestContext(opts: {
  requestId?: string
  route?: string
}): RequestContext {
  return {
    requestId: opts.requestId ?? makeRequestId(),
    route:     opts.route    ?? 'unknown',
    section:   null,
    step:      null,
    // metadata intentionnellement absent — optionnel
  }
}

/**
 * Retourne un label de contexte lisible pour les métriques.
 * Ex: "GET /api/ventes > Préparation annulation > Récupération ventes"
 * Ou:  "GET /api/ventes > Préparation annulation"
 * Ou:  "GET /api/ventes"
 */
export function contextLabel(ctx: RequestContext | null): string {
  if (!ctx) return 'hors-requête'
  const parts: string[] = [ctx.route]
  if (ctx.section) parts.push(ctx.section)
  if (ctx.step)    parts.push(ctx.step)
  return parts.join(' › ')
}
