/**
 * Test logger V3 — vérification de l'isolation ALS et de la distinction cas A / cas B.
 * Simule exactement le pattern withAuth + 5 requêtes parallèles vers /api/stock/*.
 *
 * Usage : npx tsx scripts/test-logger-v3.mjs
 */

process.env.NODE_ENV                       = 'development'
process.env.PEJAA_LOGGER_ENABLED           = 'true'
process.env.PEJAA_LOG_SLOW_OPERATION_MS    = '200'
process.env.PEJAA_LOG_LARGE_RESULT_COUNT   = '10'
process.env.PEJAA_LOG_REPETITION_THRESHOLD = '4'
process.env.PEJAA_LOG_REPETITION_WINDOW_MS = '3000'
process.env.PEJAA_LOGS_DIR                 = 'logs'

const { serverLogger } = await import('../lib/server-logger/logger.ts')
const { withRequestContext, makeRequestContext } = await import('../lib/server-logger/context.ts')

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fakeDb(ms, rows = 1) {
  await new Promise(r => setTimeout(r, ms))
  return Array.from({ length: rows }, (_, i) => ({ id: i + 1 }))
}

/**
 * Simule withAuth + handler pour une route donnée.
 * Reproduit exactement le pattern réel :
 *   withRequestContext( makeRequestContext({route}) , async () => {
 *     [RBAC Prisma queries]
 *     [handler Prisma queries]
 *   })
 */
async function simulateRequest(route, handlerFn) {
  const { makeRequestId } = await import('../lib/server-logger/formatter.ts')
  const requestId = makeRequestId()
  const ctx = makeRequestContext({ requestId, route })

  return withRequestContext(ctx, async () => {
    // Log de début de requête (comme dans withAuth)
    serverLogger.emit([``, `[${requestId}] → ${route}`])

    // ── RBAC simulé (comme dans withAuth) ─────────────────────────────────
    // Ces opérations apparaissent dans le log AVEC le bon requestId
    serverLogger.metrics.record('Utilisateur.findUnique', true, 8, {
      requestId, route, section: null, step: 'auth:verify-user',
      timestamp: Date.now(), durationMs: 8, ok: true,
    })
    serverLogger.metrics.record('AccessDomain.findFirst', true, 5, {
      requestId, route, section: null, step: 'auth:check-domain',
      timestamp: Date.now(), durationMs: 5, ok: true,
    })
    serverLogger.metrics.record('RoleAccessMatrix.findUnique', true, 4, {
      requestId, route, section: null, step: 'auth:check-matrix',
      timestamp: Date.now(), durationMs: 4, ok: true,
    })

    await new Promise(r => setTimeout(r, 5))

    // ── Handler métier ────────────────────────────────────────────────────
    await handlerFn(requestId)

    serverLogger.emit([`[${requestId}] ✓ Terminée`])
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST A : 5 requêtes parallèles vers la page Stock
// Reproduit exactement ce qu'on observe en prod : 5 endpoints appelés ensemble
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n════ TEST CAS B : 5 requêtes parallèles (page Stock) ════\n')

await Promise.all([

  simulateRequest('GET /api/stock/catalogue', async (reqId) => {
    serverLogger.metrics.record('ProduitCatalogue.findMany', true, 21, {
      requestId: reqId, route: 'GET /api/stock/catalogue',
      section: null, step: null,
      timestamp: Date.now(), durationMs: 21, ok: true,
    })
    const rows = await fakeDb(21, 150)
    serverLogger.emit([`   [DB] ProduitCatalogue.findMany  [${reqId} › GET /api/stock/catalogue]`,
      `      ✓ Succès · ${rows.length} lignes · 21 ms`])
  }),

  simulateRequest('GET /api/collaborateurs', async (reqId) => {
    serverLogger.metrics.record('Collaborateur.findMany', true, 8, {
      requestId: reqId, route: 'GET /api/collaborateurs',
      section: null, step: null,
      timestamp: Date.now(), durationMs: 8, ok: true,
    })
    const rows = await fakeDb(8, 12)
    serverLogger.emit([`   [DB] Collaborateur.findMany  [${reqId} › GET /api/collaborateurs]`,
      `      ✓ Succès · ${rows.length} lignes · 8 ms`])
  }),

  simulateRequest('GET /api/points-de-vente', async (reqId) => {
    serverLogger.metrics.record('PointDeVente.findMany', true, 5, {
      requestId: reqId, route: 'GET /api/points-de-vente',
      section: null, step: null,
      timestamp: Date.now(), durationMs: 5, ok: true,
    })
    const rows = await fakeDb(5, 1)
    serverLogger.emit([`   [DB] PointDeVente.findMany  [${reqId} › GET /api/points-de-vente]`,
      `      ✓ Succès · ${rows.length} ligne · 5 ms`])
  }),

  simulateRequest('GET /api/stock/lots', async (reqId) => {
    serverLogger.metrics.record('LivraisonItem.findMany', true, 18, {
      requestId: reqId, route: 'GET /api/stock/lots',
      section: null, step: null,
      timestamp: Date.now(), durationMs: 18, ok: true,
    })
    const rows = await fakeDb(18, 25)
    serverLogger.emit([`   [DB] LivraisonItem.findMany  [${reqId} › GET /api/stock/lots]`,
      `      ✓ Succès · ${rows.length} lignes · 18 ms`])
  }),

  simulateRequest('GET /api/stock', async (reqId) => {
    serverLogger.metrics.record('StockActuel.findMany', true, 14, {
      requestId: reqId, route: 'GET /api/stock',
      section: null, step: null,
      timestamp: Date.now(), durationMs: 14, ok: true,
    })
    const rows = await fakeDb(14, 20)
    serverLogger.emit([`   [DB] StockActuel.findMany  [${reqId} › GET /api/stock]`,
      `      ✓ Succès · ${rows.length} lignes · 14 ms`])
  }),

])

// ─────────────────────────────────────────────────────────────────────────────
// TEST A : même requête qui appelle plusieurs fois la même opération (boucle)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n════ TEST CAS A : même requête, appels répétés (boucle) ════\n')

await simulateRequest('GET /api/stock/catalogue', async (reqId) => {
  // Simule un bug : findMany appelé 4 fois dans la même requête
  for (let i = 0; i < 4; i++) {
    serverLogger.metrics.record('ProduitCatalogue.findMany', true, 20 + i, {
      requestId: reqId, route: 'GET /api/stock/catalogue',
      section: 'Chargement catalogue', step: `itération ${i+1}`,
      timestamp: Date.now(), durationMs: 20 + i, ok: true,
    })
    await fakeDb(20, 150)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Déclenchement des alertes RBAC (4 req × 3 opérations RBAC = 12 enregistrements)
// Les 4 premières requêtes ont déjà inséré 4 × 3 opérations RBAC.
// On vérifie que les alertes de répétition montrent 4 requestIds distincts.
// ─────────────────────────────────────────────────────────────────────────────

await new Promise(r => setTimeout(r, 500))

serverLogger.printSummary()
await new Promise(r => setTimeout(r, 400))

const sessionDir = serverLogger.session.sessionDir
console.log(`\n✓ Session : ${sessionDir}`)
console.log('  → session.log')
console.log('  → errors.log')
console.log('  → metrics.json')
