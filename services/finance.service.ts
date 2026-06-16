import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listTransactions(tenantId: number) {
  const rows = await prisma.transactionFinanciere.findMany({
    where: { tenant_id: tenantId },
    orderBy: { id_transaction: 'desc' },
  })
  return { data: rows }
}

export async function createTransaction({
  body,
  user,
}: {
  body: Record<string, unknown>
  user: { id_utilisateur: number; tenant_id: number }
}) {
  const { tenant_id } = user
  if (!tenant_id) throw httpError(401, 'Tenant manquant')

  const type = String(body?.type || '').trim().toUpperCase()
  if (!['IN', 'OUT'].includes(type)) throw httpError(400, 'type doit être IN ou OUT')

  const montant = Number(body?.montant)
  if (!montant || montant <= 0) throw httpError(400, 'montant doit être > 0')

  return prisma.transactionFinanciere.create({
    data: {
      tenant_id,
      type,
      montant,
      description: body?.description ? String(body.description) : null,
    },
  })
}

export async function sendAbonnementReminders() {
  const abonnements = await prisma.abonnement.findMany({
    where: { actif: true },
    include: { paiements: true },
  })
  console.log(`[Cron] ${abonnements.length} abonnement(s) actif(s) vérifiés pour rappels`)
}
