import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Évite les instances multiples de PrismaClient en développement (hot-reload Next.js)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })

  const base = new PrismaClient({
    // Logs natifs Prisma réduits au minimum.
    // L'observation des opérations est déléguée au middleware PEJAA via $extends.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    adapter,
  })

  // ─── Instrumentation PEJAA via Prisma Client Extensions ─────────────────
  //
  // Timing : performance.now() entoure UNIQUEMENT query(args).
  // Le logging est délégué à setImmediate — ne bloque jamais la réponse HTTP
  // et n'est pas inclus dans la mesure de durée.
  //
  // Contexte : lu SYNCHRONIQUEMENT (avant setImmediate) pour capturer l'état
  // exact de l'ALS au moment de l'appel, pas après.

  const loggerEnabled =
    process.env.PEJAA_LOGGER_ENABLED === 'true' ||
    (process.env.PEJAA_LOGGER_ENABLED === undefined &&
      process.env.NODE_ENV !== 'production')

  if (!loggerEnabled) return base

  const extended = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // ── 1. Mesure DB uniquement ───────────────────────────────────────
          const start = performance.now()
          let result: unknown
          let caught: unknown

          try {
            result = await query(args)
          } catch (err) {
            caught = err
          }

          const durationMs = performance.now() - start

          // ── 2. Capture synchrone du contexte ALS ──────────────────────────
          // On lit MAINTENANT (même tick) pour isoler ce contexte précis.
          // Si on attendait dans setImmediate, une autre requête concurrente
          // pourrait avoir écrasé le store.
          let capturedCtx: {
            requestId: string
            route: string
            section: string | null
            step: string | null
          } | null = null

          try {
            // Import synchronisé (déjà en cache après le premier appel)
            const ctxMod = await import('./server-logger/context')
            const ctx = ctxMod.getRequestContext()
            if (ctx) {
              capturedCtx = {
                requestId: ctx.requestId,
                route:     ctx.route,
                section:   ctx.section,
                step:      ctx.step,
              }
            }
          } catch {
            // silencieux
          }

          const key       = `${model}.${operation}`
          const ts        = Date.now()
          const isSuccess = caught === undefined

          // ── 3. Logging asynchrone ─────────────────────────────────────────
          setImmediate(async () => {
            try {
              const { serverLogger } = await import('./server-logger/logger')
              const { slowOperationMs, largeResultCount } = serverLogger.config

              // Métriques : toujours enregistrées
              serverLogger.metrics.record(key, isSuccess, durationMs, capturedCtx
                ? {
                    requestId:  capturedCtx.requestId,
                    route:      capturedCtx.route,
                    section:    capturedCtx.section,
                    step:       capturedCtx.step,
                    timestamp:  ts,
                    durationMs,
                    ok: isSuccess,
                  }
                : undefined
              )

              // Log structuré pour toutes les opérations en dev (pas uniquement les remarquables)
              const count   = Array.isArray(result) ? result.length : undefined
              const isSlow  = durationMs >= slowOperationMs
              const isLarge = count !== undefined && count >= largeResultCount
              const isError = !isSuccess

              const {
                fmtDbWithContext, fmtDbResult,
                fmtSlow, fmtLarge, fmtErrorBlock,
              } = await import('./server-logger/formatter')

              if (isError) {
                serverLogger.emit(fmtErrorBlock({
                  title:      `Erreur DB : ${key}`,
                  operation:  key,
                  durationMs,
                  errorType:  extractType(caught),
                  prismaCode: extractCode(caught),
                  message:    extractMsg(caught),
                }), true)
              } else {
                const lines: string[] = [
                  ...fmtDbWithContext(key, capturedCtx),
                  fmtDbResult(durationMs, true, count),
                ]
                if (isSlow)  lines.push(fmtSlow(durationMs))
                if (isLarge) lines.push(fmtLarge(count!))
                serverLogger.emit(lines, false)
              }
            } catch {
              // Ne jamais crasher l'app à cause du logger
            }
          })

          if (caught !== undefined) throw caught
          return result
        },
      },
    },
  })

  return extended as unknown as PrismaClient
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// ─── Extraction d'erreur ──────────────────────────────────────────────────────

function extractMsg(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw
    .replace(/postgresql?:\/\/[^@\s]*@[^\s]*/gi, 'postgresql://[REDACTED]')
    .replace(/password=[^\s&;]*/gi, 'password=[REDACTED]')
}

function extractType(err: unknown): string {
  return err instanceof Error ? err.constructor.name : typeof err
}

function extractCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err &&
      typeof (err as Record<string, unknown>).code === 'string') {
    return (err as Record<string, string>).code
  }
  return undefined
}
