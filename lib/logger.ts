/**
 * Logger verbeux côté client — Pejaa
 *
 * Deux canaux :
 *  - logAction(label, detail?)  → trace les clics / actions UI
 *  - logApi(method, url, status?, durationMs?)  → trace les appels réseau
 *
 * En dev : affiche dans la console avec couleurs et préfixe.
 * En prod : no-op silencieux par défaut (évite de polluer les logs Vercel).
 *
 * Pour activer en prod (debug ponctuel) :
 *   localStorage.setItem('pejaa_verbose', '1')
 */

type LogLevel = 'action' | 'api' | 'warn' | 'error'

function isVerbose(): boolean {
  if (typeof window === 'undefined') return false
  if (process.env.NODE_ENV === 'development') return true
  try {
    return localStorage.getItem('pejaa_verbose') === '1'
  } catch {
    return false
  }
}

const COLORS: Record<LogLevel, string> = {
  action: '#10b981', // vert émeraude
  api:    '#6366f1', // indigo
  warn:   '#f59e0b', // ambre
  error:  '#ef4444', // rouge
}

function emit(level: LogLevel, message: string, data?: unknown) {
  if (!isVerbose()) return
  const time = new Date().toISOString().slice(11, 23) // HH:mm:ss.mmm
  const color = COLORS[level]
  const prefix = `%c[PEJAA:${level.toUpperCase()}] ${time}`
  if (data !== undefined) {
    console.log(prefix, `color:${color};font-weight:bold`, message, data)
  } else {
    console.log(prefix, `color:${color};font-weight:bold`, message)
  }
}

/** Trace un clic / action utilisateur (bouton, submit, navigation, etc.) */
export function logAction(label: string, detail?: unknown) {
  emit('action', `🖱 ${label}`, detail)
}

/** Trace un appel réseau sortant */
export function logApi(
  method: string,
  url: string,
  status?: number,
  durationMs?: number
) {
  const statusTag = status !== undefined
    ? status >= 400
      ? `❌ ${status}`
      : `✅ ${status}`
    : '⏳ pending'
  const timing = durationMs !== undefined ? ` (${durationMs}ms)` : ''
  const level: LogLevel = status !== undefined && status >= 400 ? 'error' : 'api'
  emit(level, `${method.toUpperCase()} ${url} → ${statusTag}${timing}`)
}

/** Trace un avertissement libre */
export function logWarn(message: string, data?: unknown) {
  emit('warn', `⚠ ${message}`, data)
}

/** Trace une erreur libre */
export function logError(message: string, data?: unknown) {
  emit('error', `✖ ${message}`, data)
}
