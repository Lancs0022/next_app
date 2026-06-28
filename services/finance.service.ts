import { prisma } from '@/lib/db'
import { httpError } from '@/lib/errors'

export { httpError }

export async function listTransactions(tenantId: number) {
  const rows = await prisma.transactionFinanciere.findMany({
    where: { tenant_id: tenantId },
    orderBy: { id_transaction_financiere: 'desc' },
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
  const { tenant_id, id_utilisateur } = user
  if (!tenant_id) throw httpError(401, 'Tenant manquant')
  if (!id_utilisateur) throw httpError(401, 'Utilisateur non authentifié')

  const type = String(body?.type || '').trim().toUpperCase()
  if (!['IN', 'OUT'].includes(type)) throw httpError(400, 'type doit être IN ou OUT')

  const montant = Number(body?.montant)
  if (!montant || montant <= 0) throw httpError(400, 'montant doit être > 0')

  const id_categorie_financiere = Number(body?.id_categorie_financiere ?? 0)
  if (!id_categorie_financiere) throw httpError(400, "'id_categorie_financiere' est requis")

  const source_module = String(body?.source_module || 'MANUEL').trim()

  return prisma.transactionFinanciere.create({
    data: {
      tenant_id,
      type,
      montant,
      description: body?.description ? String(body.description) : null,
      id_categorie_financiere,
      source_module,
      source_id: body?.source_id ? Number(body.source_id) : null,
      created_by: id_utilisateur,
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
