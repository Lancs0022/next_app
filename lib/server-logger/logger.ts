/**
 * Logger serveur PEJAA — nœud central.
 *
 * Ce fichier est SERVEUR uniquement. Ne jamais l'importer depuis un composant React.
 *
 * Singleton via globalThis (même pattern que lib/db.ts) pour survivre au hot-reload.
 */

import path from 'path'
import type { ServerLoggerConfig, LogSession, CallStats, OperationHandle } from './types'
import { createSession, AsyncWriter } from './writer'
import {
  fmtSection, fmtStep, fmtDb, fmtApi,
  fmtSuccess, fmtFailure, fmtSlow, fmtLarge,
  fmtWarn, fmtInfo, fmtErrorBlock,
  fmtRequestStart, fmtRequestEnd,
  fmtSummary, fmtRepetition,
  fmtTimestamp, makeRequestId,
} from './formatter'

// ─── Configuration ────────────────────────────────────────────────────────────

function loadConfig(): ServerLoggerConfig {
  const enabled =
    process.env.PEJAA_LOGGER_ENABLED !== undefined
      ? process.env.PEJAA_LOGGER_ENABLED === 'true'
      : process.env.NODE_ENV !== 'production'

  const logsDir = (() => {
    const raw = process.env.PEJAA_LOGS_DIR ?? 'logs'
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
  })()

  return {
    enabled,
    logsDir,
    slowOperationMs:    Number(process.env.PEJAA_LOG_SLOW_OPERATION_MS   ?? 500),
    largeResultCount:   Number(process.env.PEJAA_LOG_LARGE_RESULT_COUNT  ?? 1000),
    repetitionWindowMs: Number(process.env.PEJAA_LOG_REPETITION_WINDOW_MS ?? 2000),
    repetitionThreshold:Number(process.env.PEJAA_LOG_REPETITION_THRESHOLD ?? 5),
  }
}

// ─── Métriques en mémoire ─────────────────────────────────────────────────────

class Metrics {
  private readonly map = new Map<string, CallStats>()
  private readonly alerts = new Set<string>() // clés déjà alertées

  constructor(
    private readonly config: ServerLoggerConfig,
    private readonly onAlert: (lines: string[]) => void,
  ) {}

  record(key: string, ok: boolean, ms: number): void {
    let s = this.map.get(key)
    if (!s) {
      s = { key, calls: 0, successes: 0, errors: 0, totalMs: 0, recentTs: [] }
      this.map.set(key, s)
    }
    s.calls++
    if (ok) s.successes++; else s.errors++
    s.totalMs += ms

    const now = Date.now()
    s.recentTs.push(now)
    // Purge hors fenêtre
    const cutoff = now - this.config.repetitionWindowMs
    s.recentTs = s.recentTs.filter(t => t >= cutoff)

    // Alerte répétition (une seule par clé par fenêtre)
    if (s.recentTs.length >= this.config.repetitionThreshold && !this.alerts.has(key)) {
      this.alerts.add(key)
      this.onAlert(fmtRepetition(key, s.recentTs.length, this.config.repetitionWindowMs))
      // Réarme après une fenêtre
      setTimeout(() => this.alerts.delete(key), this.config.repetitionWindowMs)
    }
  }

  toJSON(): object {
    const entries = Array.from(this.map.values())
    return {
      generatedAt: fmtTimestamp(),
      calls: entries.map(s => ({
        key: s.key,
        calls: s.calls,
        successes: s.successes,
        errors: s.errors,
        avgMs: s.calls > 0 ? Math.round(s.totalMs / s.calls) : 0,
      })),
    }
  }

  summaryLines(): string[] {
    const entries = Array.from(this.map.values())
      .sort((a, b) => b.calls - a.calls)
      .map(s => ({
        key: s.key,
        calls: s.calls,
        successes: s.successes,
        errors: s.errors,
        avgMs: s.calls > 0 ? Math.round(s.totalMs / s.calls) : 0,
      }))
    return fmtSummary(entries)
  }
}

