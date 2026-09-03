/**
 * Formatter PEJAA — rendu texte lisible par un humain.
 * Aucune dépendance externe.
 */

const W = 56 // largeur des séparateurs

export const LINE = '═'.repeat(W)

// ─── Sections métier ─────────────────────────────────────────────────────────

export function fmtSection(title: string): string[] {
  const inner = ` ${title} `
  const pad = Math.max(0, W - inner.length)
  const l = Math.floor(pad / 2)
  const r = pad - l
  return ['', `${'═'.repeat(l)}${inner}${'═'.repeat(r)}`, '']
}

// ─── Étapes / sous-étapes ────────────────────────────────────────────────────

export function fmtStep(label: string, depth = 0): string {
  return `${ind(depth)}→ ${label}`
}

export function fmtDb(operation: string, depth = 0): string {
  return `${ind(depth + 1)}[DB] ${operation}`
}

export function fmtApi(method: string, path: string, depth = 0): string {
  return `${ind(depth + 1)}[API] ${method.toUpperCase()} ${path}`
}

// ─── Résultats ───────────────────────────────────────────────────────────────

export function fmtSuccess(
  durationMs: number,
  opts: { count?: number; status?: number; depth?: number } = {}
): string[] {
  const d = opts.depth ?? 0
  const lines = [`${ind(d + 1)}✓ Succès`]
  if (opts.status !== undefined) lines.push(`${ind(d + 1)}Status : ${opts.status}`)
  if (opts.count !== undefined)  lines.push(`${ind(d + 1)}Résultat : ${fmt(opts.count)} ligne${opts.count !== 1 ? 's' : ''}`)
  lines.push(`${ind(d + 1)}Durée : ${fmtMs(durationMs)}`)
  return lines
}

export function fmtFailure(
  durationMs: number,
  opts: { status?: number; depth?: number } = {}
): string[] {
  const d = opts.depth ?? 0
  const lines = [`${ind(d + 1)}✗ Échec`]
  if (opts.status !== undefined) lines.push(`${ind(d + 1)}Status : ${opts.status}`)
  lines.push(`${ind(d + 1)}Durée : ${fmtMs(durationMs)}`)
  return lines
}

export function fmtSlow(durationMs: number, depth = 0): string {
  return `${ind(depth + 1)}⚠ Opération lente — ${fmtMs(durationMs)}`
}

export function fmtLarge(count: number, depth = 0): string {
  return `${ind(depth + 1)}⚠ Volume important — ${fmt(count)} lignes`
}

export function fmtWarn(msg: string, depth = 0): string {
  return `${ind(depth)}⚠ ${msg}`
}

export function fmtInfo(msg: string, depth = 0): string {
  return `${ind(depth)}ℹ ${msg}`
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
  if (params.operation)   lines.push(`Opération : ${params.operation}`, '')
  if (params.durationMs !== undefined) lines.push(`Durée : ${fmtMs(params.durationMs)}`, '')
  if (params.errorType)   lines.push(`Type : ${params.errorType}`, '')
  if (params.prismaCode)  lines.push(`Code Prisma : ${params.prismaCode}`, '')
  if (params.message)     lines.push(`Message : ${params.message}`, '')
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
  const bar = `${'═'.repeat(8)} API SUMMARY ${'═'.repeat(W - 21)}`
  const lines: string[] = ['', bar, '']
  for (const e of entries) {
    lines.push(
      e.key,
      `${ind(1)}Calls   : ${e.calls}`,
      `${ind(1)}Success : ${e.successes}`,
      `${ind(1)}Errors  : ${e.errors}`,
      `${ind(1)}Average : ${fmtMs(e.avgMs)}`,
      ''
    )
  }
  return lines
}

export function fmtRepetition(key: string, calls: number, windowMs: number): string[] {
  const sec = (windowMs / 1000).toFixed(1)
  return [
    '',
    `⚠ APPELS RÉPÉTITIFS DÉTECTÉS`,
    '',
    `${ind(1)}${key}`,
    `${ind(1)}${calls} appels en ${sec} seconde${parseFloat(sec) > 1 ? 's' : ''}`,
    `${ind(1)}(absence de cache, useEffect instable, composant remonté, etc.)`,
    '',
  ]
}

// ─── Requête HTTP ────────────────────────────────────────────────────────────

export function fmtRequestStart(reqId: string, method: string, path: string): string[] {
  return ['', `[${reqId}] → ${method.toUpperCase()} ${path}`]
}

export function fmtRequestEnd(reqId: string, durationMs: number, ok: boolean): string[] {
  return [
    `[${reqId}] ${ok ? '✓' : '✗'} Terminée — ${fmtMs(durationMs)}`,
    '',
  ]
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function ind(n: number): string {
  return '   '.repeat(n)
}

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
