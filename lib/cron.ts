import cron from 'node-cron'

let initialized = false

export function initCronJobs(): void {
  if (initialized) {
    console.warn('[Cron] Jobs déjà initialisés, ignoré')
    return
  }
  initialized = true

  // Snapshot mensuel stock (1er de chaque mois à 02:00)
  cron.schedule('0 2 1 * *', async () => {
    try {
      console.log('[Cron] Démarrage snapshot mensuel stock', new Date().toISOString())
      const { generateStockSnapshot } = await import('@/services/stock.service')
      await generateStockSnapshot()
      console.log('[Cron] Snapshot stock terminé', new Date().toISOString())
    } catch (err) {
      console.error('[Cron] Échec snapshot stock:', new Date().toISOString(), err)
    }
  })

  // Rappels paiements abonnements (tous les lundis à 08:00)
  cron.schedule('0 8 * * 1', async () => {
    try {
      console.log('[Cron] Démarrage rappels paiements abonnements', new Date().toISOString())
      const { sendAbonnementReminders } = await import('@/services/finance.service')
      await sendAbonnementReminders()
      console.log('[Cron] Rappels abonnements terminés', new Date().toISOString())
    } catch (err) {
      console.error('[Cron] Échec rappels abonnements:', new Date().toISOString(), err)
    }
  })

  console.log('[Cron] Jobs initialisés')
}
