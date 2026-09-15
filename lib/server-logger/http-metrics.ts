/**
 * HttpMetrics — métriques de répétition des requêtes HTTP.
 *
 * Séparé de context.ts et de logger.ts pour respecter la séparation des
 * responsabilités :
 *   context.ts    → ALS, get/update context, metadata
 *   http-metrics  → observation des requêtes HTTP, fenêtre glissante, alertes
 *   logger.ts     → métriques Prisma, writer, session
 *
 * Principe : withAuth enregistre chaque requête entrante ici.
 * Si la même route est appelée N fois dans la fenêtre temporelle,
 * une alerte est émise dans le log.
 *
 * Le logger rapporte des faits (N appels, liste des requestIds).
 * Il ne conclut pas qu'une répétition est un bug.
 */

import type { HttpCallRecord, ServerLoggerConfig } from './types'
import { fmtRepetitionHttp } from './formatter'

export class HttpMetrics {
  // Clé : "METHOD /path" — valeur : enregistrements dans la fenêtre courante
  private readonly map     = new Map<string, HttpCallRecord[]>()
  private readonly alerted = new Set<string>()

  constructor(
    private readonly config: Pick<ServerLoggerConfig, 'repetitionWindowMs' | 'repetitionThreshold'>,
    private readonly onAlert: (lines: string[]) => void,
  ) {}

  /**
   * Enregistre une requête HTTP.
   * À appeler dans withAuth au début de chaque requête.
   *
   * @param requestId  identifiant unique de la requête
   * @param route      "METHOD /path" (ex: "GET /api/stock/catalogue")
   */
  record(requestId: string, route: string): void {
    const now    = Date.now()
    const cutoff = now - this.config.repetitionWindowMs

    let records = this.map.get(route) ?? []

    // Purge les enregistrements hors fenêtre
    records = records.filter(r => r.timestamp >= cutoff)
    records.push({ requestId, route, timestamp: now })
    this.map.set(route, records)

    // Alerte si seuil atteint (une seule par route par fenêtre)
    if (records.length >= this.config.repetitionThreshold && !this.alerted.has(route)) {
      this.alerted.add(route)

      // Snapshot au moment de l'alerte
      this.onAlert(fmtRepetitionHttp(route, records.slice(), this.config.repetitionWindowMs))

      // Réarme après la fenêtre
      setTimeout(() => this.alerted.delete(route), this.config.repetitionWindowMs)
    }
  }

  /**
   * Sérialise les métriques HTTP pour le résumé de session.
   */
  toJSON(): object {
    const routes: Array<{
      route: string
      calls: number
      requestIds: string[]
    }> = []

    for (const [route, records] of this.map.entries()) {
      routes.push({
        route,
        calls: records.length,
        requestIds: records.map(r => r.requestId),
      })
    }

    return {
      routes: routes.sort((a, b) => b.calls - a.calls),
    }
  }
}
