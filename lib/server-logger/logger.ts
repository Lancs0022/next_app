/**
 * Logger serveur PEJAA — nœud central.
 * MODULE SERVEUR UNIQUEMENT — ne jamais importer depuis un composant React.
 *
 * Singleton via globalThis (survit au hot-reload Next.js en dev).
 */

import path from 'path'
import type { ServerLoggerConfig, LogSession, CallStats, CallRecord, OperationHandle } from './types'
import { createSession, AsyncWriter } from './writer'
import {
  withRequestContext,
  updateRequestContext,
  makeRequestContext,
  getRequestContext,
} from './context'
import { HttpMetrics } from './http-metrics'
import {
  fmtSection, fmtStep, fmtDb,
  fmtDbResult, fmtSlow, fmtLarge,
  fmtErrorBlock, fmtRequestStart, fmtRequestEnd,
  fmtSummary, fmtRepetitionV3,
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
    slowOperationMs:     Number(process.env.PEJAA_LOG_SLOW_OPERATION_MS    ?? 500),
    largeResultCount:    Number(process.env.PEJAA_LOG_LARGE_RESULT_COUNT   ?? 1000),
    repetitionWindowMs:  Number(process.env.PEJAA_LOG_REPETITION_WINDOW_MS ?? 2000),
    repetitionThreshold: Number(process.env.PEJAA_LOG_REPETITION_THRESHOLD ?? 5),
  }
}

// ─── Métriques ────────────────────────────────────────────────────────────────

class Metrics {
  private readonly map     = new Map<string, CallStats>()
  private readonly alerted = new Set<string>()

  constructor(
    private readonly config: ServerLoggerConfig,
    private readonly onAlert: (lines: string[]) => void,
  ) {}

  record(key: string, ok: boolean, ms: number, record?: CallRecord): void {
    let s = this.map.get(key)
    if (!s) {
      s = { key, calls: 0, successes: 0, errors: 0, totalMs: 0, recentTs: [], records: [] }
      this.map.set(key, s)
    }

    s.calls++
    if (ok) s.successes++; else s.errors++
    s.totalMs += ms

    const now    = Date.now()
    const cutoff = now - this.config.repetitionWindowMs
    s.recentTs.push(now)
    s.recentTs = s.recentTs.filter(t => t >= cutoff)

    if (record) {
      s.records.push(record)
      s.records = s.records.filter(r => r.timestamp >= cutoff)
    }

    if (s.recentTs.length >= this.config.repetitionThreshold && !this.alerted.has(key)) {
      this.alerted.add(key)
      this.onAlert(fmtRepetitionV3(key, this.config.repetitionWindowMs, s.records.slice()))
      setTimeout(() => this.alerted.delete(key), this.config.repetitionWindowMs)
    }
  }

  toJSON(): object {
    return {
      generatedAt: fmtTimestamp(),
      calls: Array.from(this.map.values()).map(s => ({
        key:       s.key,
        calls:     s.calls,
        successes: s.successes,
        errors:    s.errors,
        avgMs:     s.calls > 0 ? Math.round(s.totalMs / s.calls) : 0,
        routes:   [...new Set(s.records.map(r => r.route))],
        sections: [...new Set(s.records.map(r => r.section).filter(Boolean))],
      })),
    }
  }

  summaryLines(): string[] {
    return fmtSummary(
      Array.from(this.map.values())
        .sort((a, b) => b.calls - a.calls)
        .map(s => ({
          key:       s.key,
          calls:     s.calls,
          successes: s.successes,
          errors:    s.errors,
          avgMs:     s.calls > 0 ? Math.round(s.totalMs / s.calls) : 0,
        }))
    )
  }
}

// ─── RequestLogger ────────────────────────────────────────────────────────────

/**
 * Logger scopé à une requête HTTP.
 * Toutes les méthodes lisent/écrivent dans l'AsyncLocalStorage courant.
 *
 * Usage dans les services — UNIQUEMENT section/step, jamais db/success/error manuels :
 *
 *   slog.section("Chargement du catalogue stock")
 *   slog.step("Récupération du catalogue produit")
 *   const produits = await prisma.produitCatalogue.findMany(...)
 *   // Prisma logue automatiquement [DB] + durée + lignes
 *
 * Ne jamais appeler slog.db(), slog.success(), etc. dans le code métier.
 * Ces méthodes existent pour des cas spéciaux uniquement.
 */
export class RequestLogger {
  constructor(
    private readonly core: PejaServerLogger,
    public readonly requestId: string,
  ) {}

  /**
   * Déclare une section fonctionnelle.
   * Réinitialise step à null automatiquement.
   *
   * Règle : déclarer la section AVANT les appels Prisma qu'elle couvre.
   */
  section(title: string): void {
    updateRequestContext({ section: title, step: null })
    this.emit(fmtSection(title))
  }

  /**
   * Déclare une étape dans la section courante.
   * Reste actif jusqu'au prochain step ou section.
   *
   * Règle : déclarer le step JUSTE AVANT l'appel Prisma concerné.
   * Ne pas déclarer un step trop tôt si du code non lié s'exécute entre-deux.
   */
  step(label: string): void {
    updateRequestContext({ step: label })
    this.emit([fmtStep(label)])
  }