// ─── Logger scopé à une requête ───────────────────────────────────────────────

export class RequestLogger {
  /** Niveau d'indentation courant (géré automatiquement par operation()) */
  private depth = 0

  constructor(
    private readonly core: PejaServerLogger,
    public readonly requestId: string,
  ) {}

  // ── Contexte métier ──────────────────────────────────────────────────────

  /** Header de section fonctionnelle importante */
  section(title: string): void {
    this.emit(fmtSection(title))
  }

  /** Étape nommée dans la section courante */
  step(label: string): void {
    this.emit([fmtStep(label, this.depth)])
  }

  /** Appel API explicite */
  api(method: string, urlPath: string): void {
    this.emit([fmtApi(method, urlPath, this.depth)])
  }

  /** Opération DB explicite (complète le log automatique Prisma) */
  db(operation: string): void {
    this.emit([fmtDb(operation, this.depth)])
  }

  info(message: string): void {
    this.emit([fmtInfo(message, this.depth)])
  }

  success(message: string, meta?: { count?: number }): void {
    const lines = [`${'   '.repeat(this.depth)}✓ ${message}`]
    if (meta?.count !== undefined) {
      lines.push(`${'   '.repeat(this.depth + 1)}Résultat : ${meta.count} ligne${meta.count !== 1 ? 's' : ''}`)
    }
    this.emit(lines)
  }

  warning(message: string): void {
    this.emit([fmtWarn(message, this.depth)])
  }

  error(message: string, err?: unknown): void {
    const lines = fmtErrorBlock({
      title: message,
      errorType:  err ? extractType(err) : undefined,
      prismaCode: err ? extractCode(err) : undefined,
      message:    err ? extractMsg(err)  : undefined,
    })
    this.emit(lines, true)
  }

  // ── Opération chronométrée ────────────────────────────────────────────────

  /**
   * Démarre une opération avec chronomètre automatique.
   * Le logger calcule la durée, affiche succès/erreur, signale les lenteurs et volumes.
   *
   * @example
   * const op = logger.operation('Récupération des ventes')
   * try {
   *   const rows = await prisma.vente.findMany(...)
   *   op.success({ count: rows.length })
   * } catch (err) {
   *   op.failure(err)
   * }
   */
  operation(label: string, opts: { dbOperation?: string; apiMethod?: string; apiPath?: string } = {}): OperationHandle {
    const start = performance.now()
    const depth = this.depth

    // Affiche l'en-tête immédiatement
    const header: string[] = [fmtStep(label, depth)]
    if (opts.dbOperation) header.push(fmtDb(opts.dbOperation, depth))
    else if (opts.apiMethod && opts.apiPath) header.push(fmtApi(opts.apiMethod, opts.apiPath, depth))
    this.emit(header)

    this.depth++
    const key = opts.dbOperation ?? (opts.apiMethod ? `${opts.apiMethod} ${opts.apiPath}` : label)

    return {
      success: (meta) => {
        const ms = performance.now() - start
        const count = meta?.count as number | undefined
        const isSlow  = ms >= this.core.config.slowOperationMs
        const isLarge = count !== undefined && count >= this.core.config.largeResultCount

        const lines = fmtSuccess(ms, { count, depth })
        if (isSlow)  lines.push(fmtSlow(ms, depth))
        if (isLarge) lines.push(fmtLarge(count!, depth))

        this.emit(lines)
        this.core.metrics.record(key, true, ms)
        this.depth = Math.max(0, this.depth - 1)
      },
      failure: (err) => {
        const ms = performance.now() - start
        const failLines = fmtFailure(ms, { depth })
        const errLines  = fmtErrorBlock({
          title: label,
          operation:  key,
          durationMs: ms,
          errorType:  extractType(err),
          prismaCode: extractCode(err),
          message:    extractMsg(err),
        })
        this.emit([...failLines, ...errLines], true)
        this.core.metrics.record(key, false, ms)
        this.depth = Math.max(0, this.depth - 1)
      },
    }
  }

