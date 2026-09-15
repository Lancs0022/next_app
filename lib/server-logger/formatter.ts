/**
 * Formatter PEJAA — rendu texte lisible par un humain.
 * Aucune dépendance externe.
 *
 * Niveaux d'indentation fixes (pas de compteur depth) :
 *   Section   →  "▶ Titre"          ou "▸ Auth" (section technique)
 *   Step      →  "  → label"
 *   DB        →  "     [DB] model.op"
 *   Résultat  →  "     ✓ 18 ms · 24 lignes"
 */

const W = 56 // largeur des séparateurs

export const LINE = '═'.repeat(W)

// ─── Niveaux d'indentation fixes ─────────────────────────────────────────────

const STEP_PREFIX   = '  → '           // 2 espaces + flèche
const DB_INDENT     = '     '          // 5 espaces
const RESULT_INDENT = '     '          // 5 espaces (aligné avec [DB])

// ─── Section ─────────────────────────────────────────────────────────────────

/**
 * Header de section métier (▶) ou technique (▸ pour "Auth").
 * section("Auth") → ▸ Auth
 * section("Chargement stock") → ▶ Chargement stock
 */
export function fmtSection(title: string): string[] {
  const symbol = title === 'Auth' ? '▸' : '▶'
  return ['', `${symbol} ${title}`, '']
}

// ─── Step ─────────────────────────────────────────────────────────────────────

export function fmtStep(label: string): string {
  return `${STEP_PREFIX}${label}`
}

// ─── DB (produit par Prisma $allOperations) ───────────────────────────────────

/**
 * Ligne [DB] avec requestId et indentation — affichée pour toutes les opérations.
 *
 * Format :
 *   [req_k6nyfk]      [DB] ProduitCatalogue.findMany
 *
 * Le contexte complet (section, step) est disponible dans les alertes répétition
 * et dans metrics.json — pas besoin de le répéter sur chaque ligne DB.
 */
export function fmtDbWithContext(
  operation: string,
  ctx: { requestId: string; route: string; section: string | null; step: string | null } | null,
): string[] {
  const reqTag = ctx ? `[${ctx.requestId}]` : '[hors-req]'
  return [`${reqTag}${DB_INDENT}[DB] ${operation}`]
}

/** Ligne [DB] simple sans contexte (fallback hors-requête) */
export function fmtDb(operation: string): string {
  return `${DB_INDENT}[DB] ${operation}`
}

// ─── Résultats DB ─────────────────────────────────────────────────────────────

/**
 * Résultat compact sur une ligne : ✓ 18 ms · 24 lignes
 */
export function fmtDbResult(
  durationMs: number,
  ok: boolean,
  count?: number,
): string {
  const status = ok ? '✓' : '✗'
  let line = `${RESULT_INDENT}${status} ${fmtMs(durationMs)}`
  if (count !== undefined) line += ` · ${fmt(count)} ligne${count !== 1 ? 's' : ''}`
  return line
}

export function fmtSlow(durationMs: number): string {
  return `${RESULT_INDENT}⚠ Opération lente — ${fmtMs(durationMs)}`
}

export function fmtLarge(count: number): string {
  return `${RESULT_INDENT}⚠ Volume important — ${fmt(count)} lignes`
}

// ─── Bornes de requête HTTP ───────────────────────────────────────────────────

export function fmtRequestStart(reqId: string, route: string): string[] {
  return ['', `[${reqId}] → ${route}`]
}

export function fmtRequestEnd(reqId: string, durationMs: number, ok: boolean): string[] {
  return [`${ok ? '✓' : '✗'} [${reqId}] terminée · ${fmtMs(durationMs)}`, '']
}

// ─── Bloc erreur ─────────────────────────────────────────────────────────────

export function fmtErrorBlock(params: {
  title: string
  operation?: string
  durationMs?: number
  errorType?: string
  prismaCode?: string
  message?: string
}): string[] {
  const half = Math.floor((W - 9) / 2)
  const bar = `${'═'.repeat(half)} ERROR ${'═'.repeat(W - half - 7)}`
  const lines: string[] = ['', bar, '', params.title, '']
  if (params.operation)            lines.push(`Opération : ${params.operation}`, '')
  if (params.durationMs !== undefined) lines.push(`Durée : ${fmtMs(params.durationMs)}`, '')
  if (params.errorType)            lines.push(`Type : ${params.errorType}`, '')
  if (params.prismaCode)           lines.push(`Code Prisma : ${params.prismaCode}`, '')
  if (params.message)              lines.push(`Message : ${params.message}`, '')
  lines.push(LINE, '')
  return lines
}