  // ── Bornes de requête HTTP ────────────────────────────────────────────────

  requestStart(route: string): void {
    const ctx = getRequestContext()
    this.emit(fmtRequestStart(this.requestId, ctx?.route ?? route))
  }

  requestEnd(durationMs: number, ok: boolean): void {
    this.emit(fmtRequestEnd(this.requestId, durationMs, ok))
  }

  // ── Messages libres (pour les routes, pas les services) ───────────────────

  info(message: string): void {
    this.emit([`   ℹ ${message}`])
  }

  warning(message: string): void {
    this.emit([`   ⚠ ${message}`])
  }

  error(message: string, err?: unknown): void {
    this.emit(fmtErrorBlock({
      title:      message,
      errorType:  err ? extractType(err) : undefined,
      prismaCode: err ? extractCode(err) : undefined,
      message:    err ? extractMsg(err)  : undefined,
    }), true)
  }

  // ── Opération chronométrée (usage rare — Prisma suffit généralement) ──────

  /**
   * Démarre une opération avec chronomètre manuel.
   * À utiliser UNIQUEMENT pour des opérations non-Prisma (appel HTTP externe, calcul lourd).
   * Ne pas l'utiliser pour envelopper des appels Prisma — Prisma se chronomètre tout seul.
   */
  operation(label: string): OperationHandle {
    const start = performance.now()
    this.emit([fmtStep(label)])

    return {
      success: (meta) => {
        const ms      = performance.now() - start
        const count   = meta?.count as number | undefined
        const isSlow  = ms >= this.core.config.slowOperationMs
        const isLarge = count !== undefined && count >= this.core.config.largeResultCount

        const lines = [fmtDbResult(ms, true, count)]
        if (isSlow)  lines.push(fmtSlow(ms))
        if (isLarge) lines.push(fmtLarge(count!))
        this.emit(lines)
        this.core.metrics.record(label, true, ms)
      },
      failure: (err) => {
        const ms = performance.now() - start
        this.emit([
          fmtDbResult(ms, false),
          ...fmtErrorBlock({
            title: label, durationMs: ms,
            errorType:  extractType(err),
            prismaCode: extractCode(err),
            message:    extractMsg(err),
          }),
        ], true)
        this.core.metrics.record(label, false, ms)
      },
    }
  }

  private emit(lines: string[], isError = false): void {
    this.core.emit(lines, isError)
  }
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export class PejaServerLogger {
  readonly config:  ServerLoggerConfig
  readonly session: LogSession
  readonly metrics: Metrics
  readonly httpMetrics: HttpMetrics
  private readonly writer: AsyncWriter

  constructor() {
    this.config = loadConfig()

    if (this.config.enabled) {
      this.session = createSession(this.config)
    } else {
      this.session = {
        startedAt: new Date().toISOString(),
        sessionDir: '', sessionLogPath: '', errorsLogPath: '',
        metricsJsonPath: '', environment: process.env.NODE_ENV ?? 'production',
      }
    }

    this.writer      = new AsyncWriter()
    this.writer.setSession(this.session)
    this.metrics     = new Metrics(this.config, (lines) => this.emit(lines))
    this.httpMetrics = new HttpMetrics(this.config, (lines) => this.emit(lines))

    if (this.config.enabled) {
      const shutdown = () => {
        this.writer.writeMetrics(JSON.stringify({
          db:   this.metrics.toJSON(),
          http: this.httpMetrics.toJSON(),
        }, null, 2))
        this.writer.flushSync()
      }
      process.once('beforeExit', shutdown)
      process.once('SIGTERM',    shutdown)
    }
  }

  emit(lines: string[], isError = false): void {
    if (!this.config.enabled) return
    this.writer.writeSession(lines)
    this.writer.writeConsole(lines)
    if (isError) this.writer.writeErrors(lines)
  }

  /**
   * Crée un logger scopé à une requête ET initialise le contexte ALS.
   * Utilisé par withAuth — pas besoin de l'appeler ailleurs.
   */
  forRequest(route = 'unknown', requestId?: string): {
    logger: RequestLogger
    run: <T>(fn: () => T) => T
  } {
    const id     = requestId ?? makeRequestId()
    const ctx    = makeRequestContext({ requestId: id, route })
    const logger = new RequestLogger(this, id)
    return {
      logger,
      run: <T>(fn: () => T) => withRequestContext(ctx, fn),
    }
  }

  /** Logger sans contexte ALS (crons, scripts, jobs) */
  get global(): RequestLogger {
    return new RequestLogger(this, 'global')
  }

  printSummary(): void {
    this.emit(this.metrics.summaryLines())
    this.writer.writeMetrics(JSON.stringify({
      db:   this.metrics.toJSON(),
      http: this.httpMetrics.toJSON(),
    }, null, 2))
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

const g = globalThis as unknown as { __pejaLogger?: PejaServerLogger }
export const serverLogger: PejaServerLogger = g.__pejaLogger ?? new PejaServerLogger()
if (process.env.NODE_ENV !== 'production') g.__pejaLogger = serverLogger

// ─── Extraction d'erreur ─────────────────────────────────────────────────────

function extractMsg(err: unknown): string {
  if (!err) return ''
  const msg = err instanceof Error ? err.message : String(err)
  return msg
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
