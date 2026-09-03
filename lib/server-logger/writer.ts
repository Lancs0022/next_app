/**
 * Writer — écriture asynchrone non-bloquante.
 *
 * File d'événements en mémoire + drain via setImmediate.
 * Pas de Worker Thread : inutilement complexe pour ce volume.
 */

import fs from 'fs'
import path from 'path'
import type { LogSession, ServerLoggerConfig } from './types'
import { fmtSessionBanner, fmtTimestamp, LINE } from './formatter'

// ─── Création de session ──────────────────────────────────────────────────────

export function createSession(config: ServerLoggerConfig): LogSession {
  const now = new Date()
  const startedAt = fmtTimestamp(now)

  // "2026-09-02_15-42-17"
  const folder = now.toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19)
  const sessionDir = path.join(config.logsDir, folder)

  fs.mkdirSync(sessionDir, { recursive: true })

  const session: LogSession = {
    startedAt,
    sessionDir,
    sessionLogPath: path.join(sessionDir, 'session.log'),
    errorsLogPath:  path.join(sessionDir, 'errors.log'),
    metricsJsonPath: path.join(sessionDir, 'metrics.json'),
    environment: process.env.NODE_ENV ?? 'development',
  }

  // Écriture synchrone acceptable ici : se produit une seule fois au démarrage
  const banner = fmtSessionBanner(startedAt, session.environment)
  fs.writeFileSync(session.sessionLogPath, banner.join('\n') + '\n', 'utf8')
  fs.writeFileSync(session.errorsLogPath, `${LINE}\nPEJAA ERRORS — session ${startedAt}\n${LINE}\n\n`, 'utf8')

  return session
}

// ─── Writer asynchrone ────────────────────────────────────────────────────────

interface WriteJob { filePath: string; content: string }

export class AsyncWriter {
  private readonly queue: WriteJob[] = []
  private draining = false
  private session: LogSession | null = null

  setSession(s: LogSession): void { this.session = s }

  writeSession(lines: string[]): void {
    if (this.session) this.enqueue(this.session.sessionLogPath, lines.join('\n') + '\n')
  }

  writeErrors(lines: string[]): void {
    if (this.session) this.enqueue(this.session.errorsLogPath, lines.join('\n') + '\n')
  }

  /** Miroir console pour le terminal Next.js en dev */
  writeConsole(lines: string[]): void {
    process.stdout.write(lines.join('\n') + '\n')
  }

  /** metrics.json est toujours écrasé (pas appendé) — on veut le snapshot final */
  writeMetrics(json: string): void {
    if (!this.session) return
    try { fs.writeFileSync(this.session.metricsJsonPath, json, 'utf8') } catch { /* silencieux */ }
  }

  private enqueue(filePath: string, content: string): void {
    this.queue.push({ filePath, content })
    if (!this.draining) {
      this.draining = true
      setImmediate(() => this.drain())
    }
  }

  private drain(): void {
    const batch = this.queue.splice(0, this.queue.length)
    for (const job of batch) {
      try { fs.appendFileSync(job.filePath, job.content, 'utf8') } catch { /* jamais crasher */ }
    }
    if (this.queue.length > 0) {
      setImmediate(() => this.drain())
    } else {
      this.draining = false
    }
  }

  /** Flush synchrone pour SIGTERM / beforeExit */
  flushSync(): void {
    const remaining = this.queue.splice(0, this.queue.length)
    for (const job of remaining) {
      try { fs.appendFileSync(job.filePath, job.content, 'utf8') } catch { /* silencieux */ }
    }
    this.draining = false
  }
}
