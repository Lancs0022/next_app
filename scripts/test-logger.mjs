/**
 * Script de test autonome du logger serveur PEJAA.
 * Exécute sans Next.js — teste directement les modules Node.js.
 *
 * Usage : node --experimental-vm-modules scripts/test-logger.mjs
 *   ou  : npx tsx scripts/test-logger.mjs
 */

// Simulation des variables d'environnement
process.env.NODE_ENV = 'development'
process.env.PEJAA_LOGGER_ENABLED = 'true'
process.env.PEJAA_LOG_SLOW_OPERATION_MS = '50'      // seuil bas pour le test
process.env.PEJAA_LOG_LARGE_RESULT_COUNT = '3'       // seuil bas pour le test
process.env.PEJAA_LOG_REPETITION_THRESHOLD = '4'     // seuil bas pour le test
process.env.PEJAA_LOG_REPETITION_WINDOW_MS = '1000'
process.env.PEJAA_LOGS_DIR = 'logs'

// Import dynamique car le module utilise des imports ES/CJS selon le contexte
const { createRequire } = await import('module')
const { pathToFileURL } = await import('url')
const { resolve } = await import('path')

// On importe via tsx/ts-node ou directement si compilé
// Pour ce test on utilise les fichiers .ts via tsx
import { register } from 'node:module'

// Fallback : importer directement si tsx est disponible
let serverLogger, slog, fmtSection, fmtStep, fmtSuccess, fmtMs

try {
  const loggerMod = await import('../lib/server-logger/logger.ts')
  serverLogger = loggerMod.serverLogger

  const fmtMod = await import('../lib/server-logger/formatter.ts')
  fmtSection = fmtMod.fmtSection
  fmtStep = fmtMod.fmtStep
  fmtSuccess = fmtMod.fmtSuccess
  fmtMs = fmtMod.fmtMs
} catch (e) {
  console.error('Import failed:', e.message)
  console.error('Utiliser : npx tsx scripts/test-logger.mjs')
  process.exit(1)
}

const logger = serverLogger.forRequest('req_test01')

console.log('\n=== Test du logger serveur PEJAA ===\n')

// ── Cas 1 : section + étapes ────────────────────────────────────────────────
logger.requestStart('GET', '/api/test')
logger.section("Préparation pour l'annulation de vente")
logger.step('Récupération des ventes')

// Simule une opération de 25ms
const op1 = logger.operation('Lecture DB ventes', { dbOperation: 'vente.findMany' })
await new Promise(r => setTimeout(r, 25))
op1.success({ count: 24 })

logger.step('Récupération des articles')
const op2 = logger.operation('Lecture DB articles', { dbOperation: 'venteArticle.findMany' })
await new Promise(r => setTimeout(r, 15))
op2.success({ count: 87 })

// ── Cas 2 : opération lente ─────────────────────────────────────────────────
logger.section('Test opération lente')
const opSlow = logger.operation('Requête lente', { dbOperation: 'vente.findMany' })
await new Promise(r => setTimeout(r, 75)) // > seuil 50ms
opSlow.success({ count: 12482 }) // > seuil 3 lignes → double alerte

// ── Cas 3 : erreur ──────────────────────────────────────────────────────────
logger.section('Test erreur')
const opErr = logger.operation('Opération échouée', { dbOperation: 'produit.create' })
await new Promise(r => setTimeout(r, 5))
opErr.failure(new Error('PEJAA_TEST_ERROR: contrainte unique violée'))

// ── Cas 4 : appels répétitifs ───────────────────────────────────────────────
logger.section('Test répétition')
for (let i = 0; i < 5; i++) {
  serverLogger.metrics.record('GET /api/unites-mesure', true, 12)
}
// 5ème appel déclenche l'alerte (seuil = 4)

// ── Cas 5 : info / warning ──────────────────────────────────────────────────
logger.info('Traitement terminé')
logger.warning('Volume de données à surveiller')

// ── Résumé ──────────────────────────────────────────────────────────────────
await new Promise(r => setTimeout(r, 100)) // laisse le setImmediate se vider
serverLogger.printSummary()
logger.requestEnd(250, true)

// Flush final
await new Promise(r => setTimeout(r, 200))
serverLogger['writer'].flushSync()

const sessionDir = serverLogger.session.sessionDir
console.log(`\n✓ Session créée dans : ${sessionDir}`)
console.log('  → session.log')
console.log('  → errors.log')
console.log('  → metrics.json')
