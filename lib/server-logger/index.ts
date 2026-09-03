/**
 * Logger serveur PEJAA — point d'entrée public.
 *
 * MODULE SERVEUR UNIQUEMENT — ne jamais importer depuis un composant React.
 *
 * ─── Usage typique dans une route API ou un service ───────────────────────────
 *
 *   import { serverLogger } from '@/lib/server-logger'
 *
 *   // Logger scopé à une requête :
 *   const logger = serverLogger.forRequest()   // ou forRequest(requestId)
 *   logger.section("Préparation pour l'annulation de vente")
 *   logger.step("Récupération des ventes")
 *
 *   const op = logger.operation('Récupération des ventes', { dbOperation: 'vente.findMany' })
 *   try {
 *     const rows = await prisma.vente.findMany(...)
 *     op.success({ count: rows.length })
 *   } catch (err) {
 *     op.failure(err)
 *   }
 *
 * ─── Logger global (services, crons, initialisation) ─────────────────────────
 *
 *   import { slog } from '@/lib/server-logger'
 *
 *   slog.section('Démarrage du cron')
 *   slog.info('Traitement en cours...')
 *
 * ─── Interception Prisma automatique ─────────────────────────────────────────
 *
 *   Branchée dans lib/db.ts via $extends.
 *   Chaque opération Prisma est automatiquement mesurée et loggée
 *   (lenteur, volume, erreur) sans modifier le code métier.
 */

export { serverLogger, PejaServerLogger, RequestLogger } from './logger'
export type { ServerLoggerConfig, LogSession, OperationHandle, CallStats } from './types'

import { serverLogger } from './logger'

/** Alias court — logger global sans request ID. */
export const slog = serverLogger.global
