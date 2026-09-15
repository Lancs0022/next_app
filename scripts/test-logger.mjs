/**
 * Script de test du logger serveur PEJAA — contexte + concurrence.
 * Usage : npx tsx scripts/test-logger.mjs
 */

process.env.NODE_ENV                       = 'development'
process.env.PEJAA_LOGGER_ENABLED           = 'true'
process.env.PEJAA_LOG_SLOW_OPERATION_MS    = '60'
process.env.PEJAA_LOG_LARGE_RESULT_COUNT   = '5'
process.env.PEJAA_LOG_REPETITION_THRESHOLD = '3'
process.env.PEJAA_LOG_REPETITION_WINDOW_MS = '1500'
process.env.PEJAA_LOGS_DIR                 = 'logs'

const { serverLogger } = await import('../lib/server-logger/logger.ts')
const { withRequestContext, makeRequestContext, contextLabel } =
  await import('../lib/server-logger/context.ts')

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simule une opération DB avec durée configurable et résultat tableau */
async function fakeDb(ms, rows = 1) {
  await new Promise(r => setTimeout(r, ms))
  return Array.from({ length: rows }, (_, i) => ({ id: i + 1 }))
}

/** Simule une erreur DB */
async function fakeDbError(ms) {
  await new Promise(r => setTimeout(r, ms))
  const err = new Error('contrainte unique violée')
  err.code = 'P2002'
  throw err
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 : contexte métier + [DB] rattaché automatiquement
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n════ TEST 1 : contexte métier ════\n')

const { logger: l1, run: run1 } = serverLogger.forRequest('GET /api/ventes/annulation')

await run1(async () => {
  l1.requestStart('GET', '/api/ventes/annulation')

  l1.section("Préparation pour l'annulation de vente")

  // Étape 1 — succès normal
  l1.step('Récupération des ventes')
  const op1 = l1.operation('Lecture ventes', { dbOperation: 'Vente.findMany' })
  const ventes = await fakeDb(25, 24)
  op1.success({ count: ventes.length })

  // Étape 2 — succès avec volume important (> seuil 5)
  l1.step('Récupération des articles')
  const op2 = l1.operation('Lecture articles', { dbOperation: 'VenteArticle.findMany' })
  const articles = await fakeDb(15, 87)
  op2.success({ count: articles.length })

  // Étape 3 — opération lente (> seuil 60ms)
  l1.section('Vérification stock')
  l1.step('Lecture stock actuel')
  const op3 = l1.operation('Stock', { dbOperation: 'StockActuel.findMany' })
  const stock = await fakeDb(80, 3)
  op3.success({ count: stock.length })

  // Étape 4 — erreur
  l1.section('Finalisation')
  l1.step("Enregistrement de l'annulation")
  const op4 = l1.operation("Création annulation", { dbOperation: 'Vente.update' })
  try {
    await fakeDbError(10)
    op4.success()
  } catch (err) {
    op4.failure(err)
  }

  l1.requestEnd(180, false)
})

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 : isolation concurrente A / B
// Les deux flux s'exécutent en parallèle — les contextes ne doivent pas fuir.
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n════ TEST 2 : isolation concurrente A/B ════\n')

const { logger: lA, run: runA } = serverLogger.forRequest('GET /api/ventes')
const { logger: lB, run: runB } = serverLogger.forRequest('POST /api/livraisons')

// Démarre A et B en parallèle — leurs sections/steps ne doivent pas se mélanger
await Promise.all([

  runA(async () => {
    lA.requestStart('GET', '/api/ventes')
    lA.section('Annulation de vente')

    lA.step('Récupération des ventes')
    const opA1 = lA.operation('Ventes', { dbOperation: 'Vente.findMany' })
    // Délai plus long → B va s'intercaler
    const ventesA = await fakeDb(50, 12)
    opA1.success({ count: ventesA.length })

    lA.step('Récupération des collaborateurs')
    const opA2 = lA.operation('Collabs', { dbOperation: 'Collaborateur.findMany' })
    const collabs = await fakeDb(20, 3)
    opA2.success({ count: collabs.length })

    lA.requestEnd(90, true)

    // Vérification : le contexte de A doit contenir la route de A
    const ctx = (await import('../lib/server-logger/context.ts')).getRequestContext()
    const label = contextLabel(ctx)
    const ok = label.includes('GET /api/ventes')
    console.log(`[ISOLATION] A contexte OK : ${ok} — label="${label}"`)
    if (!ok) process.exitCode = 1
  }),

  runB(async () => {
    lB.requestStart('POST', '/api/livraisons')
    lB.section('Création de livraison')

    lB.step('Récupération des lots disponibles')
    const opB1 = lB.operation('Lots', { dbOperation: 'LivraisonItem.findMany' })
    const lots = await fakeDb(30, 7)
    opB1.success({ count: lots.length })

    lB.step('Vérification utilisateur')
    const opB2 = lB.operation('Utilisateur', { dbOperation: 'Utilisateur.findUnique' })
    const user = await fakeDb(15, 1)
    opB2.success({ count: user.length })

    lB.requestEnd(60, true)

    // Vérification : le contexte de B doit contenir la route de B
    const ctx = (await import('../lib/server-logger/context.ts')).getRequestContext()
    const label = contextLabel(ctx)
    const ok = label.includes('POST /api/livraisons')
    console.log(`[ISOLATION] B contexte OK : ${ok} — label="${label}"`)
    if (!ok) process.exitCode = 1
  }),

])

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 : répétitions avec répartition par contexte
// Même opération appelée depuis deux contextes différents
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n════ TEST 3 : répétitions avec contextes ════\n')

// Contexte Auth (2 appels)
for (let i = 0; i < 2; i++) {
  serverLogger.metrics.record('Utilisateur.findUnique', true, 8,
    'GET /api/stock › Auth / vérification utilisateur')
}

// Contexte Création lot (1 appel)
serverLogger.metrics.record('Utilisateur.findUnique', true, 12,
  'POST /api/lots › Création lot › Identification créateur')

// Déclenchement de l'alerte (seuil = 3)
serverLogger.metrics.record('Utilisateur.findUnique', true, 9,
  'GET /api/collaborateurs › Chargement profil')

// ─────────────────────────────────────────────────────────────────────────────
// Résumé + flush
// ─────────────────────────────────────────────────────────────────────────────

await new Promise(r => setTimeout(r, 300))
serverLogger.printSummary()
await new Promise(r => setTimeout(r, 300))

const sessionDir = serverLogger.session.sessionDir
console.log(`\n✓ Session : ${sessionDir}`)
console.log(`  → session.log\n  → errors.log\n  → metrics.json`)
if (process.exitCode === 1) {
  console.error('\n✗ ÉCHEC : isolation des contextes incorrecte')
} else {
  console.log('\n✓ Isolation A/B correcte')
}
