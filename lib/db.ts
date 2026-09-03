import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Évite les instances multiples de PrismaClient en développement (hot-reload Next.js)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })

  const base = new PrismaClient({
    // Les logs natifs Prisma sont réduits au minimum.
    // L'observation des opérations est déléguée au middleware PEJAA via $extends.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    adapter,
  })

  // ─── Instrumentation PEJAA via Prisma Client Extensions ─────────────────
  //
  // $extends({ query: { $allModels: { $allOperations } } }) intercepte chaque
  // opération Prisma. TypeScript infère les types — on ne les annote pas.
  //
  // Actif uniquement quand PEJAA_LOGGER_ENABLED=true (ou en dev par défaut).
  // L'import dynamique du logger évite tout cycle de dépendances au démarrage.

  const loggerEnabled =
    process.env.PEJAA_LOGGER_ENABLED === 'true' ||
    (process.env.PEJAA_LOGGER_ENABLED === undefined &&
      process.env.NODE_ENV !== 'production')

  if (!loggerEnabled) return base

  const extended = base.$extends({
    query: {
      $allModels: {
        // TypeScript infère le type du callback depuis DynamicQueryExtensionCb.
        // Ne pas annoter `args` ni `query` — l'inférence est correcte.
        async $allOperations({ model, operation, args, query }) {
          const start = performance.now()
          let result: unknown
          let caught: unknown

          try {
            result = await query(args)
          } catch (err) {
            caught = err
          }

          const durationMs = performance.now() - start
          const key = `${model}.${operation}`

          // Observation asynchrone : ne bloque jamais la réponse HTTP.
          // setImmediate reporte le travail de logging après la réponse.
          setImmediate(async () => {
            try {
              const { serverLogger } = await import('./server-logger/logger')
              const { slowOperationMs, largeResultCount } = serverLogger.config

              // Toujours enregistrer les métriques (même pour les succès normaux)
              serverLogger.metrics.record(key, caught === undefined, durationMs)

              // Logger structuré uniquement pour ce qui est remarquable :
              // lenteur, volume important, ou erreur
              const count = Array.isArray(result) ? result.length : undefined
              const isSlow  = durationMs >= slowOperationMs
              const isLarge = count !== undefined && count >= largeResultCount
              const isError = caught !== undefined

              if (!isSlow && !isLarge && !isError) return

              const { fmtDb, fmtSuccess, fmtFailure, fmtSlow, fmtLarge, fmtErrorBlock } =
                await import('./server-logger/formatter')

              if (isError) {
                const lines = fmtErrorBlock({
                  title: `Erreur DB : ${key}`,
                  operation: key,
                  durationMs,
                  errorType:  extractType(caught),
                  prismaCode: extractCode(caught),
                  message:    extractMsg(caught),
                })
                serverLogger.emit(lines, true)
              } else {
                const lines: string[] = [
                  fmtDb(key, 0),
                  ...fmtSuccess(durationMs, { count }),
                ]
                if (isSlow)  lines.push(fmtSlow(durationMs, 0))
                if (isLarge) lines.push(fmtLarge(count!, 0))
                serverLogger.emit(lines, false)
              }
            } catch {
              // Ne jamais laisser le logger crasher l'application
            }
          })

          if (caught !== undefined) throw caught
          return result
        },
      },
    },
  })

  // $extends retourne un type étendu. On caste en PrismaClient pour conserver
  // les imports existants (import { prisma } from '@/lib/db') sans modification.
  return extended as unknown as PrismaClient
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// ─── Extraction d'erreur (dupliquée ici pour éviter un import au boot) ────────

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