  // ── Bornes de requête HTTP ────────────────────────────────────────────────

  requestStart(method: string, urlPath: string): void {
    this.emit(fmtRequestStart(this.requestId, method, urlPath))
  }

  requestEnd(durationMs: number, ok: boolean): void {
    this.emit(fmtRequestEnd(this.requestId, durationMs, ok))
    this.core.metrics.record(`${this.requestId}`, ok, durationMs)
  }

  // ── Interne ───────────────────────────────────────────────────────────────

  private emit(lines: string[], isError = false): void {
    this.core.emit(lines, isError)
  }
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export class PejaServerLogger {
  readonly config: ServerLoggerConfig
  readonly session: LogSession
  readonly metrics: Metrics
  private readonly writer: AsyncWriter

  constructor() {
    this.config = loadConfig()

    if (this.config.enabled) {
      this.session = createSession(this.config)
    } else {
      // Session factice — le logger est désactivé, toutes les méthodes sont no-op
      this.session = {
        startedAt: new Date().toISOString(),
        sessionDir: '', sessionLogPath: '', errorsLogPath: '',
        metricsJsonPath: '', environment: process.env.NODE_ENV ?? 'production',
      }
    }

    this.writer = new AsyncWriter()
    this.writer.setSession(this.session)

    this.metrics = new Metrics(this.config, (lines) => this.emit(lines))

    if (this.config.enabled) {
      // Flush propre à l'arrêt du process
      const shutdown = () => {
        this.writer.writeMetrics(JSON.stringify(this.metrics.toJSON(), null, 2))
        this.writer.flushSync()
      }
      process.once('beforeExit', shutdown)
      process.once('SIGTERM', shutdown)
    }
  }

  /** Émet des lignes vers fichier + console. No-op si logger désactivé. */
  emit(lines: string[], isError = false): void {
    if (!this.config.enabled) return
    this.writer.writeSession(lines)
    this.writer.writeConsole(lines)
    if (isError) this.writer.writeErrors(lines)
  }

  /** Logger scopé à une requête HTTP (request ID généré automatiquement) */
  forRequest(requestId?: string): RequestLogger {
    return new RequestLogger(this, requestId ?? makeRequestId())
  }

  /** Logger global sans contexte de requête */
  get global(): RequestLogger {
    return new RequestLogger(this, 'global')
  }

  /** Écrit le résumé des métriques dans les logs */
  printSummary(): void {
    this.emit(this.metrics.summaryLines())
    this.writer.writeMetrics(JSON.stringify(this.metrics.toJSON(), null, 2))
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
// Même pattern que lib/db.ts : survit au hot-reload Next.js en dev.

const g = globalThis as unknown as { __pejaLogger?: PejaServerLogger }
export const serverLogger: PejaServerLogger = g.__pejaLogger ?? new PejaServerLogger()
if (process.env.NODE_ENV !== 'production') g.__pejaLogger = serverLogger

// ─── Extraction d'erreur (sans importer sanitization dans un module séparé) ──

function extractMsg(err: unknown): string {
  if (!err) return ''
  const msg = err instanceof Error ? err.message : String(err)
  // Masque les connection strings PostgreSQL
  return msg
    .replace(/postgresql?:\/\/[^@\s]*@[^\s]*/gi, 'postgresql://[REDACTED]')
    .replace(/password=[^\s&;]*/gi, 'password=[REDACTED]')
}

function extractType(err: unknown): string {
  if (err instanceof Error) return err.constructor.name
  return typeof err
}

function extractCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as Record<string, unknown>).code === 'string') {
    return (err as Record<string, string>).code
  }
  return undefined
}