// ─── Bannière de session ─────────────────────────────────────────────────────

export function fmtSessionBanner(startedAt: string, env: string): string[] {
  return [
    LINE,
    'PEJAA SERVER SESSION',
    `Démarré     : ${startedAt}`,
    `Environnement : ${env}`,
    LINE,
    '',
  ]
}

// ─── Résumé métriques ────────────────────────────────────────────────────────

export function fmtSummary(entries: Array<{
  key: string; calls: number; successes: number; errors: number; avgMs: number
}>): string[] {
  if (entries.length === 0) return []
  const bar = `${'═'.repeat(8)} SUMMARY ${'═'.repeat(W - 17)}`
  const lines: string[] = ['', bar, '']
  for (const e of entries) {
    lines.push(
      e.key,
      `   Calls   : ${e.calls}`,
      `   Success : ${e.successes}`,
      `   Errors  : ${e.errors}`,
      `   Average : ${fmtMs(e.avgMs)}`,
      ''
    )
  }
  return lines
}

/**
 * Alerte répétition V3 — opérations Prisma répétitives.
 *
 * Distingue :
 *   Cas A — même requestId plusieurs fois → boucle dans une seule requête
 *   Cas B — requestIds différents → N requêtes distinctes
 *
 * Format cas B : groupé par route d'abord, pour répondre directement à
 * "est-ce la même fonctionnalité qui appelle plusieurs fois, ou plusieurs
 * fonctionnalités différentes ?"
 */
export function fmtRepetitionV3(
  key: string,
  windowMs: number,
  records: Array<{ requestId: string; route: string; section: string | null; step: string | null }>,
): string[] {
  const sec        = (windowMs / 1000).toFixed(1)
  const calls      = records.length
  const uniqueReqs = new Set(records.map(r => r.requestId))
  const isCaseA    = uniqueReqs.size === 1

  const lines: string[] = [
    '',
    `⚠ APPELS RÉPÉTITIFS — ${key} — ${calls} appels en ${sec} s`,
    '',
  ]

  if (isCaseA) {
    // Cas A : même requête qui boucle
    const r = records[0]
    lines.push(`   Même requête : ${r.requestId} → ${r.route}`)
    lines.push(`   → ${r.section ?? '(aucun contexte métier)'} (×${calls})`)
  } else {
    // Cas B : groupé par route pour montrer la répartition fonctionnelle
    const byRoute = new Map<string, Array<{ requestId: string; section: string | null; step: string | null }>>()
    for (const r of records) {
      const bucket = byRoute.get(r.route) ?? []
      bucket.push({ requestId: r.requestId, section: r.section, step: r.step })
      byRoute.set(r.route, bucket)
    }

    for (const [route, entries] of byRoute.entries()) {
      lines.push(`   ${route} → ${entries.length} appel${entries.length > 1 ? 's' : ''}`)
      // Si toutes les entrées de cette route ont un contexte métier, l'afficher
      const sections = [...new Set(entries.map(e => e.section).filter(Boolean))]
      if (sections.length > 0) {
        for (const s of sections) lines.push(`      ↳ ${s}`)
      }
      // Si plusieurs requestIds distincts → liste compacte
      const reqIds = [...new Set(entries.map(e => e.requestId))]
      if (reqIds.length > 1) {
        lines.push(`      (${reqIds.join(', ')})`)
      } else {
        lines.push(`      (${reqIds[0]})`)
      }
    }
  }

  lines.push('')
  return lines
}

/**
 * Alerte répétition HTTP — requêtes HTTP identiques répétées.
 *
 * Séparée de fmtRepetitionV3 car les deux diagnostics ont des responsabilités
 * distinctes : HTTP mesure les appels entrants, Prisma mesure les opérations DB.
 *
 * Format :
 *   ⚠ REQUÊTES HTTP RÉPÉTÉES — GET /api/points-de-vente — 5 appels en 2.0 s
 *      req_a1b  req_c3d  req_e5f  req_g7h  req_i9j
 */
export function fmtRepetitionHttp(
  route: string,
  records: Array<{ requestId: string; timestamp: number }>,
  windowMs: number,
): string[] {
  const sec   = (windowMs / 1000).toFixed(1)
  const calls = records.length
  const ids   = records.map(r => r.requestId).join('  ')

  return [
    '',
    `⚠ REQUÊTES HTTP RÉPÉTÉES — ${route} — ${calls} appels en ${sec} s`,
    `   ${ids}`,
    '',
  ]
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

export function fmtMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

export function fmtTimestamp(d = new Date()): string {
  return d.toISOString().replace('T', ' ').slice(0, 23)
}

export function makeRequestId(): string {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return 'req_' + Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}
